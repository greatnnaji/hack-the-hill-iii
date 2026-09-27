import { and, count, eq, sql } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, campaignSupporters, users, type CampaignRow } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { getDraft } from "@/lib/drafts";
import { handleRouteError, jsonError } from "@/lib/http";
import { normalizePostal } from "@/lib/mp/postal";
import { lookupMpByPostal } from "@/lib/mp/represent";
import { getStory } from "@/lib/stories";

// Campaigns (TASKS.md Great Task 3): start one from a draft, join someone else's. Joining is support, not a
// signature; the official e-petition is opened later by the team on ourcommons.ca.

const DAY_MS = 24 * 60 * 60 * 1000;
// Postgres rejects malformed UUIDs with an error, so treat them as "not found" up front.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const postal = z.string().refine((value) => normalizePostal(value) !== null, "invalid_postal");

export const startCampaignSchema = z.object({
  draftId: z.string().min(1),
  // Same window as an e-petition: 30 to 120 days to gather support.
  days: z.number().int().min(30).max(120).default(120),
  postal: postal.optional(),
  shareWithMp: z.boolean(),
});

export const joinCampaignSchema = z.object({
  postal: postal.optional(),
  shareWithMp: z.boolean(),
});

export type StartCampaignInput = z.infer<typeof startCampaignSchema>;
export type JoinCampaignInput = z.infer<typeof joinCampaignSchema>;

// The campaign shape from the shared contract in TASKS.md, plus the text the admin page and detail page show.
export type Campaign = {
  id: string;
  story_id: string;
  title: string;
  issue: string;
  request: string;
  starter: string;
  supporters: number;
  target: number;
  deadline: string;
  status: CampaignRow["status"];
  joined: boolean;
  // Filled from Raphael's /api/petitions once the e-petition is live on ourcommons.ca.
  petition: null;
};

export class CampaignError extends Error {
  constructor(readonly code: "not_found" | "closed" | "email_required") {
    super(code);
    this.name = "CampaignError";
  }
}

const ERROR_STATUS = { not_found: 404, closed: 409, email_required: 400 } as const;

// Turns a CampaignError into its JSON error response; anything else goes to the shared handler (401 / 500).
export function campaignRouteError(error: unknown): NextResponse {
  if (error instanceof CampaignError) return jsonError(error.code, ERROR_STATUS[error.code]);
  return handleRouteError(error);
}

/**
 * Purpose:
 *	Look up the riding for a postal code, so an MP can see how many supporters live in theirs.
 *
 * Args:
 *	- code: a postal code the schema already checked, or undefined when the user skipped it
 *
 * Returns:
 *	Promise<string | null>: the riding name, or null when skipped, unknown or the lookup is down (joining never waits on it)
 */
async function ridingFor(code: string | undefined): Promise<string | null> {
  const normalized = code ? normalizePostal(code) : null;
  if (!normalized) return null;
  try {
    return (await lookupMpByPostal(normalized))?.riding ?? null;
  } catch {
    return null;
  }
}

// First name only, since every logged-in user sees it. Auth0 often sets name to the email, which must never show.
function firstName(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && !first.includes("@") ? first : "A supporter";
}

/**
 * Purpose:
 *	Read one campaign in the shared shape, with its live supporter count and whether this user has joined.
 *
 * Args:
 *	- id: the campaign id
 *	- userId: the logged-in user, for `joined`
 *
 * Returns:
 *	Promise<Campaign | null>: the campaign, or null when no campaign has that id
 */
export async function getCampaign(id: string, userId: string): Promise<Campaign | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({
      campaign: campaigns,
      starterName: users.name,
      supporters: sql<number>`(select count(*)::int from ${campaignSupporters} where ${campaignSupporters.campaignId} = ${campaigns.id})`,
      joined: sql<boolean>`exists(select 1 from ${campaignSupporters} where ${campaignSupporters.campaignId} = ${campaigns.id} and ${campaignSupporters.userId} = ${userId})`,
    })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.startedBy))
    .where(eq(campaigns.id, id));
  if (!row) return null;
  const { campaign } = row;
  return {
    id: campaign.id,
    story_id: campaign.storyId,
    title: campaign.title,
    issue: campaign.issue,
    request: campaign.request,
    starter: firstName(row.starterName),
    supporters: row.supporters,
    target: campaign.target,
    deadline: campaign.deadline,
    status: campaign.status,
    joined: row.joined,
    petition: null,
  };
}

/**
 * Purpose:
 *	Publish the user's draft as a campaign on its story, with the user as its first member.
 *	One campaign per person per story: if they already started one there, return it unchanged.
 *
 * Args:
 *	- user: the logged-in user (must have an email, which the team needs to reach supporters)
 *	- input: draft id, days until the deadline (30-120), optional postal code for the riding, share consent
 *
 * Returns:
 *	Promise<{ campaign: Campaign; created: boolean }>: created is false when their existing campaign came back
 *
 * Raises:
 *	CampaignError("not_found") when the draft isn't theirs or its story is gone; "email_required" without an email
 */
export async function startCampaign(user: CurrentUser, input: StartCampaignInput): Promise<{ campaign: Campaign; created: boolean }> {
  const draft = await getDraft(user.id, input.draftId);
  if (!draft || !(await getStory(draft.storyId))) throw new CampaignError("not_found");
  if (!user.email) throw new CampaignError("email_required");

  const existing = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.storyId, draft.storyId), eq(campaigns.startedBy, user.id)));
  if (existing.length) return { campaign: (await getCampaign(existing[0].id, user.id))!, created: false };

  const riding = await ridingFor(input.postal);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(campaigns)
      .values({
        storyId: draft.storyId,
        startedBy: user.id,
        title: draft.title,
        issue: draft.issue,
        request: draft.request,
        deadline: new Date(Date.now() + input.days * DAY_MS).toISOString().slice(0, 10),
      })
      // A double tap can race past the check above; the unique (story_id, started_by) keeps it to one.
      .onConflictDoNothing()
      .returning({ id: campaigns.id });
    if (!row) return null;
    await tx.insert(campaignSupporters).values({
      campaignId: row.id,
      userId: user.id,
      name: user.name ?? user.email!,
      email: user.email!,
      riding,
      shareWithMp: input.shareWithMp,
    });
    return row.id;
  });
  if (!id) return startCampaign(user, input);
  return { campaign: (await getCampaign(id, user.id))!, created: true };
}

/**
 * Purpose:
 *	Add the user as a supporter of a campaign. Joining twice changes nothing. When the count reaches the
 *	target, a gathering campaign moves to review so the team can take it to an MP.
 *
 * Args:
 *	- user: the logged-in user (must have an email)
 *	- id: the campaign id
 *	- input: optional postal code for the riding, share consent
 *
 * Returns:
 *	Promise<Campaign>: the campaign after joining, with joined: true
 *
 * Raises:
 *	CampaignError("not_found") for an unknown id, "closed" for a closed campaign, "email_required" without an email
 */
export async function joinCampaign(user: CurrentUser, id: string, input: JoinCampaignInput): Promise<Campaign> {
  const before = await getCampaign(id, user.id);
  if (!before) throw new CampaignError("not_found");
  if (before.joined) return before;
  if (before.status === "closed") throw new CampaignError("closed");
  if (!user.email) throw new CampaignError("email_required");

  const riding = await ridingFor(input.postal);
  await db.transaction(async (tx) => {
    await tx
      .insert(campaignSupporters)
      .values({ campaignId: id, userId: user.id, name: user.name ?? user.email!, email: user.email!, riding, shareWithMp: input.shareWithMp })
      .onConflictDoNothing();
    const [{ n }] = await tx.select({ n: count() }).from(campaignSupporters).where(eq(campaignSupporters.campaignId, id));
    if (n >= before.target) {
      await tx
        .update(campaigns)
        .set({ status: "review", updatedAt: sql`now()` })
        .where(and(eq(campaigns.id, id), eq(campaigns.status, "gathering")));
    }
  });
  return (await getCampaign(id, user.id))!;
}

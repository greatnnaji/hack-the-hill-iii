import { and, count, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, campaignSupporters, users, type CampaignRow } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { LIMITS } from "@/lib/petition";
import { normalizePostal } from "@/lib/mp/postal";
import { lookupMpByPostal } from "@/lib/mp/represent";
import { getStory, type Story } from "@/lib/stories";

// Campaigns (TASKS.md Great Task 3). A campaign starts as a draft only its starter can see and edit (screen 05),
// is published to its story (screen 06, starter becomes the first member), then others join. Joining is support,
// not a signature; the official e-petition is opened later by the team on ourcommons.ca.

const DAY_MS = 24 * 60 * 60 * 1000;
// Postgres rejects malformed UUIDs with an error, so treat them as "not found" up front.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const postal = z.string().refine((value) => normalizePostal(value) !== null, "invalid_postal");

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const createCampaignSchema = z.object({
  storyId: z.string().min(1).max(200),
  title: requiredText(LIMITS.title),
  issue: requiredText(LIMITS.issue),
  request: requiredText(LIMITS.request),
});

export const updateCampaignSchema = createCampaignSchema.omit({ storyId: true }).partial();

export const publishCampaignSchema = z.object({
  // Same window as an e-petition: 30 to 120 days to gather support.
  days: z.number().int().min(30).max(120).default(120),
  postal: postal.optional(),
  shareWithMp: z.boolean(),
});

export const joinCampaignSchema = z.object({
  postal: postal.optional(),
  shareWithMp: z.boolean(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type PublishCampaignInput = z.infer<typeof publishCampaignSchema>;
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
  // null while a draft.
  deadline: string | null;
  status: CampaignRow["status"];
  joined: boolean;
  // The logged-in user started it: "Your campaign" instead of "Start a campaign", and only they see it as a draft.
  mine: boolean;
  // Filled from Raphael's /api/petitions once the e-petition is live on ourcommons.ca.
  petition: null;
};

export type StoryWithCampaigns = Story & { campaigns: Campaign[] };

export class CampaignError extends Error {
  constructor(readonly code: "not_found" | "closed" | "published" | "email_required") {
    super(code);
    this.name = "CampaignError";
  }
}

const ERROR_STATUS = { not_found: 404, closed: 409, published: 409, email_required: 400 } as const;

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

// Drafts are private: only their starter gets them back. Combine with each query's own filter (one .where per query).
function visibleTo(userId: string | null) {
  return userId ? or(ne(campaigns.status, "draft"), eq(campaigns.startedBy, userId)) : ne(campaigns.status, "draft");
}

// Shared by getCampaign and listCampaigns: each campaign with its starter's name, live count and `joined`.
function selectCampaigns(userId: string | null) {
  return db
    .select({
      campaign: campaigns,
      starterName: users.name,
      supporters: sql<number>`(select count(*)::int from ${campaignSupporters} where ${campaignSupporters.campaignId} = ${campaigns.id})`,
      joined: userId
        ? sql<boolean>`exists(select 1 from ${campaignSupporters} where ${campaignSupporters.campaignId} = ${campaigns.id} and ${campaignSupporters.userId} = ${userId})`
        : sql<boolean>`false`,
    })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.startedBy))
    .$dynamic();
}

type SelectedCampaign = Awaited<ReturnType<typeof selectCampaigns>>[number];

function toCampaign({ campaign, starterName, supporters, joined }: SelectedCampaign, userId: string | null): Campaign {
  return {
    id: campaign.id,
    story_id: campaign.storyId,
    title: campaign.title,
    issue: campaign.issue,
    request: campaign.request,
    starter: firstName(starterName),
    supporters,
    target: campaign.target,
    deadline: campaign.deadline,
    status: campaign.status,
    joined,
    mine: campaign.startedBy === userId,
    petition: null,
  };
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
export async function getCampaign(id: string, userId: string | null): Promise<Campaign | null> {
  if (!UUID.test(id)) return null;
  const [row] = await selectCampaigns(userId).where(and(visibleTo(userId), eq(campaigns.id, id)));
  return row ? toCampaign(row, userId) : null;
}

// Official (live on ourcommons.ca) first, closed last, everything else in between.
// The starter's own draft (only they see it) sorts with the active ones; with 0 supporters it lands at their end.
const STATUS_RANK: Record<Campaign["status"], number> = { official: 0, draft: 1, gathering: 1, review: 1, sponsor_asked: 1, closed: 2 };

/**
 * Purpose:
 *	List the campaigns on some stories, in the order the detail page shows them:
 *	official first, then most supporters, closed last (oldest first on a tie).
 *
 * Args:
 *	- storyIds: the stories to look up
 *	- userId: the logged-in user for `joined`, or null (then joined is always false)
 *
 * Returns:
 *	Promise<Map<string, Campaign[]>>: story id → its campaigns; stories without any are missing from the map
 */
export async function listCampaigns(storyIds: string[], userId: string | null): Promise<Map<string, Campaign[]>> {
  const byStory = new Map<string, Campaign[]>();
  if (!storyIds.length) return byStory;
  const rows = await selectCampaigns(userId).where(and(visibleTo(userId), inArray(campaigns.storyId, storyIds))).orderBy(campaigns.createdAt);
  const sorted = rows
    .map((row) => toCampaign(row, userId))
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.supporters - a.supporters);
  for (const campaign of sorted) byStory.set(campaign.story_id, [...(byStory.get(campaign.story_id) ?? []), campaign]);
  return byStory;
}

/**
 * Purpose:
 *	Attach each story's `campaigns` list (shared contract in TASKS.md) for /api/spending and /api/spending/:id.
 *
 * Args:
 *	- stories: stories from src/lib/stories.ts
 *	- userId: the logged-in user for `joined`, or null
 *
 * Returns:
 *	Promise<StoryWithCampaigns[]>: the same stories in the same order; `campaigns: []` means the empty state
 */
export async function withCampaigns(stories: Story[], userId: string | null): Promise<StoryWithCampaigns[]> {
  const byStory = await listCampaigns(stories.map((story) => story.id), userId);
  return stories.map((story) => ({ ...story, campaigns: byStory.get(story.id) ?? [] }));
}

/**
 * Purpose:
 *	Save a new campaign as a draft on a story (screen 05). Only the starter can see it until it's published.
 *	One campaign per person per story: if they already have one there (draft or live), return it unchanged.
 *
 * Args:
 *	- user: the logged-in user
 *	- input: story id, title, issue ("Whereas ...") and requested action
 *
 * Returns:
 *	Promise<{ campaign: Campaign; created: boolean }>: created is false when their existing campaign came back
 *
 * Raises:
 *	CampaignError("not_found") when the story doesn't exist
 */
export async function createCampaign(user: CurrentUser, input: CreateCampaignInput): Promise<{ campaign: Campaign; created: boolean }> {
  if (!(await getStory(input.storyId))) throw new CampaignError("not_found");
  const [row] = await db
    .insert(campaigns)
    .values({ storyId: input.storyId, startedBy: user.id, title: input.title, issue: input.issue, request: input.request })
    // The unique (story_id, started_by) keeps it to one per person, even on a double tap.
    .onConflictDoNothing()
    .returning({ id: campaigns.id });
  if (row) return { campaign: (await getCampaign(row.id, user.id))!, created: true };

  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.storyId, input.storyId), eq(campaigns.startedBy, user.id)));
  return { campaign: (await getCampaign(existing.id, user.id))!, created: false };
}

/**
 * Purpose:
 *	Edit the text of the user's own draft. Once published, the text is fixed (people joined what it said).
 *
 * Args:
 *	- user: the logged-in user
 *	- id: the campaign id
 *	- patch: any of title, issue, request
 *
 * Returns:
 *	Promise<Campaign>: the updated draft
 *
 * Raises:
 *	CampaignError("not_found") when it isn't theirs; "published" once it's live
 */
export async function updateCampaign(user: CurrentUser, id: string, patch: UpdateCampaignInput): Promise<Campaign> {
  const campaign = await getCampaign(id, user.id);
  if (!campaign?.mine) throw new CampaignError("not_found");
  if (campaign.status !== "draft") throw new CampaignError("published");
  await db
    .update(campaigns)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, "draft")));
  return (await getCampaign(id, user.id))!;
}

/**
 * Purpose:
 *	Publish the user's draft to its story (screen 06, "Publish to the app"): it goes live for others to join,
 *	the deadline is set, and the starter becomes its first member. Publishing twice changes nothing.
 *
 * Args:
 *	- user: the logged-in user (must have an email, which the team needs to reach supporters)
 *	- id: the campaign id
 *	- input: days until the deadline (30-120), optional postal code for the riding, share consent
 *
 * Returns:
 *	Promise<Campaign>: the live campaign
 *
 * Raises:
 *	CampaignError("not_found") when it isn't theirs; "email_required" without an email
 */
export async function publishCampaign(user: CurrentUser, id: string, input: PublishCampaignInput): Promise<Campaign> {
  const campaign = await getCampaign(id, user.id);
  if (!campaign?.mine) throw new CampaignError("not_found");
  if (campaign.status !== "draft") return campaign;
  if (!user.email) throw new CampaignError("email_required");

  const riding = await ridingFor(input.postal);
  await db.transaction(async (tx) => {
    const [published] = await tx
      .update(campaigns)
      .set({
        status: "gathering",
        deadline: new Date(Date.now() + input.days * DAY_MS).toISOString().slice(0, 10),
        updatedAt: sql`now()`,
      })
      // Only the first of two racing publishes gets the row, so the starter is added once.
      .where(and(eq(campaigns.id, id), eq(campaigns.status, "draft")))
      .returning({ id: campaigns.id });
    if (!published) return;
    await tx.insert(campaignSupporters).values({
      campaignId: id,
      userId: user.id,
      name: user.name ?? user.email!,
      email: user.email!,
      riding,
      shareWithMp: input.shareWithMp,
    });
  });
  return (await getCampaign(id, user.id))!;
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
 *	CampaignError("not_found") for an unknown id or a draft, "closed" for a closed campaign, "email_required" without an email
 */
export async function joinCampaign(user: CurrentUser, id: string, input: JoinCampaignInput): Promise<Campaign> {
  const before = await getCampaign(id, user.id);
  // A draft can't be joined, even by its starter (publishing adds them).
  if (!before || before.status === "draft") throw new CampaignError("not_found");
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

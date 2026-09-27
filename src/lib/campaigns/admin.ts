import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns, petitions, users } from "@/db/schema";
import { normalizePetitionNumber, PetitionFetchError } from "@/lib/petitions/ourcommons";
import { syncPetition } from "@/lib/petitions/petitions";
import type { CampaignStage } from "./campaigns";
import { CampaignError } from "./errors";

// Our team's side: the /admin campaign list, moving campaigns through the stages, and attaching official petitions.

export type AdminCampaignRow = {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  starterName: string | null;
  starterEmail: string | null;
  memberCount: number;
  ridingCount: number;
  stage: CampaignStage;
  teamNote: string | null;
  petitionNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignMemberExport = {
  name: string | null;
  email: string | null;
  riding: string | null;
  isStarter: boolean;
  joinedAt: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BEFORE_AGREED: CampaignStage[] = ["gathering", "in_review", "mp_asked"];

/**
 * Purpose:
 *	List every campaign for /admin, closed ones included, with the starter's contact details.
 *
 * Args:
 *	- options.stage: only this stage
 *	- options.sort: "members" (default) or "updated" (most recently changed first)
 *
 * Returns:
 *	Promise<AdminCampaignRow[]>
 */
export async function listAdminCampaigns(options: { stage?: CampaignStage; sort?: "members" | "updated" } = {}): Promise<AdminCampaignRow[]> {
  const members = sql<number>`count(${campaignMembers.userId})::int`;
  const rows = await db
    .select({
      campaign: campaigns,
      starterName: users.name,
      starterEmail: users.email,
      memberCount: members,
      ridingCount: sql<number>`count(distinct ${campaignMembers.riding})::int`,
      petitionNumber: petitions.number,
    })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.starterId))
    .leftJoin(campaignMembers, eq(campaignMembers.campaignId, campaigns.id))
    .leftJoin(petitions, eq(petitions.campaignId, campaigns.id))
    .where(options.stage ? eq(campaigns.stage, options.stage) : undefined)
    .groupBy(campaigns.id, users.id, petitions.number)
    .orderBy(...(options.sort === "updated" ? [desc(campaigns.updatedAt)] : [desc(members), asc(campaigns.createdAt)]));

  return rows.map(({ campaign: c, ...row }) => ({
    id: c.id,
    title: c.title,
    storyId: c.storyId,
    storyTitle: c.storyTitle,
    starterName: row.starterName,
    starterEmail: row.starterEmail,
    memberCount: row.memberCount,
    ridingCount: row.ridingCount,
    stage: c.stage,
    teamNote: c.teamNote,
    petitionNumber: row.petitionNumber,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

/**
 * Purpose:
 *	Move a campaign to another stage and/or set the note members see (e.g. why it was closed).
 *
 * Args:
 *	- id: the campaign id
 *	- change.stage: the new stage
 *	- change.teamNote: the note, or null to remove it
 *
 * Returns:
 *	Promise<void>; throws CampaignError not_found (404), or needs_petition (409) when setting "live" with no petition attached
 */
export async function updateCampaignByAdmin(id: string, change: { stage?: CampaignStage; teamNote?: string | null }): Promise<void> {
  if (!UUID.test(id)) throw new CampaignError("not_found", 404);
  if (change.stage === "live") {
    const [petition] = await db.select({ number: petitions.number }).from(petitions).where(eq(petitions.campaignId, id));
    if (!petition) throw new CampaignError("needs_petition", 409);
  }
  const [updated] = await db
    .update(campaigns)
    .set({
      ...(change.stage ? { stage: change.stage } : {}),
      ...(change.teamNote !== undefined ? { teamNote: change.teamNote?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id });
  if (!updated) throw new CampaignError("not_found", 404);
}

/**
 * Purpose:
 *	List a campaign's members for the sponsor email: name, email and riding. Every member ticked the consent box to share these.
 *
 * Args:
 *	- id: the campaign id
 *
 * Returns:
 *	Promise<CampaignMemberExport[]>: starter first, then in joining order; throws CampaignError not_found (404)
 */
export async function listCampaignMembers(id: string): Promise<CampaignMemberExport[]> {
  if (!UUID.test(id)) throw new CampaignError("not_found", 404);
  const [campaign] = await db.select({ starterId: campaigns.starterId }).from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) throw new CampaignError("not_found", 404);

  const rows = await db
    .select({ userId: campaignMembers.userId, name: users.name, email: users.email, riding: campaignMembers.riding, joinedAt: campaignMembers.joinedAt })
    .from(campaignMembers)
    .innerJoin(users, eq(users.id, campaignMembers.userId))
    .where(eq(campaignMembers.campaignId, id))
    .orderBy(asc(campaignMembers.joinedAt));

  return rows
    .map((row) => ({ name: row.name, email: row.email, riding: row.riding, isStarter: row.userId === campaign.starterId, joinedAt: row.joinedAt.toISOString() }))
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter));
}

/**
 * Purpose:
 *	Attach the official e-petition our team created on ourcommons.ca, then fetch its details straight away.
 *	The campaign moves to "MP agreed", and to "live" as soon as ourcommons.ca shows it open for signature.
 *
 * Args:
 *	- id: the campaign id
 *	- input.number: the petition number, e.g. "e-7203"
 *	- input.title: the petition's title to show on the card
 *
 * Returns:
 *	Promise<object>: number and sync ("synced", "not_found" if not on ourcommons.ca yet, or "failed" if the site was unreachable);
 *	throws CampaignError not_found (404), invalid_petition_number (400) or petition_taken (409)
 */
export async function attachPetition(id: string, input: { number: string; title: string }) {
  const number = normalizePetitionNumber(input.number);
  if (!number) throw new CampaignError("invalid_petition_number", 400);
  if (!UUID.test(id)) throw new CampaignError("not_found", 404);
  const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) throw new CampaignError("not_found", 404);

  const [taken] = await db
    .select({ campaignId: petitions.campaignId })
    .from(petitions)
    .where(and(eq(petitions.number, number), ne(petitions.campaignId, id)));
  if (taken) throw new CampaignError("petition_taken", 409);

  await db.transaction(async (tx) => {
    // One petition per campaign: replacing the number replaces the row.
    await tx.delete(petitions).where(eq(petitions.campaignId, id));
    await tx.insert(petitions).values({ number, campaignId: id, title: input.title.trim() });
    await tx
      .update(campaigns)
      .set({ stage: "mp_agreed", updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), inArray(campaigns.stage, BEFORE_AGREED)));
  });

  let sync: "synced" | "not_found" | "failed";
  try {
    sync = await syncPetition(number);
  } catch (error) {
    if (!(error instanceof PetitionFetchError)) throw error;
    sync = "failed";
  }
  return { number, sync };
}

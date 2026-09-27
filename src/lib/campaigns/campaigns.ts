import { and, asc, desc, eq, exists, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns, CAMPAIGN_STAGES, petitions, users, type CampaignRow } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { toPetitionCard, type PetitionCard } from "@/lib/petitions/petitions";
import { getStory } from "@/lib/stories";
import { ensureUser } from "@/lib/users";
import { CampaignError } from "./errors";
import { checkCampaignText, PETITION_OPENING, type CreateCampaignInput, type UpdateCampaignInput } from "./rules";

export type CampaignStage = (typeof CAMPAIGN_STAGES)[number];

export type CampaignSummary = {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  starterFirstName: string;
  memberCount: number;
  stage: CampaignStage;
  createdAt: string;
  updatedAt: string;
  // For the logged-in viewer; false when nobody is logged in.
  joined: boolean;
  isStarter: boolean;
  petition: PetitionCard | null;
};

export type CampaignDetail = CampaignSummary & {
  issue: string;
  opening: string;
  request: string;
  teamNote: string | null;
  ridingCount: number;
  canEdit: boolean;
  canJoin: boolean;
  canLeave: boolean;
};

export type ListCampaignsOptions = {
  storyId?: string;
  stage?: CampaignStage;
  mineFor?: string;
  sort?: "members" | "newest";
  viewerId?: string | null;
};

// People can join from "Gathering members" up to "MP agreed"; once live they sign on ourcommons.ca instead.
const JOINABLE: CampaignStage[] = ["gathering", "in_review", "mp_asked", "mp_agreed"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Purpose:
 *	Show only a person's first name publicly, never their email.
 *
 * Args:
 *	- name: the account's display name (Auth0 sometimes sets it to the email)
 *
 * Returns:
 *	string: the first word of the name, or "Someone"
 */
export function firstName(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && !first.includes("@") ? first : "Someone";
}

/**
 * Purpose:
 *	Build the shared campaign query: one row per campaign with its starter, member counts, viewer flags and petition.
 *
 * Args:
 *	- viewerId: the logged-in user's id, or null
 *
 * Returns:
 *	a Drizzle select that callers finish with where(), orderBy() and limit()
 */
function campaignQuery(viewerId: string | null) {
  const memberCount = sql<number>`count(${campaignMembers.userId})::int`;
  return db
    .select({
      campaign: campaigns,
      starterName: users.name,
      memberCount,
      ridingCount: sql<number>`count(distinct ${campaignMembers.riding})::int`,
      joined: viewerId ? sql<boolean>`coalesce(bool_or(${campaignMembers.userId} = ${viewerId}), false)` : sql<boolean>`false`,
      petition: petitions,
    })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.starterId))
    .leftJoin(campaignMembers, eq(campaignMembers.campaignId, campaigns.id))
    .leftJoin(petitions, eq(petitions.campaignId, campaigns.id))
    .groupBy(campaigns.id, users.id, petitions.number)
    .$dynamic();
}

type CampaignQueryRow = Awaited<ReturnType<ReturnType<typeof campaignQuery>["execute"]>>[number];

/**
 * Purpose:
 *	Shape a query row into the summary the lists show.
 *
 * Args:
 *	- row: one row from campaignQuery()
 *	- viewerId: the logged-in user's id, or null
 *
 * Returns:
 *	CampaignSummary
 */
function toSummary(row: CampaignQueryRow, viewerId: string | null): CampaignSummary {
  const c = row.campaign;
  return {
    id: c.id,
    title: c.title,
    storyId: c.storyId,
    storyTitle: c.storyTitle,
    starterFirstName: firstName(row.starterName),
    memberCount: row.memberCount,
    stage: c.stage,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    joined: row.joined,
    isStarter: viewerId !== null && c.starterId === viewerId,
    petition: row.petition ? toPetitionCard(row.petition, c) : null,
  };
}

/**
 * Purpose:
 *	List campaigns for the story page, the Campaigns page (All / Mine) and filters.
 *
 * Args:
 *	- options.storyId: only this story's campaigns (closed ones included, at the bottom)
 *	- options.stage: only this stage (the only way closed campaigns show outside a story)
 *	- options.mineFor: only campaigns this user started or joined
 *	- options.sort: "members" (default) or "newest"; ignored on a story, which puts live first and closed last
 *	- options.viewerId: the logged-in user, for the "Joined" tags
 *
 * Returns:
 *	Promise<CampaignSummary[]>
 */
export async function listCampaigns(options: ListCampaignsOptions = {}): Promise<CampaignSummary[]> {
  const viewerId = options.viewerId ?? null;
  const conditions: SQL[] = [];
  if (options.storyId) conditions.push(eq(campaigns.storyId, options.storyId));
  if (options.stage) conditions.push(eq(campaigns.stage, options.stage));
  else if (!options.storyId) conditions.push(ne(campaigns.stage, "closed"));
  if (options.mineFor) {
    const mine = db
      .select({ one: sql`1` })
      .from(campaignMembers)
      .where(and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, options.mineFor)));
    conditions.push(exists(mine));
  }

  const members = sql`count(${campaignMembers.userId})`;
  const order = options.storyId
    ? [asc(sql`case ${campaigns.stage} when 'live' then 0 when 'closed' then 2 else 1 end`), desc(members), desc(campaigns.createdAt)]
    : options.sort === "newest"
      ? [desc(campaigns.createdAt)]
      : [desc(members), desc(campaigns.createdAt)];

  const rows = await campaignQuery(viewerId).where(and(...conditions)).orderBy(...order);
  return rows.map((row) => toSummary(row, viewerId));
}

/**
 * Purpose:
 *	Get one campaign for its page, with what the viewer is allowed to do.
 *
 * Args:
 *	- id: the campaign id
 *	- viewerId: the logged-in user's id, or null
 *
 * Returns:
 *	Promise<CampaignDetail | null>: null for an unknown or malformed id
 */
export async function getCampaign(id: string, viewerId: string | null = null): Promise<CampaignDetail | null> {
  if (!UUID.test(id)) return null;
  const [row] = await campaignQuery(viewerId).where(eq(campaigns.id, id));
  if (!row) return null;

  const summary = toSummary(row, viewerId);
  const c = row.campaign;
  return {
    ...summary,
    issue: c.issue,
    opening: PETITION_OPENING,
    request: c.request,
    teamNote: c.teamNote,
    ridingCount: row.ridingCount,
    canEdit: summary.isStarter && summary.memberCount <= 1 && c.stage === "gathering",
    canJoin: viewerId !== null && !summary.joined && JOINABLE.includes(c.stage),
    canLeave: summary.joined && !summary.isStarter,
  };
}

/**
 * Purpose:
 *	Start a campaign on a story, with the starter as its first member. One campaign per person per story.
 *
 * Args:
 *	- user: the logged-in starter
 *	- input: storyId, title, issue, request (already checked against the petition rules)
 *	- riding: the starter's riding, from ridingForJoin()
 *
 * Returns:
 *	Promise<string>: the new campaign's id; throws CampaignError story_not_found (404) or already_started (409, with campaignId)
 */
export async function createCampaign(user: CurrentUser, input: CreateCampaignInput, riding: string): Promise<string> {
  const story = await getStory(input.storyId);
  if (!story) throw new CampaignError("story_not_found", 404);
  await ensureUser(user);

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(campaigns)
      .values({
        storyId: story.id,
        storyTitle: story.title,
        starterId: user.id,
        title: input.title.trim(),
        issue: input.issue.trim(),
        request: input.request.trim(),
      })
      .onConflictDoNothing()
      .returning({ id: campaigns.id });
    if (!created) return null;
    await tx.insert(campaignMembers).values({ campaignId: created.id, userId: user.id, riding });
    return created.id;
  });
  if (id) return id;

  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.storyId, story.id), eq(campaigns.starterId, user.id)));
  throw new CampaignError("already_started", 409, { campaignId: existing?.id });
}

/**
 * Purpose:
 *	Load a campaign row and its member count, or fail with 404.
 *
 * Args:
 *	- id: the campaign id
 *
 * Returns:
 *	Promise<{ campaign: CampaignRow; memberCount: number }>; throws CampaignError not_found (404)
 */
async function loadCampaign(id: string): Promise<{ campaign: CampaignRow; memberCount: number }> {
  if (!UUID.test(id)) throw new CampaignError("not_found", 404);
  const [row] = await db
    .select({ campaign: campaigns, memberCount: sql<number>`count(${campaignMembers.userId})::int` })
    .from(campaigns)
    .leftJoin(campaignMembers, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaigns.id, id))
    .groupBy(campaigns.id);
  if (!row) throw new CampaignError("not_found", 404);
  return row;
}

/**
 * Purpose:
 *	Let the starter edit the text until someone else joins, so members never back text that changed under them.
 *
 * Args:
 *	- userId: the logged-in user's id
 *	- id: the campaign id
 *	- input: the fields to change (title, issue, request)
 *
 * Returns:
 *	Promise<void>; throws CampaignError not_found (404), not_starter (403), locked (409) or invalid_text (400, with problems)
 */
export async function updateCampaignText(userId: string, id: string, input: UpdateCampaignInput): Promise<void> {
  const { campaign, memberCount } = await loadCampaign(id);
  if (campaign.starterId !== userId) throw new CampaignError("not_starter", 403);
  if (memberCount > 1 || campaign.stage !== "gathering") throw new CampaignError("locked", 409);

  const next = {
    title: (input.title ?? campaign.title).trim(),
    issue: (input.issue ?? campaign.issue).trim(),
    request: (input.request ?? campaign.request).trim(),
  };
  const { problems } = checkCampaignText(next);
  if (problems.length) throw new CampaignError("invalid_text", 400, { problems });
  await db.update(campaigns).set({ ...next, updatedAt: new Date() }).where(eq(campaigns.id, id));
}

/**
 * Purpose:
 *	Add the user as a member, recording their riding and their consent to be contacted and shared with the MP.
 *
 * Args:
 *	- user: the logged-in user
 *	- id: the campaign id
 *	- riding: their riding, from ridingForJoin()
 *
 * Returns:
 *	Promise<void>; throws CampaignError not_found (404), not_joinable (409, live or closed) or already_member (409)
 */
export async function joinCampaign(user: CurrentUser, id: string, riding: string): Promise<void> {
  const { campaign } = await loadCampaign(id);
  if (!JOINABLE.includes(campaign.stage)) throw new CampaignError("not_joinable", 409, { stage: campaign.stage });
  await ensureUser(user);

  const [joined] = await db
    .insert(campaignMembers)
    .values({ campaignId: id, userId: user.id, riding })
    .onConflictDoNothing()
    .returning({ userId: campaignMembers.userId });
  if (!joined) throw new CampaignError("already_member", 409);
  await db.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id));
}

/**
 * Purpose:
 *	Remove the user from a campaign. The starter can't leave; they ask our team to close it instead.
 *
 * Args:
 *	- userId: the logged-in user's id
 *	- id: the campaign id
 *
 * Returns:
 *	Promise<void>; throws CampaignError not_found (404), starter_cannot_leave (403) or not_member (404)
 */
export async function leaveCampaign(userId: string, id: string): Promise<void> {
  const { campaign } = await loadCampaign(id);
  if (campaign.starterId === userId) throw new CampaignError("starter_cannot_leave", 403);
  const [left] = await db
    .delete(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, id), eq(campaignMembers.userId, userId)))
    .returning({ userId: campaignMembers.userId });
  if (!left) throw new CampaignError("not_member", 404);
  await db.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id));
}

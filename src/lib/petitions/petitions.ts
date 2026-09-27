import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, petitions, type PetitionRow } from "@/db/schema";
import { SIGNATURES_NEEDED } from "@/lib/campaigns/rules";
import { fetchPetition, petitionUrl } from "./ourcommons";

// Official e-petitions our team created from campaigns, and their numbers from ourcommons.ca.

// pending: attached, not on ourcommons.ca yet. open: collecting signatures. closed: signing ended.
// presented: an MP presented it to the House. response: the government tabled its response.
export type PetitionStatus = "pending" | "open" | "closed" | "presented" | "response";

export type PetitionCard = {
  number: string;
  title: string;
  url: string;
  campaignId: string;
  campaignTitle: string;
  storyId: string;
  sponsorName: string | null;
  sponsorRiding: string | null;
  signatures: number;
  signaturesNeeded: number;
  status: PetitionStatus;
  openedAt: string | null;
  closesAt: string | null;
  presentedAt: string | null;
  responseTabledAt: string | null;
  syncedAt: string | null;
};

// Petitions page order: live ones first, then closed, presented, response received.
const STATUS_ORDER: PetitionStatus[] = ["open", "pending", "closed", "presented", "response"];
const STALE_MINUTES = 30;
const EARLY_STAGES = ["gathering", "in_review", "mp_asked", "mp_agreed"] as const;

/**
 * Purpose:
 *	Work out where a petition is in the House process from its dates.
 *
 * Args:
 *	- row: the petition's dates
 *	- now: the current time (a parameter so tests can fix it)
 *
 * Returns:
 *	PetitionStatus: response, presented, closed, open or pending, checked in that order
 */
export function petitionStatus(row: Pick<PetitionRow, "openedAt" | "closesAt" | "presentedAt" | "responseTabledAt">, now = new Date()): PetitionStatus {
  if (row.responseTabledAt) return "response";
  if (row.presentedAt) return "presented";
  if (row.closesAt && row.closesAt <= now) return "closed";
  if (row.openedAt) return "open";
  return "pending";
}

/**
 * Purpose:
 *	Shape a petition row and its campaign into the card the frontend shows.
 *
 * Args:
 *	- row: the petition
 *	- campaign: the campaign it came from (id, title, storyId)
 *
 * Returns:
 *	PetitionCard: dates as ISO strings, with the sign-up link and the 500-signature target
 */
export function toPetitionCard(row: PetitionRow, campaign: { id: string; title: string; storyId: string }): PetitionCard {
  const iso = (date: Date | null) => date?.toISOString() ?? null;
  return {
    number: row.number,
    title: row.title,
    url: petitionUrl(row.number),
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    storyId: campaign.storyId,
    sponsorName: row.sponsorName,
    sponsorRiding: row.sponsorRiding,
    signatures: row.signatures,
    signaturesNeeded: SIGNATURES_NEEDED,
    status: petitionStatus(row),
    openedAt: iso(row.openedAt),
    closesAt: iso(row.closesAt),
    presentedAt: iso(row.presentedAt),
    responseTabledAt: iso(row.responseTabledAt),
    syncedAt: iso(row.syncedAt),
  };
}

/**
 * Purpose:
 *	List every campaign that became an official petition, for the Petitions page and a story's Petitions section.
 *
 * Args:
 *	- filter.storyId: only petitions from campaigns on this story
 *
 * Returns:
 *	Promise<PetitionCard[]>: open first, then pending, closed, presented, response; newest first within each
 */
export async function listPetitions(filter: { storyId?: string } = {}): Promise<PetitionCard[]> {
  const rows = await db
    .select({ petition: petitions, campaign: { id: campaigns.id, title: campaigns.title, storyId: campaigns.storyId } })
    .from(petitions)
    .innerJoin(campaigns, eq(campaigns.id, petitions.campaignId))
    .where(filter.storyId ? eq(campaigns.storyId, filter.storyId) : undefined);

  return rows
    .map((row) => toPetitionCard(row.petition, row.campaign))
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        (b.openedAt ?? b.number).localeCompare(a.openedAt ?? a.number),
    );
}

/**
 * Purpose:
 *	Refresh one petition from ourcommons.ca and move its campaign along: live when signing opens, closed when it ends.
 *
 * Args:
 *	- number: the petition number, e.g. "e-7203"
 *
 * Returns:
 *	Promise<"synced" | "not_found">: not_found when ourcommons.ca has no page for it yet; throws PetitionFetchError if the site is down
 */
export async function syncPetition(number: string): Promise<"synced" | "not_found"> {
  const found = await fetchPetition(number);
  if (!found) {
    await db.update(petitions).set({ syncedAt: new Date() }).where(eq(petitions.number, number));
    return "not_found";
  }

  const [row] = await db
    .update(petitions)
    .set({
      signatures: found.signatures,
      sponsorName: found.sponsorName,
      sponsorRiding: found.sponsorRiding,
      openedAt: found.openedAt,
      closesAt: found.closesAt,
      presentedAt: found.presentedAt,
      responseTabledAt: found.responseTabledAt,
      syncedAt: new Date(),
    })
    .where(eq(petitions.number, number))
    .returning();
  if (!row) return "not_found";

  const status = petitionStatus(row);
  if (status === "open") {
    await db
      .update(campaigns)
      .set({ stage: "live", updatedAt: new Date() })
      .where(and(eq(campaigns.id, row.campaignId), inArray(campaigns.stage, [...EARLY_STAGES])));
  } else if (status !== "pending") {
    await db
      .update(campaigns)
      .set({ stage: "closed", updatedAt: new Date() })
      .where(and(eq(campaigns.id, row.campaignId), eq(campaigns.stage, "live")));
  }
  return "synced";
}

/**
 * Purpose:
 *	Refresh every petition (or only the stale ones) from ourcommons.ca, one at a time to be polite to the site.
 *
 * Args:
 *	- options.olderThanMinutes: only petitions not refreshed for this long; omit to refresh all
 *
 * Returns:
 *	Promise<object>: counts of synced, notFound and failed petitions
 */
export async function syncPetitions(options: { olderThanMinutes?: number } = {}) {
  const cutoff = options.olderThanMinutes === undefined ? null : new Date(Date.now() - options.olderThanMinutes * 60_000);
  const rows = await db
    .select({ number: petitions.number })
    .from(petitions)
    .where(cutoff ? or(isNull(petitions.syncedAt), lt(petitions.syncedAt, cutoff)) : undefined);

  const result = { synced: 0, notFound: 0, failed: 0 };
  for (const { number } of rows) {
    try {
      if ((await syncPetition(number)) === "synced") result.synced += 1;
      else result.notFound += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

let refreshing: Promise<unknown> | null = null;

/**
 * Purpose:
 *	Refresh petitions that are over 30 minutes old, at most one run at a time. Called with next/server after() by
 *	the pages that show petitions, so counts stay fresh without a scheduled job.
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	Promise<void>: resolves when the refresh (or the one already running) ends; never throws
 */
export async function refreshStalePetitions(): Promise<void> {
  refreshing ??= syncPetitions({ olderThanMinutes: STALE_MINUTES })
    .catch(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  await refreshing;
}

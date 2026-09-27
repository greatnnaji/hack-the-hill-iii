import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { normalizePostal } from "@/lib/mp/postal";
import { lookupMpByPostal } from "@/lib/mp/represent";
import { ensureUser } from "@/lib/users";
import { CampaignError } from "./errors";

/**
 * Purpose:
 *	Get the user's saved riding.
 *
 * Args:
 *	- userId: the user's id
 *
 * Returns:
 *	Promise<string | null>: the riding name, or null if they never gave a postal code
 */
export async function getSavedRiding(userId: string): Promise<string | null> {
  const [row] = await db.select({ riding: users.riding }).from(users).where(eq(users.id, userId));
  return row?.riding ?? null;
}

/**
 * Purpose:
 *	Find the user's riding from a postal code and save only the riding to their account. The postal code is never stored.
 *
 * Args:
 *	- user: the logged-in user
 *	- postalCode: what they typed, e.g. "k1p 1a4"
 *
 * Returns:
 *	Promise<string>: the riding name, e.g. "Ottawa Centre"; throws CampaignError invalid_postal (400) or riding_not_found (404)
 */
export async function saveRidingFromPostal(user: CurrentUser, postalCode: string): Promise<string> {
  const code = normalizePostal(postalCode);
  if (!code) throw new CampaignError("invalid_postal", 400);
  const mp = await lookupMpByPostal(code);
  if (!mp) throw new CampaignError("riding_not_found", 404);

  await ensureUser(user);
  await db.update(users).set({ riding: mp.riding }).where(eq(users.id, user.id));
  return mp.riding;
}

/**
 * Purpose:
 *	Work out which riding to record when someone joins: a newly typed postal code wins, otherwise the saved riding.
 *
 * Args:
 *	- user: the logged-in user
 *	- postalCode: optional postal code from the join form
 *
 * Returns:
 *	Promise<string>: the riding; throws CampaignError riding_required (400) when there is neither
 */
export async function ridingForJoin(user: CurrentUser, postalCode: string | undefined): Promise<string> {
  if (postalCode) return saveRidingFromPostal(user, postalCode);
  const saved = await getSavedRiding(user.id);
  if (!saved) throw new CampaignError("riding_required", 400);
  return saved;
}

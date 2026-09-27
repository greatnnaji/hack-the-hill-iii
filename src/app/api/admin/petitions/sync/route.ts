import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { syncPetitions } from "@/lib/petitions/petitions";

/**
 * Purpose:
 *	POST /api/admin/petitions/sync: refresh every official petition from ourcommons.ca now ("Refresh" button). Admins only.
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	NextResponse: { synced, notFound, failed }; 404 not_found for non-admins
 */
export async function POST() {
  try {
    await requireAdmin();
    return NextResponse.json(await syncPetitions());
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

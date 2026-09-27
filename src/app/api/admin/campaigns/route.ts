import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CAMPAIGN_STAGES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { listAdminCampaigns } from "@/lib/campaigns/admin";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { jsonError } from "@/lib/http";

const querySchema = z.object({ stage: z.enum(CAMPAIGN_STAGES).optional(), sort: z.enum(["members", "updated"]).optional() });

/**
 * Purpose:
 *	GET /api/admin/campaigns: every campaign for /admin (closed included). Admins only; everyone else gets 404.
 *
 * Args:
 *	- request: optional ?stage=<stage>, ?sort=members|updated
 *
 * Returns:
 *	NextResponse: JSON AdminCampaignRow[]; 400 invalid_query, 404 not_found for non-admins
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!query.success) return jsonError("invalid_query", 400);
    return NextResponse.json(await listAdminCampaigns(query.data));
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

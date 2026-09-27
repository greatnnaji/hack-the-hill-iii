import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listCampaignMembers } from "@/lib/campaigns/admin";
import { campaignErrorResponse } from "@/lib/campaigns/errors";

type Context = { params: Promise<{ id: string }> };

/**
 * Purpose:
 *	GET /api/admin/campaigns/:id/members: members' name, email and riding for the sponsor email to the MP. Admins only.
 *	Every member consented to sharing these when they joined.
 *
 * Args:
 *	- _request: the incoming request (unused)
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: JSON CampaignMemberExport[] (starter first); 404 not_found
 */
export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin();
    return NextResponse.json(await listCampaignMembers((await params).id));
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

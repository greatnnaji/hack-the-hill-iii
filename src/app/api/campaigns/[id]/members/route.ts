import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCampaign, joinCampaign, leaveCampaign } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { ridingForJoin } from "@/lib/campaigns/riding";
import { joinCampaignSchema } from "@/lib/campaigns/rules";
import { jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

/**
 * Purpose:
 *	POST /api/campaigns/:id/members: join a campaign. Needs the consent box, and a postal code unless a riding is already saved.
 *
 * Args:
 *	- request: JSON { postalCode?, consent: true }
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: 201 with the updated CampaignDetail; 400 invalid_body / invalid_postal / riding_required, 404 not_found /
 *	riding_not_found, 409 already_member / not_joinable, 502 lookup_failed, 401 unauthorized
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const id = (await params).id;
    const parsed = joinCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    const riding = await ridingForJoin(user, parsed.data.postalCode);
    await joinCampaign(user, id, riding);
    return NextResponse.json(await getCampaign(id, user.id), { status: 201 });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

/**
 * Purpose:
 *	DELETE /api/campaigns/:id/members: leave a campaign (not allowed for its starter).
 *
 * Args:
 *	- _request: the incoming request (unused)
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: the updated CampaignDetail; 403 starter_cannot_leave, 404 not_found / not_member, 401 unauthorized
 */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const id = (await params).id;
    await leaveCampaign(user.id, id);
    return NextResponse.json(await getCampaign(id, user.id));
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

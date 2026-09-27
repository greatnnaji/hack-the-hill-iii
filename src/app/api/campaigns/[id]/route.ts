import { after, NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getCampaign, updateCampaignText } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { updateCampaignSchema } from "@/lib/campaigns/rules";
import { jsonError, readJson } from "@/lib/http";
import { refreshStalePetitions } from "@/lib/petitions/petitions";

type Context = { params: Promise<{ id: string }> };

/**
 * Purpose:
 *	GET /api/campaigns/:id: the campaign page. Public; login adds joined / canJoin / canLeave / canEdit.
 *	When it has an official petition, stale numbers are refreshed from ourcommons.ca after the response.
 *
 * Args:
 *	- _request: the incoming request (unused)
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: JSON CampaignDetail (petition is a PetitionCard or null); 404 not_found
 */
export async function GET(_request: Request, { params }: Context) {
  try {
    const viewer = await getCurrentUser();
    const campaign = await getCampaign((await params).id, viewer?.id ?? null);
    if (!campaign) return jsonError("not_found", 404);
    if (campaign.petition) after(refreshStalePetitions);
    return NextResponse.json(campaign);
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

/**
 * Purpose:
 *	PATCH /api/campaigns/:id: the starter edits the text, only until someone else joins.
 *
 * Args:
 *	- request: JSON with any of { title, issue, request }
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: the updated CampaignDetail; 400 invalid_body, or invalid_text (with problems to show), 403 not_starter,
 *	404 not_found, 409 locked, 401 unauthorized
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const id = (await params).id;
    const parsed = updateCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await updateCampaignText(user.id, id, parsed.data);
    return NextResponse.json(await getCampaign(id, user.id));
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

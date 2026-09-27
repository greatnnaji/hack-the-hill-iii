import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { campaignRouteError, getCampaign, updateCampaign, updateCampaignSchema } from "@/lib/campaigns";
import { jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// One campaign. A draft is only found by its starter.
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const campaign = await getCampaign((await params).id, user.id);
    if (!campaign) return jsonError("not_found", 404);
    return NextResponse.json(campaign);
  } catch (error) {
    return campaignRouteError(error);
  }
}

// Edit your own draft's text. 409 published once it's live.
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const parsed = updateCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    return NextResponse.json(await updateCampaign(user, (await params).id, parsed.data));
  } catch (error) {
    return campaignRouteError(error);
  }
}

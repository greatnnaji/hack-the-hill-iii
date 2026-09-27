import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { campaignRouteError, startCampaign, startCampaignSchema } from "@/lib/campaigns";
import { jsonError, readJson } from "@/lib/http";
import { ensureUser } from "@/lib/users";

// Publish a draft as a campaign on its story. 201 = a new campaign was created. 200 = this user already has a
// campaign on this story (one per person per story), so that existing campaign is returned and the draft is ignored.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = startCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await ensureUser(user);
    const { campaign, created } = await startCampaign(user, parsed.data);
    return NextResponse.json(campaign, { status: created ? 201 : 200 });
  } catch (error) {
    return campaignRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { campaignRouteError, createCampaign, createCampaignSchema } from "@/lib/campaigns";
import { jsonError, readJson } from "@/lib/http";
import { ensureUser } from "@/lib/users";

// Save a new campaign as a private draft on a story (screen 05). 201 = a new draft was created. 200 = this user
// already has a campaign on this story (one per person per story), so that one is returned and nothing is saved.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = createCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await ensureUser(user);
    const { campaign, created } = await createCampaign(user, parsed.data);
    return NextResponse.json(campaign, { status: created ? 201 : 200 });
  } catch (error) {
    return campaignRouteError(error);
  }
}

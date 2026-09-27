import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { campaignRouteError, publishCampaign, publishCampaignSchema } from "@/lib/campaigns";
import { jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// Publish your draft to its story (screen 06): it goes live and you become its first member. Publishing twice changes nothing.
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const parsed = publishCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    return NextResponse.json(await publishCampaign(user, (await params).id, parsed.data));
  } catch (error) {
    return campaignRouteError(error);
  }
}

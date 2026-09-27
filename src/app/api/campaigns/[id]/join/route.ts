import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { campaignRouteError, joinCampaign, joinCampaignSchema } from "@/lib/campaigns";
import { jsonError, readJson } from "@/lib/http";
import { ensureUser } from "@/lib/users";

type Context = { params: Promise<{ id: string }> };

// Join a campaign (support, not a signature). Joining twice returns the same campaign without adding a row.
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const parsed = joinCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await ensureUser(user);
    return NextResponse.json(await joinCampaign(user, (await params).id, parsed.data));
  } catch (error) {
    return campaignRouteError(error);
  }
}

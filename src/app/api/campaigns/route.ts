import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CAMPAIGN_STAGES } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createCampaign, listCampaigns } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { ridingForJoin } from "@/lib/campaigns/riding";
import { checkCampaignText, createCampaignSchema } from "@/lib/campaigns/rules";
import { jsonError, readJson } from "@/lib/http";
import { getStory } from "@/lib/stories";

const querySchema = z.object({
  story: z.string().min(1).max(200).optional(),
  stage: z.enum(CAMPAIGN_STAGES).optional(),
  mine: z.enum(["1", "true"]).optional(),
  sort: z.enum(["members", "newest"]).optional(),
});

/**
 * Purpose:
 *	GET /api/campaigns: campaigns for the story page (?story=) and the Campaigns page. Public; login adds "Joined" tags.
 *
 * Args:
 *	- request: optional ?story=<storyId>, ?stage=<stage> (closed ones only show when asked for, or on a story),
 *	  ?mine=1 (started or joined; needs login), ?sort=members|newest
 *
 * Returns:
 *	NextResponse: JSON CampaignSummary[]; 400 invalid_query, 401 unauthorized for ?mine=1 when logged out
 */
export async function GET(request: NextRequest) {
  try {
    const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!query.success) return jsonError("invalid_query", 400);
    const { story, stage, mine, sort } = query.data;

    const viewer = mine ? await requireUser() : await getCurrentUser();
    const list = await listCampaigns({ storyId: story, stage, sort, mineFor: mine ? viewer?.id : undefined, viewerId: viewer?.id ?? null });
    return NextResponse.json(list);
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

/**
 * Purpose:
 *	POST /api/campaigns: start a campaign on a story. The starter joins as the first member (postal code or saved riding, plus consent).
 *
 * Args:
 *	- request: JSON { storyId, title, issue, request, postalCode?, consent: true }
 *
 * Returns:
 *	NextResponse: 201 { id }; 400 invalid_body, invalid_text (with problems to show), invalid_postal or riding_required;
 *	404 story_not_found or riding_not_found;
 *	409 already_started (with campaignId, to open it instead); 401 unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = createCampaignSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    const { problems } = checkCampaignText(parsed.data);
    if (problems.length) return NextResponse.json({ error: "invalid_text", problems }, { status: 400 });
    // Check the story before looking up the postal code, so a bad request saves nothing.
    if (!(await getStory(parsed.data.storyId))) return jsonError("story_not_found", 404);
    const riding = await ridingForJoin(user, parsed.data.postalCode);
    const id = await createCampaign(user, parsed.data, riding);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

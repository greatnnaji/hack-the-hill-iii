import { after, NextResponse, type NextRequest } from "next/server";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { listPetitions, refreshStalePetitions } from "@/lib/petitions/petitions";

/**
 * Purpose:
 *	GET /api/petitions: every campaign that became an official petition, for the Petitions page (and ?story= for a story page).
 *	Public. Numbers over 30 minutes old are refreshed from ourcommons.ca after the response.
 *
 * Args:
 *	- request: optional ?story=<storyId>
 *
 * Returns:
 *	NextResponse: JSON PetitionCard[], open first, then pending, closed, presented, response
 */
export async function GET(request: NextRequest) {
  try {
    const story = request.nextUrl.searchParams.get("story") ?? undefined;
    const list = await listPetitions({ storyId: story });
    if (list.length) after(refreshStalePetitions);
    return NextResponse.json(list);
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

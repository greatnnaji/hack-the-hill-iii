import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withCampaigns } from "@/lib/campaigns/campaigns";
import { handleRouteError, jsonError } from "@/lib/http";
import { listStories } from "@/lib/stories";

/**
 * Purpose:
 *	GET /api/spending?department=ND: the feed (screen 03). `joined` is for the logged-in user (false when nobody is).
 *
 * Args:
 *	- request: the incoming request; optional ?department= is a department code from GET /api/departments
 *
 * Returns:
 *	NextResponse: JSON stories newest first, each with its `campaigns` (empty when the department has none); 400 invalid_department
 */
export async function GET(request: NextRequest) {
  try {
    const department = request.nextUrl.searchParams.get("department");
    if (department !== null && !/^[A-Za-z]{1,10}$/.test(department)) return jsonError("invalid_department", 400);
    const stories = await listStories({ department: department ?? undefined });
    return NextResponse.json(await withCampaigns(stories, (await getCurrentUser())?.id ?? null));
  } catch (error) {
    return handleRouteError(error);
  }
}

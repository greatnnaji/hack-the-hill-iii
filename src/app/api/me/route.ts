import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { getSavedRiding } from "@/lib/campaigns/riding";

/**
 * Purpose:
 *	GET /api/me: the logged-in user, for the gear menu (Admin link) and the join form ("Your riding: Ottawa Centre").
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	NextResponse: { id, name, firstName, email, riding, isAdmin }; 401 unauthorized
 */
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      id: user.id,
      name: user.name,
      firstName: firstName(user.name),
      email: user.email,
      riding: await getSavedRiding(user.id),
      isAdmin: isAdmin(user),
    });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

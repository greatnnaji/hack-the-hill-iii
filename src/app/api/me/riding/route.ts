import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { saveRidingFromPostal } from "@/lib/campaigns/riding";
import { jsonError, readJson } from "@/lib/http";

const bodySchema = z.object({ postalCode: z.string().trim().min(1).max(10) });

/**
 * Purpose:
 *	PUT /api/me/riding: find the riding for a postal code and save only the riding to the account (the postal code is not stored).
 *
 * Args:
 *	- request: JSON { postalCode }
 *
 * Returns:
 *	NextResponse: { riding }; 400 invalid_body / invalid_postal, 404 riding_not_found, 502 lookup_failed, 401 unauthorized
 */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    return NextResponse.json({ riding: await saveRidingFromPostal(user, parsed.data.postalCode) });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}

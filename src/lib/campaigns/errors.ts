import { NextResponse } from "next/server";
import { NotAdminError } from "@/lib/admin";
import { handleRouteError, jsonError } from "@/lib/http";
import { LookupError } from "@/lib/mp/represent";

// A request the campaign API refuses on purpose, e.g. joining a closed campaign. Routes turn it into { error: code }.
export class CampaignError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "CampaignError";
  }
}

/**
 * Purpose:
 *	Turn anything thrown inside a campaign, petition or admin route into the JSON error the frontend expects.
 *
 * Args:
 *	- error: whatever was thrown
 *
 * Returns:
 *	NextResponse: { error: code, ...details } with the right status; admin checks answer 404 so the admin area stays hidden
 */
export function campaignErrorResponse(error: unknown): NextResponse {
  if (error instanceof CampaignError) return NextResponse.json({ error: error.code, ...error.details }, { status: error.status });
  if (error instanceof NotAdminError) return jsonError("not_found", 404);
  if (error instanceof LookupError) return jsonError("lookup_failed", 502);
  return handleRouteError(error);
}

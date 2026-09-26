import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { normalizePostal } from "@/lib/mp/postal";
import { LookupError, lookupMpByPostal } from "@/lib/mp/represent";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const code = normalizePostal(request.nextUrl.searchParams.get("postal") ?? "");
    if (!code) return jsonError("invalid_postal", 400);
    const mp = await lookupMpByPostal(code);
    if (!mp) return jsonError("not_found", 404);
    return NextResponse.json(mp);
  } catch (error) {
    if (error instanceof LookupError) return jsonError("lookup_failed", 502);
    return handleRouteError(error);
  }
}

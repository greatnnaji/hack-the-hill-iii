import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { LookupError, listAllMps } from "@/lib/mp/represent";
import { searchMps } from "@/lib/mp/search";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (query.length < 2 || query.length > 100) return jsonError("invalid_query", 400);
    return NextResponse.json(searchMps(await listAllMps(), query));
  } catch (error) {
    if (error instanceof LookupError) return jsonError("lookup_failed", 502);
    return handleRouteError(error);
  }
}

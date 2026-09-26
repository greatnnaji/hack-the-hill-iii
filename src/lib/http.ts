import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";

export function jsonError(code: string, status: number): NextResponse {
  return NextResponse.json({ error: code }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) return jsonError("unauthorized", 401);
  console.error(error);
  return jsonError("server_error", 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

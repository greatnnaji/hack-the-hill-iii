import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDraft, listDrafts } from "@/lib/drafts";
import { createDraftSchema } from "@/lib/petition";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { ensureUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = createDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await ensureUser(user);
    const draft = await createDraft(user.id, parsed.data);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listDrafts(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDraft, updateDraft } from "@/lib/drafts";
import { updateDraftSchema } from "@/lib/petition";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const draft = await getDraft(user.id, (await params).id);
    if (!draft) return jsonError("not_found", 404);
    return NextResponse.json(draft);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const parsed = updateDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    const draft = await updateDraft(user.id, (await params).id, parsed.data);
    if (!draft) return jsonError("not_found", 404);
    return NextResponse.json(draft);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDraft } from "@/lib/drafts";
import type { Draft } from "@/lib/petition";

/** Loads one of the current user's drafts for a page, or shows the not-found page. */
export async function loadDraft(params: Promise<{ id: string }>): Promise<Draft> {
  const { id } = await params;
  const user = await requireUser();
  const draft = await getDraft(user.id, id);
  if (!draft) notFound();
  return draft;
}

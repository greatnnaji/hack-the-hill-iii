import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, type DraftRow } from "@/db/schema";
import type { CreateDraftInput, Draft, UpdateDraftInput } from "@/lib/petition";

function toDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    storyId: row.storyId,
    storyTitle: row.storyTitle,
    title: row.title,
    issue: row.issue,
    request: row.request,
    mp: row.mp ?? null,
    sponsorEmail: row.sponsorEmail,
    sponsorRequestedAt: row.sponsorRequestedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Postgres rejects malformed UUIDs with an error, so treat them as "not found" up front.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createDraft(userId: string, input: CreateDraftInput): Promise<Draft> {
  const [row] = await db
    .insert(drafts)
    .values({ userId, ...input })
    .returning();
  return toDraft(row);
}

export async function listDrafts(userId: string): Promise<Draft[]> {
  const rows = await db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, userId))
    .orderBy(desc(drafts.updatedAt));
  return rows.map(toDraft);
}

export async function getDraft(userId: string, id: string): Promise<Draft | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)));
  return row ? toDraft(row) : null;
}

export async function updateDraft(
  userId: string,
  id: string,
  patch: UpdateDraftInput,
): Promise<Draft | null> {
  if (!UUID.test(id)) return null;
  const { sponsorRequested, ...fields } = patch;
  const [row] = await db
    .update(drafts)
    .set({
      ...fields,
      ...(sponsorRequested ? { sponsorRequestedAt: sql`now()` } : {}),
      updatedAt: sql`now()`,
    })
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)))
    .returning();
  return row ? toDraft(row) : null;
}

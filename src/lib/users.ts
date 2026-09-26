import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
};

// Called after every login: creates the row the first time, refreshes it after.
export async function upsertUser(user: CurrentUser): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, name: user.name })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email, name: user.name, lastLoginAt: sql`now()` },
    });
}

// Guarantees the row exists before a draft references it.
export async function ensureUser(user: CurrentUser): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, name: user.name })
    .onConflictDoNothing();
}

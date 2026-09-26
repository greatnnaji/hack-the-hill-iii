import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUser, upsertUser } from "./users";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

const ALICE = { id: "auth0|alice", email: "alice@example.com", name: "Alice" };

beforeEach(async () => {
  await db.delete(users);
});

describe("upsertUser", () => {
  it("creates the row on first login and refreshes it after", async () => {
    await upsertUser(ALICE);
    await upsertUser({ ...ALICE, name: "Alice B." });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: ALICE.id, name: "Alice B." });
  });
});

describe("ensureUser", () => {
  it("creates a missing row and leaves an existing one alone", async () => {
    await ensureUser(ALICE);
    await ensureUser({ ...ALICE, name: "Changed" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice");
  });
});

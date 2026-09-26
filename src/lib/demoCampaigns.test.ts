import { beforeEach, describe, expect, it, vi } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignSupporters, users } from "@/db/schema";
import { getStory } from "./stories";
import { DEMO_CAMPAIGNS, seedDemoCampaigns } from "./demoCampaigns";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

const REAL = { id: "auth0|alice", email: "alice@example.com", name: "Alice" };

beforeEach(async () => {
  await db.delete(users);
});

describe("seedDemoCampaigns", () => {
  it("creates each campaign on a real story with its starter first and the right member count", async () => {
    await seedDemoCampaigns(new Date("2026-09-26T12:00:00Z"));
    const rows = await db.select().from(campaigns);
    expect(rows).toHaveLength(DEMO_CAMPAIGNS.length);

    for (const demo of DEMO_CAMPAIGNS) {
      expect(await getStory(demo.storyId)).not.toBeNull();
      const campaign = rows.find((r) => r.title === demo.title)!;
      const members = await db.select().from(campaignSupporters).where(eq(campaignSupporters.campaignId, campaign.id)).orderBy(campaignSupporters.joinedAt);
      expect(members).toHaveLength(demo.supporters);
      expect(members[0]).toMatchObject({ userId: campaign.startedBy, name: expect.stringMatching(new RegExp(`^${demo.starter} `)) });
    }
    expect(rows.find((r) => r.storyId === "data-nd-bur03-2024")).toMatchObject({ status: "review", target: 1000, deadline: "2026-11-06" });
  });

  it("replaces demo rows on re-run and leaves real users alone", async () => {
    await db.insert(users).values(REAL);
    await seedDemoCampaigns();
    await seedDemoCampaigns();
    expect((await db.select({ n: count() }).from(campaigns))[0].n).toBe(DEMO_CAMPAIGNS.length);
    expect(await db.select().from(users).where(eq(users.id, REAL.id))).toHaveLength(1);
  });
});

describe("campaign constraints", () => {
  it("allows one campaign per person per story and one supporter row per person per campaign", async () => {
    await db.insert(users).values(REAL);
    const base = { storyId: "data-nd-bur03-2024", startedBy: REAL.id, title: "t", issue: "i", request: "r", deadline: "2026-12-25" };
    const [campaign] = await db.insert(campaigns).values(base).returning();
    expect(campaign).toMatchObject({ target: 1000, status: "gathering" });
    await expect(db.insert(campaigns).values(base)).rejects.toThrow();
    await db.insert(campaigns).values({ ...base, storyId: "data-oicc-byb04-2024" });

    const member = { campaignId: campaign.id, userId: REAL.id, name: REAL.name, email: REAL.email };
    await db.insert(campaignSupporters).values(member);
    await expect(db.insert(campaignSupporters).values(member)).rejects.toThrow();
  });
});

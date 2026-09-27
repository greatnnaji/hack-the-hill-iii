import { beforeEach, describe, expect, it, vi } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignMembers, campaigns, users } from "@/db/schema";
import { checkCampaignText } from "@/lib/campaigns/rules";
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
      expect(checkCampaignText(demo).problems).toEqual([]);
      const campaign = rows.find((r) => r.title === demo.title)!;
      const members = await db.select().from(campaignMembers).where(eq(campaignMembers.campaignId, campaign.id)).orderBy(campaignMembers.joinedAt);
      expect(members).toHaveLength(demo.members);
      expect(members[0].userId).toBe(campaign.starterId);
      const [starter] = await db.select().from(users).where(eq(users.id, campaign.starterId));
      expect(starter.name).toMatch(new RegExp(`^${demo.starter} `));
    }
    expect(rows.find((r) => r.storyId === "data-nd-bur03-2024")).toMatchObject({ stage: "in_review", target: 1000, deadline: "2026-11-06" });
  });

  it("replaces demo rows on re-run and leaves real users alone", async () => {
    await db.insert(users).values(REAL);
    await seedDemoCampaigns();
    await seedDemoCampaigns();
    expect((await db.select({ n: count() }).from(campaigns))[0].n).toBe(DEMO_CAMPAIGNS.length);
    expect(await db.select().from(users).where(eq(users.id, REAL.id))).toHaveLength(1);
  });
});

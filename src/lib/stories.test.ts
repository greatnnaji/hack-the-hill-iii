import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { campaigns, campaignSupporters, users } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import type { StoryWithCampaigns } from "@/lib/campaigns";
import { GET as getDepartments } from "@/app/api/departments/route";
import { GET as getSpendingStory } from "@/app/api/spending/[id]/route";
import { GET as getSpending } from "@/app/api/spending/route";
import dataStories from "../../pipeline/stories.json";
import newsStories from "../../pipeline/news_stories.json";
import { getStory, listDepartments, listStories } from "./stories";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));

const ALICE: CurrentUser = { id: "auth0|alice", email: "alice@example.com", name: "Alice" };

beforeEach(async () => {
  await db.delete(users);
  vi.mocked(getCurrentUser).mockResolvedValue(ALICE);
});

describe("stories", () => {
  it("lists the pipeline stories", async () => {
    const stories = await listStories();
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), title: expect.any(String) }),
    );
  });

  it("finds a story by id", async () => {
    const [first] = await listStories();
    expect(await getStory(first.id)).toEqual(first);
  });

  it("returns null for an unknown id", async () => {
    expect(await getStory("no-such-story")).toBeNull();
  });

  it("includes both the data stories and the news stories, newest first", async () => {
    const stories = await listStories();
    expect(stories).toHaveLength(dataStories.length + newsStories.length);
    expect(new Set(stories.map((story) => story.source_type))).toEqual(new Set(["data", "news"]));
    const dates = stories.map((story) => story.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("filters by department code, in any case", async () => {
    const [first] = await listStories();
    const onlyThat = await listStories({ department: first.dept_code.toLowerCase() });
    expect(onlyThat.length).toBeGreaterThan(0);
    expect(onlyThat.every((story) => story.dept_code === first.dept_code)).toBe(true);
    expect(await listStories({ department: "NOPE" })).toEqual([]);
  });
});

describe("listDepartments", () => {
  it("counts every story once, most stories first", async () => {
    const departments = await listDepartments();
    expect(departments.reduce((sum, department) => sum + department.count, 0)).toBe((await listStories()).length);
    expect(new Set(departments.map((department) => department.dept_code)).size).toBe(departments.length);
    const counts = departments.map((department) => department.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe("GET /api/spending", () => {
  const get = (query = "") => getSpending(new NextRequest(`http://localhost/api/spending${query}`));

  it("returns the whole feed without a filter", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const stories: StoryWithCampaigns[] = await res.json();
    expect(stories).toHaveLength((await listStories()).length);
    // No campaigns in the database yet: every story shows the empty state.
    expect(stories.every((story) => Array.isArray(story.campaigns) && story.campaigns.length === 0)).toBe(true);
  });

  it("returns one department's stories", async () => {
    const [department] = await listDepartments();
    const stories: StoryWithCampaigns[] = await (await get(`?department=${department.dept_code}`)).json();
    expect(stories).toHaveLength(department.count);
  });

  it("rejects a department that isn't a code", async () => {
    const res = await get("?department=drop%20table");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_department" });
  });
});

describe("GET /api/spending/:id", () => {
  const get = (id: string) => getSpendingStory(new Request(`http://localhost/api/spending/${id}`), { params: Promise.resolve({ id }) });

  it("returns the story", async () => {
    const [first] = await listStories();
    const res = await get(first.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...first, campaigns: [] });
  });

  it("404s for an unknown id", async () => {
    const res = await get("no-such-story");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("GET /api/departments", () => {
  it("returns the filter chips", async () => {
    const res = await getDepartments();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(await listDepartments());
  });
});

describe("campaigns on stories", () => {
  const BOB: CurrentUser = { id: "auth0|bob", email: "bob@example.com", name: "Bob" };
  const AIRCRAFT = "data-nd-bur03-2024";
  const detail = async (id = AIRCRAFT): Promise<StoryWithCampaigns> =>
    (await getSpendingStory(new Request(`http://localhost/api/spending/${id}`), { params: Promise.resolve({ id }) })).json();

  async function addCampaign(startedBy: string, fields: Partial<typeof campaigns.$inferInsert> = {}) {
    const [row] = await db
      .insert(campaigns)
      .values({ storyId: AIRCRAFT, startedBy, title: `By ${startedBy}`, issue: "i", request: "r", deadline: "2026-12-25", ...fields })
      .returning();
    await db.insert(campaignSupporters).values({ campaignId: row.id, userId: startedBy, name: startedBy, email: `${startedBy}@example.com` });
    return row;
  }

  it("orders official first, then most supporters, closed last", async () => {
    await db.insert(users).values([ALICE, BOB, { id: "carol", name: "Carol" }, { id: "dan", name: "Dan" }]);
    const closed = await addCampaign("dan", { status: "closed" });
    const small = await addCampaign("carol");
    const big = await addCampaign(BOB.id);
    await db.insert(campaignSupporters).values({ campaignId: big.id, userId: ALICE.id, name: "Alice", email: ALICE.email! });
    const official = await addCampaign(ALICE.id, { status: "official" });

    const story = await detail();
    expect(story.campaigns.map((c) => c.id)).toEqual([official.id, big.id, small.id, closed.id]);
    expect(story.campaigns[1]).toMatchObject({ starter: "Bob", supporters: 2, target: 1000, deadline: "2026-12-25", status: "gathering", joined: true, petition: null });
    expect(story.campaigns[2].joined).toBe(false);
    // Other stories stay empty.
    expect((await detail("data-oicc-byb04-2024")).campaigns).toEqual([]);
  });

  it("reports joined: false for everyone when nobody is logged in", async () => {
    await db.insert(users).values(ALICE);
    await addCampaign(ALICE.id);
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await detail()).campaigns[0]).toMatchObject({ supporters: 1, joined: false });
  });
});

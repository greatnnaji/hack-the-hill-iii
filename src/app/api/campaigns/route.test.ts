import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignSupporters, users } from "@/db/schema";
import { getCurrentUser, requireUser, UnauthorizedError, type CurrentUser } from "@/lib/auth";
import type { Campaign } from "@/lib/campaigns";
import postcodeFixture from "@/lib/mp/__fixtures__/postcode-K1P1A4.json";
import { GET as getSpendingStory } from "../spending/[id]/route";
import * as campaignRoute from "./[id]/route";
import * as joinRoute from "./[id]/join/route";
import * as publishRoute from "./[id]/publish/route";
import * as campaignsRoute from "./route";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const ALICE: CurrentUser = { id: "auth0|alice", email: "alice@example.com", name: "Alice Tremblay" };
const BOB: CurrentUser = { id: "auth0|bob", email: "bob@example.com", name: "bob@example.com" };

const TEXT = {
  storyId: "data-nd-bur03-2024",
  title: "Publish the full cost of Canada's new military aircraft",
  issue: "Whereas military aircraft purchases more than tripled in two years;",
  request: "publish the lifetime cost of every military aircraft contract.",
};

function signInAs(user: CurrentUser) {
  vi.mocked(requireUser).mockResolvedValue(user);
  vi.mocked(getCurrentUser).mockResolvedValue(user);
}

function send(method: string, body?: unknown) {
  return new Request("http://localhost", { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const result = async (res: Response) => ({ status: res.status, body: await res.json() });

const create = async (body: object = TEXT) => result(await campaignsRoute.POST(send("POST", body)));
const get = async (id: string) => result(await campaignRoute.GET(send("GET"), ctx(id)));
const edit = async (id: string, body: object) => result(await campaignRoute.PATCH(send("PATCH", body), ctx(id)));
const publish = async (id: string, body: object = { shareWithMp: true }) => result(await publishRoute.POST(send("POST", body), ctx(id)));
const join = async (id: string, body: object = { shareWithMp: true }) => result(await joinRoute.POST(send("POST", body), ctx(id)));
const story = async (): Promise<{ campaigns: Campaign[] }> => (await getSpendingStory(send("GET"), ctx(TEXT.storyId))).json();

async function live(): Promise<Campaign> {
  const { body } = await create();
  return (await publish(body.id)).body;
}

beforeEach(async () => {
  await db.delete(users);
  signInAs(ALICE);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(postcodeFixture)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/campaigns (save a draft)", () => {
  it("saves a private draft with no supporters and no deadline yet", async () => {
    const { status, body } = await create();
    expect(status).toBe(201);
    expect(body).toMatchObject({ ...{ story_id: TEXT.storyId, title: TEXT.title }, status: "draft", supporters: 0, deadline: null, mine: true, joined: false });
    signInAs(BOB);
    expect((await get(body.id)).status).toBe(404);
  });

  it("returns their existing campaign instead of a second one on the same story", async () => {
    const first = await create();
    const again = await create({ ...TEXT, title: "Another angle" });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ id: first.body.id, title: TEXT.title });
    expect(await db.select().from(campaigns)).toHaveLength(1);
  });

  it("rejects an unknown story, bad text and no login", async () => {
    expect((await create({ ...TEXT, storyId: "no-such-story" })).status).toBe(404);
    expect((await create({ ...TEXT, title: "  " })).status).toBe(400);
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());
    expect((await create()).status).toBe(401);
  });
});

describe("PATCH /api/campaigns/:id (edit a draft)", () => {
  it("lets the starter edit until it's published", async () => {
    const { body: draft } = await create();
    expect((await edit(draft.id, { title: "Sharper title" })).body.title).toBe("Sharper title");
    await publish(draft.id);
    expect((await edit(draft.id, { title: "Too late" })).status).toBe(409);
  });

  it("hides someone else's draft", async () => {
    const { body: draft } = await create();
    signInAs(BOB);
    expect((await edit(draft.id, { title: "Mine now" })).status).toBe(404);
  });
});

describe("POST /api/campaigns/:id/publish", () => {
  it("goes live with the starter as first member, their riding and the chosen deadline", async () => {
    const { body: draft } = await create();
    const { status, body } = await publish(draft.id, { days: 60, postal: "k1p 1a4", shareWithMp: true });
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "gathering", supporters: 1, joined: true, starter: "Alice", target: 1000, petition: null });
    expect(body.deadline).toBe(new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));
    const [member] = await db.select().from(campaignSupporters);
    expect(member).toMatchObject({ userId: ALICE.id, email: ALICE.email, riding: "Ottawa Centre", shareWithMp: true });
  });

  it("changes nothing when published twice", async () => {
    const { body: draft } = await create();
    await publish(draft.id);
    expect((await publish(draft.id)).body.supporters).toBe(1);
  });

  it("still publishes when the riding lookup is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const { body: draft } = await create();
    expect((await publish(draft.id, { postal: "K1P1A4", shareWithMp: true })).status).toBe(200);
    expect((await db.select().from(campaignSupporters))[0].riding).toBeNull();
  });

  it("rejects someone else's draft, bad input and a missing email", async () => {
    const { body: draft } = await create();
    expect((await publish(draft.id, { days: 10, shareWithMp: true })).status).toBe(400);
    expect((await publish(draft.id, { postal: "12345", shareWithMp: true })).status).toBe(400);
    expect((await publish(draft.id, {})).status).toBe(400);
    signInAs(BOB);
    expect((await publish(draft.id)).status).toBe(404);
    signInAs({ ...ALICE, email: null });
    expect((await publish(draft.id)).body).toEqual({ error: "email_required" });
  });
});

describe("POST /api/campaigns/:id/join", () => {
  let campaign: Campaign;
  beforeEach(async () => {
    campaign = await live();
    signInAs(BOB);
  });

  it("adds the user once, however many times they tap", async () => {
    const first = await join(campaign.id, { postal: "K1P 1A4", shareWithMp: false });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ supporters: 2, joined: true, mine: false });
    // Bob's Auth0 name is his email; the starter shown is still Alice's first name.
    expect(first.body.starter).toBe("Alice");
    expect((await join(campaign.id)).body.supporters).toBe(2);
    const [bob] = await db.select().from(campaignSupporters).where(eq(campaignSupporters.userId, BOB.id));
    expect(bob).toMatchObject({ riding: "Ottawa Centre", shareWithMp: false });
  });

  it("moves a gathering campaign to review when it reaches the target", async () => {
    await db.update(campaigns).set({ target: 2 });
    expect((await join(campaign.id)).body).toMatchObject({ supporters: 2, status: "review" });
  });

  it("does not move a campaign back to review once the team has moved it on", async () => {
    await db.update(campaigns).set({ target: 2, status: "sponsor_asked" });
    expect((await join(campaign.id)).body.status).toBe("sponsor_asked");
  });

  it("refuses drafts, closed campaigns and unknown ids", async () => {
    signInAs(ALICE);
    const { body: draft } = await create({ ...TEXT, storyId: "data-oicc-byb04-2024" });
    expect((await join(draft.id)).status).toBe(404);
    signInAs(BOB);
    await db.update(campaigns).set({ status: "closed" }).where(eq(campaigns.id, campaign.id));
    expect((await join(campaign.id)).status).toBe(409);
    expect((await join("00000000-0000-0000-0000-000000000000")).status).toBe(404);
    expect((await join("not-a-uuid")).status).toBe(404);
  });
});

describe("demo check: write, publish, join, see it on the story", () => {
  it("shows the campaign on its story only once published, with the count going up", async () => {
    expect((await story()).campaigns).toEqual([]);
    const { body: draft } = await create();
    signInAs(BOB);
    expect((await story()).campaigns).toEqual([]);

    signInAs(ALICE);
    await publish(draft.id);
    signInAs(BOB);
    expect((await story()).campaigns).toMatchObject([{ id: draft.id, starter: "Alice", supporters: 1, joined: false }]);

    await join(draft.id);
    await join(draft.id);
    expect((await story()).campaigns).toMatchObject([{ supporters: 2, joined: true }]);
  });
});

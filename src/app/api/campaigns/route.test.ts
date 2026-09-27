import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignSupporters, users } from "@/db/schema";
import { getCurrentUser, requireUser, UnauthorizedError, type CurrentUser } from "@/lib/auth";
import type { Campaign } from "@/lib/campaigns";
import { createDraft } from "@/lib/drafts";
import postcodeFixture from "@/lib/mp/__fixtures__/postcode-K1P1A4.json";
import { ensureUser } from "@/lib/users";
import { GET as getSpendingStory } from "../spending/[id]/route";
import * as joinRoute from "./[id]/join/route";
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

const DRAFT = {
  storyId: "data-nd-bur03-2024",
  storyTitle: "Military aircraft purchases more than tripled in two years",
  title: "Publish the full cost of Canada's new military aircraft",
  issue: "Whereas military aircraft purchases more than tripled in two years;",
  request: "publish the lifetime cost of every military aircraft contract.",
};

function signInAs(user: CurrentUser) {
  vi.mocked(requireUser).mockResolvedValue(user);
  vi.mocked(getCurrentUser).mockResolvedValue(user);
}

function post(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function draftFor(user: CurrentUser, fields: Partial<typeof DRAFT> = {}) {
  await ensureUser(user);
  return createDraft(user.id, { ...DRAFT, ...fields });
}

async function start(body: object) {
  const res = await campaignsRoute.POST(post("http://localhost/api/campaigns", body));
  return { status: res.status, body: await res.json() };
}

async function join(id: string, body: object = { shareWithMp: true }) {
  const res = await joinRoute.POST(post(`http://localhost/api/campaigns/${id}/join`, body), { params: Promise.resolve({ id }) });
  return { status: res.status, body: await res.json() };
}

beforeEach(async () => {
  await db.delete(users);
  signInAs(ALICE);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(postcodeFixture)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/campaigns", () => {
  it("publishes a draft with the starter as first member and their riding", async () => {
    const draft = await draftFor(ALICE);
    const { status, body } = await start({ draftId: draft.id, days: 60, postal: "k1p 1a4", shareWithMp: true });
    expect(status).toBe(201);
    expect(body).toMatchObject({ story_id: DRAFT.storyId, title: DRAFT.title, starter: "Alice", supporters: 1, target: 1000, status: "gathering", joined: true, petition: null });
    expect(body.deadline).toBe(new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));
    const [member] = await db.select().from(campaignSupporters);
    expect(member).toMatchObject({ userId: ALICE.id, email: ALICE.email, riding: "Ottawa Centre", shareWithMp: true });
  });

  it("returns the existing campaign when the same person starts a second one on a story", async () => {
    const first = await start({ draftId: (await draftFor(ALICE)).id, shareWithMp: true });
    const again = await start({ draftId: (await draftFor(ALICE, { title: "Another angle" })).id, shareWithMp: true });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ id: first.body.id, title: DRAFT.title });
    expect(await db.select().from(campaigns)).toHaveLength(1);
  });

  it("lets different people start campaigns on the same story", async () => {
    await start({ draftId: (await draftFor(ALICE)).id, shareWithMp: true });
    signInAs(BOB);
    const bob = await start({ draftId: (await draftFor(BOB)).id, shareWithMp: false });
    expect(bob.status).toBe(201);
    // Bob's Auth0 name is his email, which must not show as the starter.
    expect(bob.body.starter).toBe("A supporter");
  });

  it("still starts the campaign when the riding lookup is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const { status } = await start({ draftId: (await draftFor(ALICE)).id, postal: "K1P1A4", shareWithMp: true });
    expect(status).toBe(201);
    expect((await db.select().from(campaignSupporters))[0].riding).toBeNull();
  });

  it("rejects someone else's draft, an unknown story, bad input and no login", async () => {
    const draft = await draftFor(ALICE);
    signInAs(BOB);
    expect((await start({ draftId: draft.id, shareWithMp: true })).status).toBe(404);
    signInAs(ALICE);
    expect((await start({ draftId: (await draftFor(ALICE, { storyId: "no-such-story" })).id, shareWithMp: true })).status).toBe(404);
    expect((await start({ draftId: draft.id, days: 10, shareWithMp: true })).status).toBe(400);
    expect((await start({ draftId: draft.id, postal: "12345", shareWithMp: true })).status).toBe(400);
    expect((await start({ draftId: draft.id })).status).toBe(400);
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());
    expect((await start({ draftId: draft.id, shareWithMp: true })).status).toBe(401);
  });

  it("needs an email so the team can reach supporters", async () => {
    const noEmail = { ...ALICE, email: null };
    signInAs(noEmail);
    expect((await start({ draftId: (await draftFor(noEmail)).id, shareWithMp: true })).body).toEqual({ error: "email_required" });
  });
});

describe("POST /api/campaigns/:id/join", () => {
  let campaign: Campaign;
  beforeEach(async () => {
    campaign = (await start({ draftId: (await draftFor(ALICE)).id, shareWithMp: true })).body;
    signInAs(BOB);
  });

  it("adds the user once, however many times they tap", async () => {
    const first = await join(campaign.id, { postal: "K1P 1A4", shareWithMp: false });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ supporters: 2, joined: true });
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

  it("refuses closed campaigns and unknown ids", async () => {
    await db.update(campaigns).set({ status: "closed" });
    expect((await join(campaign.id)).status).toBe(409);
    expect((await join("00000000-0000-0000-0000-000000000000")).status).toBe(404);
    expect((await join("not-a-uuid")).status).toBe(404);
  });
});

describe("demo check: start, join, see it on the story", () => {
  it("shows the campaign on its story with the count going up and joined per user", async () => {
    const story = async () => (await getSpendingStory(new Request("http://localhost"), { params: Promise.resolve({ id: DRAFT.storyId }) })).json();
    expect((await story()).campaigns).toEqual([]);

    const { body: campaign } = await start({ draftId: (await draftFor(ALICE)).id, shareWithMp: true });
    signInAs(BOB);
    expect((await story()).campaigns).toMatchObject([{ id: campaign.id, starter: "Alice", supporters: 1, joined: false }]);

    await join(campaign.id);
    await join(campaign.id);
    expect((await story()).campaigns).toMatchObject([{ supporters: 2, joined: true }]);
  });
});

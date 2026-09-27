import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { campaignMembers, campaigns, petitions, users } from "@/db/schema";
import * as adminCampaignRoute from "@/app/api/admin/campaigns/[id]/route";
import * as adminMembersRoute from "@/app/api/admin/campaigns/[id]/members/route";
import * as adminPetitionRoute from "@/app/api/admin/campaigns/[id]/petition/route";
import * as adminListRoute from "@/app/api/admin/campaigns/route";
import * as adminSyncRoute from "@/app/api/admin/petitions/sync/route";
import * as campaignRoute from "@/app/api/campaigns/[id]/route";
import * as membersRoute from "@/app/api/campaigns/[id]/members/route";
import * as campaignsRoute from "@/app/api/campaigns/route";
import * as meRidingRoute from "@/app/api/me/riding/route";
import * as meRoute from "@/app/api/me/route";
import * as petitionsRoute from "@/app/api/petitions/route";
import { getCurrentUser, requireUser, UnauthorizedError, type CurrentUser } from "@/lib/auth";
import { lookupMpByPostal } from "@/lib/mp/represent";
import { syncPetitions } from "@/lib/petitions/petitions";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/mp/represent", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mp/represent")>()),
  lookupMpByPostal: vi.fn(),
}));

// after() needs a live request; in tests the stale-petition refresh is simply skipped.
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: vi.fn() }));

const ALICE: CurrentUser = { id: "auth0|alice", email: "alice@example.com", name: "Alice Martin" };
const BOB: CurrentUser = { id: "auth0|bob", email: "bob@example.com", name: "Bob" };
const CAROL: CurrentUser = { id: "auth0|carol", email: "carol@example.com", name: "carol@example.com" };
const ADMIN: CurrentUser = { id: "auth0|admin", email: "Team@Example.ca", name: "Team Member" };

const STORY = "data-fin-buv11-2024"; // a real story in pipeline/stories.json
const TEXT = {
  title: "Publish a plan to lower debt interest",
  issue: "Whereas interest on the federal debt rose 52% in two years;",
  request: "publish a plan to reduce what Canadians pay in debt interest.",
};

const E4701 = readFileSync(path.join(__dirname, "..", "petitions", "__fixtures__", "e-4701.html"), "utf8");
// The same page as it looked while open for signature: closing date in the future, not presented yet.
const OPEN_PAGE = E4701.replace("December 24, 2023", "December 24, 2099")
  .replace(/<dt>Presented to the House of Commons[\s\S]*?(?=<\/dl>)/, "")
  .replace("387487 signatures", "1234 signatures");

const RIDINGS: Record<string, string> = { K1P1A4: "Ottawa Centre", M5V2T6: "Spadina—Harbourfront" };

/**
 * Purpose:
 *	Pretend a user is logged in (or nobody, with null) for both getCurrentUser() and requireUser().
 *
 * Args:
 *	- user: the user, or null for logged out
 *
 * Returns:
 *	void
 */
function loginAs(user: CurrentUser | null) {
  vi.mocked(getCurrentUser).mockResolvedValue(user);
  vi.mocked(requireUser).mockImplementation(async () => {
    if (!user) throw new UnauthorizedError();
    return user;
  });
}

/**
 * Purpose:
 *	Build a request to one of our routes, with an optional JSON body.
 *
 * Args:
 *	- url: path and query, e.g. "/api/campaigns?story=x"
 *	- method: HTTP method, GET by default
 *	- body: JSON body for POST/PATCH/PUT
 *
 * Returns:
 *	NextRequest
 */
function req(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Purpose:
 *	Build the route context Next.js passes to [id] routes.
 *
 * Args:
 *	- id: the campaign id
 *
 * Returns:
 *	object: { params: Promise<{ id }> }
 */
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/**
 * Purpose:
 *	Start a campaign as a user through the API and return its id.
 *
 * Args:
 *	- user: the starter
 *	- overrides: body fields to change
 *
 * Returns:
 *	Promise<string>: the new campaign's id
 */
async function start(user: CurrentUser, overrides: Record<string, unknown> = {}) {
  loginAs(user);
  const res = await campaignsRoute.POST(req("/api/campaigns", "POST", { storyId: STORY, ...TEXT, postalCode: "K1P 1A4", consent: true, ...overrides }));
  expect(res.status).toBe(201);
  return (await res.json()).id as string;
}

/**
 * Purpose:
 *	Join a campaign as a user through the API.
 *
 * Args:
 *	- user: who joins
 *	- id: the campaign id
 *	- body: the join body, postal code K1P 1A4 and consent by default
 *
 * Returns:
 *	Promise<Response>
 */
async function join(user: CurrentUser, id: string, body: Record<string, unknown> = { postalCode: "K1P 1A4", consent: true }) {
  loginAs(user);
  return membersRoute.POST(req(`/api/campaigns/${id}/members`, "POST", body), ctx(id));
}

beforeEach(async () => {
  await db.delete(petitions);
  await db.delete(campaignMembers);
  await db.delete(campaigns);
  await db.delete(users);
  vi.stubEnv("ADMIN_EMAILS", "team@example.ca, other@example.ca");
  vi.mocked(lookupMpByPostal).mockImplementation(async (code) => (RIDINGS[code] ? ({ riding: RIDINGS[code] } as never) : null));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(OPEN_PAGE)));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("starting a campaign", () => {
  it("creates it with the starter as first member and saves only their riding", async () => {
    const id = await start(ALICE);
    loginAs(ALICE);
    const detail = await (await campaignRoute.GET(req(`/api/campaigns/${id}`), ctx(id))).json();
    expect(detail).toMatchObject({
      title: TEXT.title,
      storyTitle: "Interest on the federal debt rose 52% in two years",
      starterFirstName: "Alice",
      memberCount: 1,
      ridingCount: 1,
      stage: "gathering",
      opening: "We, the undersigned, call upon the Government of Canada to",
      joined: true,
      isStarter: true,
      canEdit: true,
      canJoin: false,
      canLeave: false,
      petition: null,
    });
    const [row] = await db.select().from(users);
    expect(row.riding).toBe("Ottawa Centre");
    expect(JSON.stringify(row)).not.toMatch(/K1P/i);
  });

  it("allows one campaign per person per story and points to the existing one", async () => {
    const id = await start(ALICE);
    const res = await campaignsRoute.POST(req("/api/campaigns", "POST", { storyId: STORY, ...TEXT, consent: true }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_started", campaignId: id });
  });

  it("rejects bad input with the reasons to show", async () => {
    loginAs(ALICE);
    const post = (body: unknown) => campaignsRoute.POST(req("/api/campaigns", "POST", body));

    const withLink = await post({ storyId: STORY, ...TEXT, request: "see www.example.com", postalCode: "K1P1A4", consent: true });
    expect(withLink.status).toBe(400);
    expect(await withLink.json()).toEqual({ error: "invalid_text", problems: ["Petitions can't include links."] });

    expect((await post({ storyId: STORY, ...TEXT, postalCode: "K1P1A4" })).status).toBe(400); // no consent
    expect(await (await post({ storyId: "no-such-story", ...TEXT, postalCode: "K1P1A4", consent: true })).json()).toEqual({ error: "story_not_found" });
    expect(await (await post({ storyId: STORY, ...TEXT, consent: true })).json()).toEqual({ error: "riding_required" });
    expect(await (await post({ storyId: STORY, ...TEXT, postalCode: "12345", consent: true })).json()).toEqual({ error: "invalid_postal" });
  });

  it("needs a login", async () => {
    loginAs(null);
    const res = await campaignsRoute.POST(req("/api/campaigns", "POST", { storyId: STORY, ...TEXT, postalCode: "K1P1A4", consent: true }));
    expect(res.status).toBe(401);
  });
});

describe("joining and leaving", () => {
  it("counts members and ridings, and reuses a saved riding without a postal code", async () => {
    const id = await start(ALICE);
    expect((await join(BOB, id, { postalCode: "M5V 2T6", consent: true })).status).toBe(201);

    loginAs(CAROL);
    expect(await (await meRidingRoute.PUT(req("/api/me/riding", "PUT", { postalCode: "k1p1a4" }))).json()).toEqual({ riding: "Ottawa Centre" });
    const res = await join(CAROL, id, { consent: true });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ memberCount: 3, ridingCount: 2, joined: true, canLeave: true, canJoin: false });
  });

  it("refuses a second join, a join without consent, and joining a live campaign", async () => {
    const id = await start(ALICE);
    expect((await join(BOB, id)).status).toBe(201);
    expect(await (await join(BOB, id)).json()).toEqual({ error: "already_member" });
    expect((await join(CAROL, id, { postalCode: "K1P1A4" })).status).toBe(400);

    await db.update(campaigns).set({ stage: "live" });
    expect(await (await join(CAROL, id)).json()).toEqual({ error: "not_joinable", stage: "live" });
  });

  it("lets members leave but not the starter", async () => {
    const id = await start(ALICE);
    await join(BOB, id);
    loginAs(BOB);
    const left = await membersRoute.DELETE(req(`/api/campaigns/${id}/members`, "DELETE"), ctx(id));
    expect(await left.json()).toMatchObject({ memberCount: 1, joined: false });
    expect(await (await membersRoute.DELETE(req("/", "DELETE"), ctx(id))).json()).toEqual({ error: "not_member" });

    loginAs(ALICE);
    expect(await (await membersRoute.DELETE(req("/", "DELETE"), ctx(id))).json()).toEqual({ error: "starter_cannot_leave" });
  });
});

describe("editing", () => {
  it("lets the starter edit until someone else joins, then locks the text", async () => {
    const id = await start(ALICE);
    loginAs(ALICE);
    const edit = (body: unknown) => campaignRoute.PATCH(req(`/api/campaigns/${id}`, "PATCH", body), ctx(id));

    expect(await (await edit({ title: "A clearer title" })).json()).toMatchObject({ title: "A clearer title", canEdit: true });
    expect(await (await edit({ issue: "No whereas here" })).json()).toMatchObject({ error: "invalid_text" });

    await join(BOB, id);
    loginAs(BOB);
    expect(await (await edit({ title: "Bob's title" })).json()).toEqual({ error: "not_starter" });
    loginAs(ALICE);
    expect(await (await edit({ title: "Too late" })).json()).toEqual({ error: "locked" });
  });
});

describe("listing campaigns", () => {
  it("orders a story's campaigns live first, then by members, closed last, with Joined tags", async () => {
    const small = await start(ALICE, { title: "Small" });
    const big = await start(BOB, { title: "Big" });
    const live = await start(CAROL, { title: "Live" });
    const closed = await start(ADMIN, { title: "Closed" });
    await join(ALICE, big);
    await join(CAROL, big);
    await db.update(campaigns).set({ stage: "live" }).where(eq(campaigns.id, live));
    await db.update(campaigns).set({ stage: "closed" }).where(eq(campaigns.id, closed));

    loginAs(ALICE);
    const list = await (await campaignsRoute.GET(req(`/api/campaigns?story=${STORY}`))).json();
    expect(list.map((c: { title: string }) => c.title)).toEqual(["Live", "Big", "Small", "Closed"]);
    expect(list.map((c: { joined: boolean }) => c.joined)).toEqual([false, true, true, false]);
    expect(list[0].starterFirstName).toBe("Someone"); // Carol's account name is her email, which is never shown

    const all = await (await campaignsRoute.GET(req("/api/campaigns"))).json();
    expect(all.map((c: { title: string }) => c.title)).toEqual(["Big", "Live", "Small"]); // closed hidden, most members first
    const onlyClosed = await (await campaignsRoute.GET(req("/api/campaigns?stage=closed"))).json();
    expect(onlyClosed.map((c: { title: string }) => c.title)).toEqual(["Closed"]);
    const mine = await (await campaignsRoute.GET(req("/api/campaigns?mine=1&sort=newest"))).json();
    expect(mine.map((c: { id: string }) => c.id)).toEqual([big, small]);
    expect(small).not.toBe(big);
  });

  it("needs a login for Mine and rejects unknown filters", async () => {
    loginAs(null);
    expect((await campaignsRoute.GET(req("/api/campaigns?mine=1"))).status).toBe(401);
    expect((await campaignsRoute.GET(req("/api/campaigns?stage=nope"))).status).toBe(400);
    expect(await (await campaignsRoute.GET(req("/api/campaigns"))).json()).toEqual([]);
  });

  it("404s for unknown and malformed ids", async () => {
    loginAs(null);
    expect((await campaignRoute.GET(req("/"), ctx("not-a-uuid"))).status).toBe(404);
    expect((await campaignRoute.GET(req("/"), ctx("00000000-0000-4000-8000-000000000000"))).status).toBe(404);
  });
});

describe("GET /api/me", () => {
  it("returns the saved riding and whether the user is an admin", async () => {
    await start(ALICE);
    loginAs(ALICE);
    expect(await (await meRoute.GET()).json()).toMatchObject({ firstName: "Alice", riding: "Ottawa Centre", isAdmin: false });
    loginAs(ADMIN);
    expect(await (await meRoute.GET()).json()).toMatchObject({ riding: null, isAdmin: true });
  });
});

describe("admin", () => {
  it("answers 404 to anyone who isn't on the team", async () => {
    for (const user of [null, ALICE]) {
      loginAs(user);
      expect((await adminListRoute.GET(req("/api/admin/campaigns"))).status).toBe(404);
      expect((await adminSyncRoute.POST()).status).toBe(404);
    }
  });

  it("lists every campaign, changes stage and note, and exports consenting members", async () => {
    const id = await start(ALICE);
    await join(BOB, id, { postalCode: "M5V2T6", consent: true });
    loginAs(ADMIN);

    const list = await (await adminListRoute.GET(req("/api/admin/campaigns?sort=updated"))).json();
    expect(list).toEqual([expect.objectContaining({ id, starterEmail: "alice@example.com", memberCount: 2, ridingCount: 2, stage: "gathering" })]);

    const patch = (body: unknown) => adminCampaignRoute.PATCH(req("/", "PATCH", body), ctx(id));
    expect(await (await patch({ stage: "mp_asked", teamNote: "Asked Yasir Naqvi on Sept 27." })).json()).toMatchObject({
      stage: "mp_asked",
      teamNote: "Asked Yasir Naqvi on Sept 27.",
    });
    expect(await (await patch({ stage: "live" })).json()).toEqual({ error: "needs_petition" });
    expect((await patch({})).status).toBe(400);

    const members = await (await adminMembersRoute.GET(req("/"), ctx(id))).json();
    expect(members).toEqual([
      expect.objectContaining({ email: "alice@example.com", riding: "Ottawa Centre", isStarter: true }),
      expect.objectContaining({ email: "bob@example.com", riding: "Spadina—Harbourfront", isStarter: false }),
    ]);
  });

  it("attaches an official petition, fetches it, and the campaign goes live", async () => {
    const id = await start(ALICE);
    loginAs(ADMIN);
    const res = await adminPetitionRoute.PUT(req("/", "PUT", { number: "E-4701", title: "Lower debt interest" }), ctx(id));
    const body = await res.json();
    expect(body.sync).toBe("synced");
    expect(body.campaign.stage).toBe("live");
    expect(body.campaign.petition).toMatchObject({
      number: "e-4701",
      title: "Lower debt interest",
      url: "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-4701",
      sponsorName: "Michelle Ferreri",
      signatures: 1234,
      signaturesNeeded: 500,
      status: "open",
    });

    loginAs(null);
    const listed = await (await petitionsRoute.GET(req(`/api/petitions?story=${STORY}`))).json();
    expect(listed.map((p: { number: string }) => p.number)).toEqual(["e-4701"]);
    expect(await (await petitionsRoute.GET(req("/api/petitions?story=other"))).json()).toEqual([]);
  });

  it("rejects a bad or already used petition number", async () => {
    const first = await start(ALICE);
    const second = await start(BOB);
    loginAs(ADMIN);
    const attach = (id: string, number: string) => adminPetitionRoute.PUT(req("/", "PUT", { number, title: "T" }), ctx(id));
    expect(await (await attach(first, "7203")).json()).toEqual({ error: "invalid_petition_number" });
    expect((await attach(first, "e-4701")).status).toBe(200);
    expect(await (await attach(second, "e-4701")).json()).toEqual({ error: "petition_taken" });
  });
});

describe("petition sync", () => {
  it("closes a live campaign when ourcommons.ca shows the petition finished, and records its final numbers", async () => {
    const id = await start(ALICE);
    loginAs(ADMIN);
    await adminPetitionRoute.PUT(req("/", "PUT", { number: "e-4701", title: "T" }), ctx(id));

    vi.stubGlobal("fetch", vi.fn(async () => new Response(E4701)));
    expect(await syncPetitions()).toEqual({ synced: 1, notFound: 0, failed: 0 });

    loginAs(null);
    const detail = await (await campaignRoute.GET(req("/"), ctx(id))).json();
    expect(detail.stage).toBe("closed");
    expect(detail.petition).toMatchObject({ status: "response", signatures: 387487, presentedAt: "2024-01-31T05:00:00.000Z" });
  });

  it("counts petitions not on ourcommons.ca yet and sites that fail, and only refreshes stale ones when asked", async () => {
    const id = await start(ALICE);
    loginAs(ADMIN);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<h1>Search - Petitions</h1>")));
    expect((await (await adminPetitionRoute.PUT(req("/", "PUT", { number: "e-4701", title: "T" }), ctx(id))).json()).sync).toBe("not_found");
    expect(await syncPetitions()).toEqual({ synced: 0, notFound: 1, failed: 0 });
    expect(await syncPetitions({ olderThanMinutes: 30 })).toEqual({ synced: 0, notFound: 0, failed: 0 });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await (await adminSyncRoute.POST()).json()).toEqual({ synced: 0, notFound: 0, failed: 1 });
  });
});


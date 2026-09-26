import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { drafts, users } from "@/db/schema";
import { requireUser, UnauthorizedError, type CurrentUser } from "@/lib/auth";
import type { Draft } from "@/lib/petition";
import * as draftRoute from "./[id]/route";
import * as draftsRoute from "./route";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireUser: vi.fn(),
}));

const ALICE: CurrentUser = { id: "auth0|alice", email: "alice@example.com", name: "Alice" };
const BOB: CurrentUser = { id: "auth0|bob", email: "bob@example.com", name: "Bob" };

const NEW_DRAFT = {
  storyId: "data-fin-buv11-2024",
  storyTitle: "Interest on the federal debt rose 52% in two years",
  title: "Publish a plan to reduce federal debt interest",
  issue: "Whereas interest on the federal debt rose 52% in two years;",
  request: "publish a plan to reduce debt interest costs.",
};

const MP = {
  name: "Yasir Naqvi",
  riding: "Ottawa Centre",
  party: "Liberal",
  email: "yasir.naqvi@parl.gc.ca",
  photoUrl: null,
  profileUrl: null,
  hillPhone: "1 613 996-5322",
  ridingPhone: "1 613 946-8682",
};

function signInAs(user: CurrentUser) {
  vi.mocked(requireUser).mockResolvedValue(user);
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/me/drafts", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function create(body: object = NEW_DRAFT): Promise<Draft> {
  const res = await draftsRoute.POST(jsonRequest("POST", body));
  expect(res.status).toBe(201);
  return res.json();
}

beforeEach(async () => {
  await db.delete(drafts);
  await db.delete(users);
  signInAs(ALICE);
});

describe("POST /api/me/drafts", () => {
  it("creates a draft and the user row", async () => {
    const draft = await create();
    expect(draft).toMatchObject({ ...NEW_DRAFT, mp: null, sponsorEmail: null, sponsorRequestedAt: null });
    expect(draft.id).toMatch(/^[0-9a-f-]{36}$/);
    const [row] = await db.select().from(users);
    expect(row.id).toBe(ALICE.id);
  });

  it("rejects an empty title", async () => {
    const res = await draftsRoute.POST(jsonRequest("POST", { ...NEW_DRAFT, title: "  " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("rejects a title over 250 characters", async () => {
    const res = await draftsRoute.POST(jsonRequest("POST", { ...NEW_DRAFT, title: "x".repeat(251) }));
    expect(res.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await draftsRoute.POST(
      new Request("http://localhost/api/me/drafts", { method: "POST", body: "nope" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when logged out", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());
    const res = await draftsRoute.POST(jsonRequest("POST", NEW_DRAFT));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});

describe("GET /api/me/drafts", () => {
  it("lists only my drafts, most recently updated first", async () => {
    const first = await create({ ...NEW_DRAFT, title: "First" });
    const second = await create({ ...NEW_DRAFT, title: "Second" });
    signInAs(BOB);
    await create({ ...NEW_DRAFT, title: "Bob's" });
    signInAs(ALICE);
    await draftRoute.PATCH(jsonRequest("PATCH", { title: "First, edited" }), ctx(first.id));

    const res = await draftsRoute.GET();
    const list: Draft[] = await res.json();
    expect(list.map((d) => d.id)).toEqual([first.id, second.id]);
  });
});

describe("GET /api/me/drafts/:id", () => {
  it("returns my draft", async () => {
    const draft = await create();
    const res = await draftRoute.GET(new Request("http://localhost"), ctx(draft.id));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(draft.id);
  });

  it("returns 404 for someone else's draft", async () => {
    const draft = await create();
    signInAs(BOB);
    const res = await draftRoute.GET(new Request("http://localhost"), ctx(draft.id));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for a malformed id", async () => {
    const res = await draftRoute.GET(new Request("http://localhost"), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/me/drafts/:id", () => {
  it("updates text fields", async () => {
    const draft = await create();
    const res = await draftRoute.PATCH(
      jsonRequest("PATCH", { title: "New title", issue: "Whereas x;", request: "do y." }),
      ctx(draft.id),
    );
    expect(await res.json()).toMatchObject({ title: "New title", issue: "Whereas x;", request: "do y." });
  });

  it("stores the MP and the edited letter, and can reset the letter", async () => {
    const draft = await create();
    let res = await draftRoute.PATCH(jsonRequest("PATCH", { mp: MP, sponsorEmail: "Dear MP" }), ctx(draft.id));
    expect(await res.json()).toMatchObject({ mp: MP, sponsorEmail: "Dear MP" });
    res = await draftRoute.PATCH(jsonRequest("PATCH", { sponsorEmail: null }), ctx(draft.id));
    expect((await res.json()).sponsorEmail).toBeNull();
  });

  it("marks the sponsor request as sent", async () => {
    const draft = await create();
    const res = await draftRoute.PATCH(jsonRequest("PATCH", { sponsorRequested: true }), ctx(draft.id));
    expect((await res.json()).sponsorRequestedAt).toEqual(expect.any(String));
  });

  it("rejects an MP without a name", async () => {
    const draft = await create();
    const res = await draftRoute.PATCH(jsonRequest("PATCH", { mp: { ...MP, name: "" } }), ctx(draft.id));
    expect(res.status).toBe(400);
  });

  it("returns 404 for someone else's draft", async () => {
    const draft = await create();
    signInAs(BOB);
    const res = await draftRoute.PATCH(jsonRequest("PATCH", { title: "Hijack" }), ctx(draft.id));
    expect(res.status).toBe(404);
  });
});

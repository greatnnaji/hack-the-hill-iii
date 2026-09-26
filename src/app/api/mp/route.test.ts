import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import postcodeFixture from "@/lib/mp/__fixtures__/postcode-K1P1A4.json";
import { GET as getMp } from "./route";
import { GET as searchMpsRoute } from "../mps/route";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireUser: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ id: "auth0|alice", email: null, name: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Error) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  );
}

describe("GET /api/mp", () => {
  const get = (postal: string) =>
    getMp(new NextRequest(`http://localhost/api/mp?postal=${encodeURIComponent(postal)}`));

  it("returns the MP for a postal code with a space", async () => {
    stubFetch(Response.json(postcodeFixture));
    const res = await get("k1p 1a4");
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Yasir Naqvi");
  });

  it("rejects a malformed postal code without calling Represent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await get("12345");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_postal" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown postal code", async () => {
    stubFetch(new Response("Not found", { status: 404 }));
    const res = await get("Z9Z9Z9");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 502 when Represent times out", async () => {
    stubFetch(new DOMException("timed out", "TimeoutError"));
    const res = await get("K1P1A4");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "lookup_failed" });
  });

  it("returns 401 when logged out", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());
    const res = await get("K1P1A4");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/mps", () => {
  const search = (q: string) =>
    searchMpsRoute(new NextRequest(`http://localhost/api/mps?q=${encodeURIComponent(q)}`));

  it("returns MPs matching the query", async () => {
    stubFetch(Response.json({ objects: postcodeFixture.representatives_centroid, meta: {} }));
    const res = await search("naqvi");
    expect(res.status).toBe(200);
    expect((await res.json()).map((mp: { name: string }) => mp.name)).toEqual(["Yasir Naqvi"]);
  });

  it("rejects a one-character query", async () => {
    const res = await search("n");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_query" });
  });

  it("returns 502 when Represent fails", async () => {
    stubFetch(new Response("oops", { status: 500 }));
    const res = await search("naqvi");
    expect(res.status).toBe(502);
  });
});

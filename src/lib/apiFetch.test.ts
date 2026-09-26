import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./apiFetch";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiFetch", () => {
  it("sends JSON and returns the parsed response", async () => {
    const fetchMock = stubFetch(Response.json({ id: "d1" }, { status: 201 }));
    const result = await apiFetch<{ id: string }>("/api/me/drafts", { method: "POST", body: { a: 1 } });
    expect(result).toEqual({ id: "d1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/me/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"a":1}',
    });
  });

  it("throws ApiError with the route's error code", async () => {
    stubFetch(Response.json({ error: "not_found" }, { status: 404 }));
    const error = await apiFetch("/api/mp?postal=Z9Z9Z9").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "not_found" });
  });

  it("uses server_error when the body has no error code", async () => {
    stubFetch(new Response("Bad gateway", { status: 502 }));
    await expect(apiFetch("/api/mp")).rejects.toMatchObject({ code: "server_error" });
  });

  it("sends the browser to login on 401, returning to the current page", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/petition/abc/sponsor", search: "?x=1", assign },
    });
    stubFetch(Response.json({ error: "unauthorized" }, { status: 401 }));
    void apiFetch("/api/me/drafts");
    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith("/auth/login?returnTo=%2Fpetition%2Fabc%2Fsponsor%3Fx%3D1"),
    );
  });
});

import type { SessionData } from "@auth0/nextjs-auth0/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertUser } from "@/lib/users";
import { onCallback } from "./auth0";

vi.mock("@/lib/users", () => ({ upsertUser: vi.fn() }));

const session = {
  user: { sub: "auth0|alice", email: "alice@example.com", name: "Alice" },
} as unknown as SessionData;

const ctx = { appBaseUrl: "http://localhost:3000", returnTo: "/petition/new?story=x" };

beforeEach(() => {
  vi.mocked(upsertUser).mockReset();
});

describe("onCallback", () => {
  it("saves the user and redirects to the page they asked for", async () => {
    const res = await onCallback(null, ctx, session);
    expect(upsertUser).toHaveBeenCalledWith({
      id: "auth0|alice",
      email: "alice@example.com",
      name: "Alice",
    });
    expect(res.headers.get("location")).toBe("http://localhost:3000/petition/new?story=x");
  });

  it("redirects to / when there is no returnTo", async () => {
    const res = await onCallback(null, { appBaseUrl: "http://localhost:3000" }, session);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects to / when returnTo points to another origin", async () => {
    const res = await onCallback(
      null,
      { appBaseUrl: "http://localhost:3000", returnTo: "//evil.example" },
      session,
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("still logs the user in when saving the row fails", async () => {
    vi.mocked(upsertUser).mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await onCallback(null, ctx, session);
    expect(res.headers.get("location")).toBe("http://localhost:3000/petition/new?story=x");
  });

  it("returns 500 when Auth0 reports an error", async () => {
    const error = new Error("access_denied") as Parameters<typeof onCallback>[0];
    const res = await onCallback(error, ctx, null);
    expect(res.status).toBe(500);
    expect(upsertUser).not.toHaveBeenCalled();
  });
});

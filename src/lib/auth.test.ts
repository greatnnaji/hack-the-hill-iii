import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuth0, isAuthConfigured } from "@/lib/auth0";
import { DEV_USER, requireUser, UnauthorizedError } from "./auth";

vi.mock("@/lib/auth0", () => ({
  isAuthConfigured: vi.fn(),
  getAuth0: vi.fn(),
}));

function sessionReturns(session: unknown) {
  vi.mocked(getAuth0).mockReturnValue({
    getSession: vi.fn(async () => session),
  } as unknown as ReturnType<typeof getAuth0>);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireUser", () => {
  it("returns the session user", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(true);
    sessionReturns({ user: { sub: "auth0|alice", email: "alice@example.com", name: "Alice" } });
    await expect(requireUser()).resolves.toEqual({
      id: "auth0|alice",
      email: "alice@example.com",
      name: "Alice",
    });
  });

  it("fills missing email and name with null", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(true);
    sessionReturns({ user: { sub: "auth0|bob" } });
    await expect(requireUser()).resolves.toEqual({ id: "auth0|bob", email: null, name: null });
  });

  it("throws UnauthorizedError without a session", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(true);
    sessionReturns(null);
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns the dev user in development when Auth0 is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "development");
    await expect(requireUser()).resolves.toEqual(DEV_USER);
  });

  it("never bypasses outside development", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");
    sessionReturns(null);
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

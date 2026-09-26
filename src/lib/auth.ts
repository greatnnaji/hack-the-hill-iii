import { getAuth0, isAuthConfigured } from "@/lib/auth0";
import type { CurrentUser } from "@/lib/users";

export type { CurrentUser };

export const DEV_USER: CurrentUser = {
  id: "dev|local",
  email: "dev@localhost",
  name: "Local Dev",
};

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

// Lets teammates run the app locally before Auth0 credentials exist.
export function isDevBypass(): boolean {
  return !isAuthConfigured() && process.env.NODE_ENV === "development";
}

export async function requireUser(): Promise<CurrentUser> {
  if (isDevBypass()) return DEV_USER;
  const session = await getAuth0().getSession();
  if (!session) throw new UnauthorizedError();
  return {
    id: session.user.sub,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

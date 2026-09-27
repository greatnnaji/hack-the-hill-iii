import { getCurrentUser, isDevBypass, type CurrentUser } from "@/lib/auth";

// Our team's accounts. ADMIN_EMAILS is a comma-separated list of login emails, checked on the server only.

export class NotAdminError extends Error {
  constructor() {
    super("not_admin");
    this.name = "NotAdminError";
  }
}

/**
 * Purpose:
 *	Read the admin email list from the ADMIN_EMAILS setting.
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	Set<string>: lower-case emails; empty when the setting is missing
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Purpose:
 *	Say whether a user is on our team. In local development without Auth0, the dev user is an admin.
 *
 * Args:
 *	- user: the logged-in user, or null
 *
 * Returns:
 *	boolean: true for admins
 */
export function isAdmin(user: CurrentUser | null): boolean {
  if (!user) return false;
  if (isDevBypass()) return true;
  return !!user.email && adminEmails().has(user.email.toLowerCase());
}

/**
 * Purpose:
 *	Let only admins through. Everyone else, logged in or not, gets the same "not found" as a missing page.
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	Promise<CurrentUser>: the admin; throws NotAdminError otherwise
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new NotAdminError();
  return user;
}

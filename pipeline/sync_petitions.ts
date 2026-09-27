// Refresh every official petition in the database from ourcommons.ca (signatures, sponsor, dates) and move campaigns
// to "live" / "closed" to match. The app also does this by itself for petitions over 30 minutes old when someone views them.
//
// Usage: npm run petitions:sync
// DATABASE_URL is read from .env.local the same way `next dev` and drizzle.config.ts do (@next/env).

import { loadEnvConfig } from "@next/env";

/**
 * Purpose:
 *	Run the sync once and print the counts.
 *
 * Args:
 *	(none; reads DATABASE_URL)
 *
 * Returns:
 *	Promise<void>: resolves when done and the connection is closed
 */
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to .env.local, then run npm run petitions:sync.");

  // Imported after loadEnvConfig: @/db opens its connection with DATABASE_URL when it is first imported.
  const { db } = await import("@/db");
  const { syncPetitions } = await import("@/lib/petitions/petitions");
  try {
    console.log("Petitions:", await syncPetitions());
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  // Print only the message, never the connection string or the full error object.
  console.error("Sync failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

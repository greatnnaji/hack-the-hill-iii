// Load the demo campaigns (TASKS.md Great Task 3 Phase 1) into the database.
//
// Usage (tables must exist first):
//   npm run db:migrate
//   npm run db:seed
// DATABASE_URL is read from .env.local the same way `next dev` and drizzle.config.ts do (@next/env).
// Safe to re-run: every "demo|" user and their campaigns are deleted and recreated inside one transaction.

import { loadEnvConfig } from "@next/env";

/**
 * Purpose:
 *	Replace the demo campaigns and print how many rows were created.
 *
 * Args:
 *	(none; reads DATABASE_URL)
 *
 * Returns:
 *	Promise<void>: resolves when the seed is committed and the connection is closed
 */
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to .env.local, then run npm run db:seed.");

  // Imported after loadEnvConfig: @/db opens its connection with DATABASE_URL when it is first imported.
  const { db } = await import("@/db");
  const { seedDemoCampaigns } = await import("@/lib/demoCampaigns");
  try {
    console.log("Seeded:", await seedDemoCampaigns());
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  // Print only the message, never the connection string or the full error object.
  console.error("Seed failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

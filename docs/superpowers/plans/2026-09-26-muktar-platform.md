# wheredoesmytaxgo Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Muktar's part of wheredoesmytaxgo. That is an Auth0 login gate, a Postgres-backed petition draft API, federal MP lookup and search, a sponsor-email builder, and the three draft-flow screens, ready to deploy on Vercel.

**Architecture:** Everything lives in the existing Next.js 16 app. `src/proxy.ts` is the login gate. Next 16 renamed `middleware.ts` to `proxy.ts`. API routes are App Router route handlers under `src/app/api`, and they read the user from the Auth0 session cookie. Drizzle ORM talks to Postgres. Tests use Vitest, and the database tests use PGlite, an in-process Postgres. Pure, browser-safe logic (schemas, postal codes, the email builder) is kept apart from server-only modules, so client components never bundle the database driver.

**Tech Stack:** Next.js 16.3 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, `@auth0/nextjs-auth0` 4.30, Drizzle ORM 0.45 with `postgres` 3.4, drizzle-kit 0.31, zod 4.6, Vitest 5, PGlite 0.5.

**Spec:** `docs/superpowers/specs/2026-09-26-muktar-platform-design.md`

## Global Constraints

- The product name is **wheredoesmytaxgo**. Never use "Tally", which appears in the wireframe and `TASKS.md`.
- It is a desktop-first **web app**. Use two columns at 1024px and wider (Tailwind `lg:`), and one column below that. There must be no sideways scrolling at 390px wide.
- Next 16 conventions:
  - The gate is `src/proxy.ts`, exporting `proxy`. Do not create `middleware.ts`.
  - Route handler and page `params` and `searchParams` are Promises and must be awaited.
- Node must be 22.12 or newer, because Vitest 5 requires it. `@types/node` is `^22`.
- API errors always have the shape `{ "error": "<code>" }`. The codes are `unauthorized`, `invalid_body`, `invalid_postal`, `invalid_query`, `not_found`, `lookup_failed` and `server_error`.
- Length limits:
  - title 1–250 characters
  - issue 1–4,000
  - request 1–2,000
  - sponsorEmail up to 5,000
- The request prefix is exactly `We, the undersigned, call upon the Government of Canada to`.
- **Postal codes are never stored.** They are used only to look up the MP.
- Represent API: base `https://represent.opennorth.ca`, an 8-second timeout, and a 24-hour cache (`next: { revalidate: 86400 }`).
- Client components (`"use client"`) must never import `@/db`, `@/lib/drafts`, `@/lib/users`, `@/lib/auth`, `@/lib/auth0` or `@/lib/mp/represent`. These modules are browser-safe:
  - `@/lib/petition`
  - `@/lib/mp/postal`
  - `@/lib/mp/sponsorEmail`
  - `@/lib/mp/types`
  - `@/lib/apiFetch`
  - `@/lib/clipboard`
- Claude never creates accounts or enters credentials. Muktar does the Auth0, Postgres and Vercel setup himself.
- **Do not push, open pull requests or deploy without Muktar's go-ahead.**

## Differences from the spec (decided while prototyping)

1. **Sponsor letter wording.** The letter says "I'm a constituent in <riding>" and signs off with the postal code **only when the MP was found from the user's postal code** in this visit. When the MP was chosen through "Choose a different MP", or on a page reload, the letter leaves out the constituent line and signs off `[Your name], [Postal code]`. This stops the letter claiming to be from a constituent when it isn't. §6.4 of the spec is updated to match.
2. **Extra modules**, beyond the layout in the spec's §8:
   - `src/lib/petition.ts`: browser-safe schemas, limits and types.
   - `src/lib/mp/postal.ts`: postal-code normalisation and formatting.
   - `src/lib/mp/types.ts`: the `Mp` type.
   - `src/lib/users.ts`: user row upsert.
   - `src/lib/clipboard.ts`: copy with a failure result.
   - `src/app/petition/loadDraft.ts`: loads a draft for a page, or shows not-found.
   - `src/test/db.ts`: the PGlite test database.
3. **Copy buttons can fail.** Browsers can block clipboard writes, so every Copy button shows "Couldn't copy…" instead of failing silently.
4. **`/dev/petition` stays available in production** until Izu's screen 04 exists. The production walkthrough in Task 9 starts there.
5. **Petition pages get a real title:** `Start a petition · wheredoesmytaxgo`.

## Revisions made during execution

Human decisions from the Task 7 review. These replace the Task 5 and Task 7 reference code above.

1. **Sign-off.** The letter's sign-off is always `[Your name], [Postal code]`, as the wireframe shows. `buildLetter` takes a boolean `constituent` instead of `postalCode`, and `formatPostal` is removed. The letter text can be saved, so it must never contain a real postal code.
2. **Switching MP.** Picking a different MP resets the letter to the template, and saves both in one `PATCH { mp, sponsorEmail: null }`.
3. **Lookup errors.** A lookup error is stored as `{ message, canRetry }`. `lookup_failed` shows "Couldn't reach the MP directory." with a single [Try again] button.

## Branches

The branches follow `TASKS.md`. Each one builds on the previous one.

| Branch | Tasks | Created from |
|---|---|---|
| `platform/auth` | 1–3 | Already exists, with the spec commits on top of `upstream/main` |
| `platform/mp-lookup` | 4–5 | `platform/auth` |
| `platform/draft-deploy` | 6–9 | `platform/mp-lookup` |

## File Structure

```
package.json                       + deps, test/db scripts
vitest.config.mts                  Vitest: node env, @/ alias via tsconfig
drizzle.config.ts                  drizzle-kit: schema, migrations dir, DATABASE_URL from .env.local
drizzle/                           generated SQL migrations (committed)
.env.example                       every setting, no values
next.config.ts                     allow MP photos from www.ourcommons.ca
src/proxy.ts                       login gate (+ proxy.test.ts)
src/db/schema.ts                   users + drafts tables
src/db/index.ts                    Drizzle client over postgres-js
src/test/db.ts                     PGlite database with migrations, for tests
src/lib/users.ts                   CurrentUser type, upsertUser, ensureUser (+ test)
src/lib/auth0.ts                   lazy Auth0Client + onCallback hook (+ test)
src/lib/auth.ts                    requireUser, dev bypass, UnauthorizedError (+ test)
src/lib/apiFetch.ts                client fetch wrapper, 401 → login (+ test)
src/lib/http.ts                    route-handler JSON error helpers
src/lib/petition.ts                browser-safe: prefix, limits, zod schemas, Draft type
src/lib/drafts.ts                  server: draft queries
src/lib/mp/types.ts                Mp type
src/lib/mp/postal.ts               normalizePostal, formatPostal (+ test)
src/lib/mp/represent.ts            Represent client (+ test, fixture)
src/lib/mp/search.ts               accent-insensitive MP search (+ test)
src/lib/mp/sponsorEmail.ts         buildLetter, buildEmail, composeLinks (+ test)
src/lib/stories.ts                 reads pipeline/stories.json (+ test)
src/lib/clipboard.ts               copyText (+ test)
src/app/api/me/drafts/route.ts     POST, GET list   (+ route.test.ts covering [id] too)
src/app/api/me/drafts/[id]/route.ts GET one, PATCH
src/app/api/mp/route.ts            GET /api/mp?postal=  (+ route.test.ts covering /api/mps too)
src/app/api/mps/route.ts           GET /api/mps?q=
src/app/globals.css                + wireframe colour tokens
src/app/dev/petition/page.tsx      dev list of stories → "Start a petition"
src/app/petition/layout.tsx        page shell + title
src/app/petition/loadDraft.ts      load current user's draft or 404
src/app/petition/new/page.tsx      step 1 (new)
src/app/petition/[id]/page.tsx     step 1 (edit)
src/app/petition/[id]/sponsor/page.tsx  step 2
src/app/petition/[id]/submit/page.tsx   step 3
src/app/petition/_components/      StepHeader, ProcessExplainer, PetitionForm, MpCard, MpSearch,
                                   LetterEditor, SendOptions, SponsorStep, CopyField
```

---

### Task 1: Test tooling, database schema, and user rows

**Branch:** `platform/auth`

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mts`
- Create: `drizzle.config.ts`
- Create: `drizzle/` (generated)
- Create: `src/lib/mp/types.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/test/db.ts`
- Create: `src/lib/users.ts`
- Test: `src/lib/users.test.ts`

**Interfaces:**
- **Produces:**
  - `db`, a Drizzle client, from `@/db`.
  - `users` and `drafts` tables, plus `type DraftRow`, from `@/db/schema`.
  - `type Mp = { name: string; riding: string; party: string | null; email: string | null; photoUrl: string | null; profileUrl: string | null; hillPhone: string | null; ridingPhone: string | null }` from `@/lib/mp/types`.
  - `type CurrentUser = { id: string; email: string | null; name: string | null }` from `@/lib/users`.
  - `upsertUser(user: CurrentUser): Promise<void>` and `ensureUser(user: CurrentUser): Promise<void>` from `@/lib/users`.
  - `createTestDb()` from `@/test/db`, which resolves to a migrated PGlite Drizzle client.
  - npm scripts `test`, `test:watch`, `db:generate` and `db:migrate`.

- [ ] **Step 1: Check out the branch and install dependencies**

```bash
git checkout platform/auth
npm install @auth0/nextjs-auth0@^4.30.0 drizzle-orm@^0.45.3 postgres@^3.4.9 zod@^4.6.5
npm install -D @types/node@^22 drizzle-kit@^0.31.11 @electric-sql/pglite@^0.5.8 vitest@^5.0.2
```

Expected: both installs finish without an `ERESOLVE` error. Vitest 5 needs `@types/node` 22 or newer, which is why that package is upgraded here.

- [ ] **Step 2: Add the npm scripts**

In `package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.mts`. Vite resolves the `@/*` alias from `tsconfig.json` natively, so no plugin is needed.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Add the MP type and the database schema**

Create `src/lib/mp/types.ts`:

```ts
export type Mp = {
  name: string;
  riding: string;
  party: string | null;
  email: string | null;
  photoUrl: string | null;
  profileUrl: string | null;
  hillPhone: string | null;
  ridingPhone: string | null;
};
```

Create `src/db/schema.ts`:

```ts
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Mp } from "@/lib/mp/types";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id").notNull(),
    storyTitle: text("story_title").notNull(),
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    request: text("request").notNull(),
    mp: jsonb("mp").$type<Mp>(),
    sponsorEmail: text("sponsor_email"),
    sponsorRequestedAt: timestamp("sponsor_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drafts_user_id_idx").on(t.userId)],
);

export type DraftRow = typeof drafts.$inferSelect;
```

Create `drizzle.config.ts`:

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Reads DATABASE_URL from .env.local, the same way `next dev` does.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Step 5: Generate the first migration**

Run: `npx drizzle-kit generate --name init`

Expected output includes:
```
2 tables
drafts 12 columns 1 indexes 1 fks
users 5 columns 0 indexes 0 fks
[✓] Your SQL migration file ➜ drizzle/0000_init.sql 🚀
```

`drizzle/0000_init.sql` must contain `CREATE TABLE "drafts"`, `CREATE TABLE "users"`, the `drafts_user_id_users_id_fk` foreign key with `ON DELETE cascade`, and `CREATE INDEX "drafts_user_id_idx"`.

- [ ] **Step 6: Add the database client and the test database**

Create `src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is required for pooled (PgBouncer-style) connection strings.
const client = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export const db = drizzle({ client, schema });
```

Create `src/test/db.ts`:

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

// An in-process Postgres with the real migrations applied, for route tests.
export async function createTestDb() {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}
```

- [ ] **Step 7: Write the failing test for user rows**

Create `src/lib/users.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUser, upsertUser } from "./users";

vi.mock("@/db", async () => {
  const { createTestDb } = await import("@/test/db");
  return { db: await createTestDb() };
});

const ALICE = { id: "auth0|alice", email: "alice@example.com", name: "Alice" };

beforeEach(async () => {
  await db.delete(users);
});

describe("upsertUser", () => {
  it("creates the row on first login and refreshes it after", async () => {
    await upsertUser(ALICE);
    await upsertUser({ ...ALICE, name: "Alice B." });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: ALICE.id, name: "Alice B." });
  });
});

describe("ensureUser", () => {
  it("creates a missing row and leaves an existing one alone", async () => {
    await ensureUser(ALICE);
    await ensureUser({ ...ALICE, name: "Changed" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice");
  });
});
```

- [ ] **Step 8: Run it and confirm it fails**

Run: `npx vitest run src/lib/users.test.ts`
Expected: FAIL, because `./users` cannot be resolved.

- [ ] **Step 9: Implement user rows**

Create `src/lib/users.ts`:

```ts
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
};

// Called after every login: creates the row the first time, refreshes it after.
export async function upsertUser(user: CurrentUser): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, name: user.name })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email, name: user.name, lastLoginAt: sql`now()` },
    });
}

// Guarantees the row exists before a draft references it.
export async function ensureUser(user: CurrentUser): Promise<void> {
  await db
    .insert(users)
    .values({ id: user.id, email: user.email, name: user.name })
    .onConflictDoNothing();
}
```

- [ ] **Step 10: Run it and confirm it passes**

Run: `npx vitest run src/lib/users.test.ts`
Expected: 2 passed.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.config.mts drizzle.config.ts drizzle src/lib/mp/types.ts src/db src/test src/lib/users.ts src/lib/users.test.ts
git commit -m "platform: add Vitest, Drizzle schema, migration and user rows"
```

---

### Task 2: Auth0 client, requireUser, login gate, and apiFetch

**Branch:** `platform/auth`

**Files:**
- Create: `src/lib/auth0.ts`
- Create: `src/lib/auth.ts`
- Create: `src/proxy.ts`
- Create: `src/lib/apiFetch.ts`
- Create: `.env.example`
- Test: `src/lib/auth0.test.ts`
- Test: `src/lib/auth.test.ts`
- Test: `src/proxy.test.ts`
- Test: `src/lib/apiFetch.test.ts`

**Interfaces:**
- **Consumes:** `upsertUser` and `CurrentUser` from `@/lib/users`, from Task 1.
- **Produces:**
  - From `@/lib/auth0`: `isAuthConfigured(): boolean`, `onCallback: OnCallbackHook`, and `getAuth0(): Auth0Client`.
  - From `@/lib/auth`: `type CurrentUser` (re-exported), `DEV_USER`, `class UnauthorizedError`, `isDevBypass(): boolean`, and `requireUser(): Promise<CurrentUser>`.
  - From `@/proxy`: `proxy(request: NextRequest)` and `config`.
  - From `@/lib/apiFetch`: `class ApiError { status: number; code: string }` and `apiFetch<T>(path: string, options?: { method?: "GET" | "POST" | "PATCH"; body?: unknown }): Promise<T>`.

- [ ] **Step 1: Write the failing test for the post-login hook**

Create `src/lib/auth0.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/auth0.test.ts`
Expected: FAIL, because `./auth0` cannot be resolved.

- [ ] **Step 3: Implement the Auth0 client**

Create `src/lib/auth0.ts`. The client is created lazily, on first use, so the dev bypass never builds one with missing settings. `onCallback` does what the SDK does by default (500 on error, then redirect to `returnTo`), with a user upsert added before the redirect.

```ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { OnCallbackHook } from "@auth0/nextjs-auth0/types";
import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/users";

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH0_DOMAIN);
}

// Runs after Auth0 redirects back: saves the user row, then continues to the page they asked for.
export const onCallback: OnCallbackHook = async (error, ctx, session) => {
  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }
  if (session) {
    try {
      await upsertUser({
        id: session.user.sub,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      });
    } catch (upsertError) {
      console.error("Could not save the user row after login", upsertError);
    }
  }
  const base = ctx.appBaseUrl ?? process.env.APP_BASE_URL;
  if (!base) {
    return new NextResponse("APP_BASE_URL is not set", { status: 500 });
  }
  return NextResponse.redirect(new URL(ctx.returnTo || "/", base));
};

let client: Auth0Client | null = null;

// Created on first use so the dev bypass never builds a client with missing settings.
export function getAuth0(): Auth0Client {
  client ??= new Auth0Client({ onCallback });
  return client;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/auth0.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Write the failing test for requireUser**

Create `src/lib/auth.test.ts`:

```ts
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
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL, because `./auth` cannot be resolved.

- [ ] **Step 7: Implement requireUser and the dev bypass**

Create `src/lib/auth.ts`:

```ts
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
```

- [ ] **Step 8: Run it and confirm it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: 5 passed.

- [ ] **Step 9: Write the failing test for the login gate**

Create `src/proxy.test.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth0, isAuthConfigured } from "@/lib/auth0";
import { proxy } from "./proxy";

vi.mock("@/lib/auth0", () => ({
  isAuthConfigured: vi.fn(),
  getAuth0: vi.fn(),
}));

const authResponse = NextResponse.next({ headers: { "x-from-auth0": "yes" } });
const auth0 = {
  middleware: vi.fn(async () => authResponse),
  getSession: vi.fn(),
};

beforeEach(() => {
  vi.mocked(isAuthConfigured).mockReturnValue(true);
  vi.mocked(getAuth0).mockReturnValue(auth0 as unknown as ReturnType<typeof getAuth0>);
  auth0.getSession.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`);

describe("proxy", () => {
  it("lets Auth0 handle its own routes", async () => {
    const res = await proxy(request("/auth/callback?code=abc"));
    expect(res).toBe(authResponse);
    expect(auth0.getSession).not.toHaveBeenCalled();
  });

  it("passes logged-in requests through Auth0's response", async () => {
    auth0.getSession.mockResolvedValue({ user: { sub: "auth0|alice" } });
    const res = await proxy(request("/petition/new?story=x"));
    expect(res).toBe(authResponse);
  });

  it("redirects logged-out page requests to login, keeping the page to return to", async () => {
    const res = await proxy(request("/petition/new?story=data-fin-buv11-2024"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("returnTo")).toBe("/petition/new?story=data-fin-buv11-2024");
  });

  it("returns 401 JSON for logged-out API requests", async () => {
    const res = await proxy(request("/api/me/drafts"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("lets everything through in development when Auth0 is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "development");
    const res = await proxy(request("/api/me/drafts"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails with 500 in production when Auth0 is not configured", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await proxy(request("/"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 10: Run it and confirm it fails**

Run: `npx vitest run src/proxy.test.ts`
Expected: FAIL, because `./proxy` cannot be resolved.

- [ ] **Step 11: Implement the gate**

Create `src/proxy.ts`. It follows the SDK's documented order: `auth0.middleware()` first, because it serves `/auth/*` and refreshes the rolling session cookie, then the session check.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { isDevBypass } from "@/lib/auth";
import { getAuth0, isAuthConfigured } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (isDevBypass()) return NextResponse.next();
    console.error("Auth0 is not configured");
    return new NextResponse("Auth0 is not configured", { status: 500 });
  }

  const auth0 = getAuth0();
  // Handles /auth/* and keeps the rolling session cookie fresh on every other request.
  const authResponse = await auth0.middleware(request);
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/auth/")) return authResponse;

  const session = await auth0.getSession(request);
  if (session) return authResponse;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/auth/login", request.nextUrl.origin);
  login.searchParams.set("returnTo", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

- [ ] **Step 12: Run it and confirm it passes**

Run: `npx vitest run src/proxy.test.ts`
Expected: 6 passed.

- [ ] **Step 13: Write the failing test for apiFetch**

Create `src/lib/apiFetch.test.ts`:

```ts
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
```

- [ ] **Step 14: Run it and confirm it fails**

Run: `npx vitest run src/lib/apiFetch.test.ts`
Expected: FAIL, because `./apiFetch` cannot be resolved.

- [ ] **Step 15: Implement apiFetch**

Create `src/lib/apiFetch.ts`:

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

type Options = { method?: "GET" | "POST" | "PATCH"; body?: unknown };

/**
 * fetch() for our own API routes. On 401 it sends the browser to login and comes back to
 * the current page afterwards; other failures throw ApiError with the route's error code.
 */
export async function apiFetch<T>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    const returnTo = window.location.pathname + window.location.search;
    // /auth/login is served by the Auth0 proxy, not a Next.js page, so it needs a full navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    // The page is navigating away; never settle so callers don't flash an error.
    return new Promise<T>(() => {});
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (data as { error?: unknown } | null)?.error;
    throw new ApiError(response.status, typeof code === "string" ? code : "server_error");
  }
  return data as T;
}
```

- [ ] **Step 16: Run it and confirm it passes**

Run: `npx vitest run src/lib/apiFetch.test.ts`
Expected: 4 passed.

- [ ] **Step 17: Add `.env.example`**

Create `.env.example`. `.gitignore` ignores `.env*` but keeps `.env.example`.

```
# Auth0: Regular Web Application settings (see spec §10). Leave AUTH0_DOMAIN empty to use the dev bypass locally.
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
# openssl rand -hex 32
AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000

# Pooled Postgres connection string (Tiger Data, Neon or Supabase), or a local database:
# postgres://localhost:5432/wheredoesmytaxgo
DATABASE_URL=
```

Confirm git will track it: `git check-ignore .env.example` should print nothing.

- [ ] **Step 18: Run the whole suite and lint**

Run: `npm test && npm run lint`
Expected: 21 passed, and no lint errors.

- [ ] **Step 19: Commit**

```bash
git add src/lib/auth0.ts src/lib/auth0.test.ts src/lib/auth.ts src/lib/auth.test.ts src/proxy.ts src/proxy.test.ts src/lib/apiFetch.ts src/lib/apiFetch.test.ts .env.example
git commit -m "platform: add Auth0 login gate, requireUser with dev bypass, and apiFetch"
```

---

### Task 3: Drafts API

**Branch:** `platform/auth`

**Files:**
- Create: `src/lib/petition.ts`
- Create: `src/lib/http.ts`
- Create: `src/lib/drafts.ts`
- Create: `src/app/api/me/drafts/route.ts`
- Create: `src/app/api/me/drafts/[id]/route.ts`
- Test: `src/app/api/me/drafts/route.test.ts`

**Interfaces:**
- **Consumes:** `db` and `drafts`/`DraftRow` (Task 1). `requireUser`, `UnauthorizedError` and `CurrentUser` (Task 2). `ensureUser` (Task 1). `Mp` (Task 1).
- **Produces:**
  - From `@/lib/petition`, all browser-safe:
    - `REQUEST_PREFIX` and `LIMITS = { title: 250, issue: 4000, request: 2000, sponsorEmail: 5000 }`
    - `mpSchema`, `createDraftSchema` and `updateDraftSchema`
    - `type CreateDraftInput`, `type UpdateDraftInput`, and `type Draft = { id, storyId, storyTitle, title, issue, request, mp: Mp | null, sponsorEmail: string | null, sponsorRequestedAt: string | null, createdAt: string, updatedAt: string }`
    - `fullRequest(request: string): string`
  - From `@/lib/drafts`: `createDraft(userId, input)`, `listDrafts(userId)`, `getDraft(userId, id): Promise<Draft | null>` and `updateDraft(userId, id, patch): Promise<Draft | null>`.
  - From `@/lib/http`: `jsonError(code, status)`, `handleRouteError(error)` and `readJson(request)`.
  - Routes: `POST`/`GET` for `/api/me/drafts`, and `GET`/`PATCH` for `/api/me/drafts/:id`.

- [ ] **Step 1: Add the browser-safe petition module**

Create `src/lib/petition.ts`:

```ts
import { z } from "zod";
import type { Mp } from "@/lib/mp/types";

export const REQUEST_PREFIX = "We, the undersigned, call upon the Government of Canada to";

export const LIMITS = {
  title: 250,
  issue: 4000,
  request: 2000,
  sponsorEmail: 5000,
} as const;

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const mpSchema = z.object({
  name: z.string().min(1),
  riding: z.string().min(1),
  party: z.string().nullable(),
  email: z.string().nullable(),
  photoUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  hillPhone: z.string().nullable(),
  ridingPhone: z.string().nullable(),
});

export const createDraftSchema = z.object({
  storyId: z.string().min(1).max(200),
  storyTitle: z.string().min(1).max(500),
  title: requiredText(LIMITS.title),
  issue: requiredText(LIMITS.issue),
  request: requiredText(LIMITS.request),
});

export const updateDraftSchema = z.object({
  title: requiredText(LIMITS.title).optional(),
  issue: requiredText(LIMITS.issue).optional(),
  request: requiredText(LIMITS.request).optional(),
  mp: mpSchema.optional(),
  sponsorEmail: z.string().max(LIMITS.sponsorEmail).nullable().optional(),
  sponsorRequested: z.literal(true).optional(),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;

export type Draft = {
  id: string;
  storyId: string;
  storyTitle: string;
  title: string;
  issue: string;
  request: string;
  mp: Mp | null;
  sponsorEmail: string | null;
  sponsorRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fullRequest(request: string): string {
  return `${REQUEST_PREFIX} ${request}`;
}
```

- [ ] **Step 2: Add the route-handler helpers**

Create `src/lib/http.ts`:

```ts
import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";

export function jsonError(code: string, status: number): NextResponse {
  return NextResponse.json({ error: code }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) return jsonError("unauthorized", 401);
  console.error(error);
  return jsonError("server_error", 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Write the failing route tests**

Create `src/app/api/me/drafts/route.test.ts`. It runs the real handlers against PGlite, and mocks only `requireUser`.

```ts
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
```

- [ ] **Step 4: Run them and confirm they fail**

Run: `npx vitest run src/app/api/me/drafts`
Expected: FAIL, because `./[id]/route` and `./route` cannot be resolved.

- [ ] **Step 5: Implement the draft queries**

Create `src/lib/drafts.ts`:
- `updatedAt` and `sponsorRequestedAt` use `sql\`now()\``, not `new Date()`. Every timestamp then comes from the Postgres clock, which keeps the list order reliable.
- Malformed IDs return `null` before querying. Postgres would otherwise throw on an invalid UUID.

```ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, type DraftRow } from "@/db/schema";
import type { CreateDraftInput, Draft, UpdateDraftInput } from "@/lib/petition";

function toDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    storyId: row.storyId,
    storyTitle: row.storyTitle,
    title: row.title,
    issue: row.issue,
    request: row.request,
    mp: row.mp ?? null,
    sponsorEmail: row.sponsorEmail,
    sponsorRequestedAt: row.sponsorRequestedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Postgres rejects malformed UUIDs with an error, so treat them as "not found" up front.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createDraft(userId: string, input: CreateDraftInput): Promise<Draft> {
  const [row] = await db
    .insert(drafts)
    .values({ userId, ...input })
    .returning();
  return toDraft(row);
}

export async function listDrafts(userId: string): Promise<Draft[]> {
  const rows = await db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, userId))
    .orderBy(desc(drafts.updatedAt));
  return rows.map(toDraft);
}

export async function getDraft(userId: string, id: string): Promise<Draft | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)));
  return row ? toDraft(row) : null;
}

export async function updateDraft(
  userId: string,
  id: string,
  patch: UpdateDraftInput,
): Promise<Draft | null> {
  if (!UUID.test(id)) return null;
  const { sponsorRequested, ...fields } = patch;
  const [row] = await db
    .update(drafts)
    .set({
      ...fields,
      ...(sponsorRequested ? { sponsorRequestedAt: sql`now()` } : {}),
      updatedAt: sql`now()`,
    })
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)))
    .returning();
  return row ? toDraft(row) : null;
}
```

- [ ] **Step 6: Implement the routes**

Create `src/app/api/me/drafts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDraft, listDrafts } from "@/lib/drafts";
import { createDraftSchema } from "@/lib/petition";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { ensureUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = createDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await ensureUser(user);
    const draft = await createDraft(user.id, parsed.data);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listDrafts(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
```

Create `src/app/api/me/drafts/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDraft, updateDraft } from "@/lib/drafts";
import { updateDraftSchema } from "@/lib/petition";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const draft = await getDraft(user.id, (await params).id);
    if (!draft) return jsonError("not_found", 404);
    return NextResponse.json(draft);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const parsed = updateDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    const draft = await updateDraft(user.id, (await params).id, parsed.data);
    if (!draft) return jsonError("not_found", 404);
    return NextResponse.json(draft);
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 7: Run them and confirm they pass**

Run: `npx vitest run src/app/api/me/drafts`
Expected: 14 passed.

- [ ] **Step 8: Run the whole suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: 35 passed, and no lint errors. The build succeeds **without** any Auth0 or database settings, and its route list includes `ƒ /api/me/drafts`, `ƒ /api/me/drafts/[id]` and `ƒ Proxy (Middleware)`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/petition.ts src/lib/http.ts src/lib/drafts.ts src/app/api/me
git commit -m "platform: add drafts API backed by Postgres"
```

- [ ] **Step 10: Checkpoint.** Tell Muktar that `platform/auth` is ready. Ask whether to push it and open a pull request into `greatnnaji/hack-the-hill-iii`. Do not push without a yes.

---

### Task 4: MP lookup and search

**Branch:** `platform/mp-lookup`, created from `platform/auth`

**Files:**
- Create: `src/lib/mp/postal.ts`
- Create: `src/lib/mp/represent.ts`
- Create: `src/lib/mp/__fixtures__/postcode-K1P1A4.json`
- Create: `src/lib/mp/search.ts`
- Create: `src/app/api/mp/route.ts`
- Create: `src/app/api/mps/route.ts`
- Test: `src/lib/mp/postal.test.ts`
- Test: `src/lib/mp/represent.test.ts`
- Test: `src/lib/mp/search.test.ts`
- Test: `src/app/api/mp/route.test.ts`

**Interfaces:**
- **Consumes:** `Mp` (Task 1). `requireUser` and `UnauthorizedError` (Task 2). `jsonError` and `handleRouteError` (Task 3).
- **Produces:**
  - From `@/lib/mp/postal`, browser-safe: `normalizePostal(input: string): string | null` and `formatPostal(code: string): string`.
  - From `@/lib/mp/represent`, server-side: `type RepresentRep`, `class LookupError`, `toMp(rep)`, `pickMp(body)`, `lookupMpByPostal(code): Promise<Mp | null>` and `listAllMps(): Promise<Mp[]>`.
  - From `@/lib/mp/search`: `MAX_RESULTS = 20` and `searchMps(mps: Mp[], query: string): Mp[]`.
  - Routes: `GET /api/mp?postal=` and `GET /api/mps?q=`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b platform/mp-lookup platform/auth
```

- [ ] **Step 2: Write the failing postal test**

Create `src/lib/mp/postal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatPostal, normalizePostal } from "./postal";

describe("normalizePostal", () => {
  it("uppercases and removes spaces", () => {
    expect(normalizePostal(" k1p 1a4 ")).toBe("K1P1A4");
  });

  it("rejects codes that are not A1A1A1", () => {
    expect(normalizePostal("K1P1A")).toBeNull();
    expect(normalizePostal("11P1A4")).toBeNull();
    expect(normalizePostal("")).toBeNull();
  });
});

describe("formatPostal", () => {
  it("adds the middle space", () => {
    expect(formatPostal("K1P1A4")).toBe("K1P 1A4");
  });
});
```

Run: `npx vitest run src/lib/mp/postal.test.ts`
Expected: FAIL, because `./postal` cannot be resolved.

- [ ] **Step 3: Implement postal helpers**

Create `src/lib/mp/postal.ts`:

```ts
/** Uppercases and strips spaces; returns null unless the result looks like A1A1A1. */
export function normalizePostal(input: string): string | null {
  const code = input.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code) ? code : null;
}

/** "K1P1A4" -> "K1P 1A4" */
export function formatPostal(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
```

Run: `npx vitest run src/lib/mp/postal.test.ts`
Expected: 3 passed.

- [ ] **Step 4: Add the Represent fixture**

Create `src/lib/mp/__fixtures__/postcode-K1P1A4.json`. It is a trimmed copy of the real response from `https://represent.opennorth.ca/postcodes/K1P1A4/`:
- The MPP is listed first on purpose, to prove the MP is picked by office and not by position.
- The councillor keeps its empty `party_name` and `photo_url` values, to test turning empty strings into `null`.

```json
{
  "code": "K1P1A4",
  "representatives_centroid": [
    {
      "name": "Catherine McKenney",
      "district_name": "Ottawa Centre",
      "elected_office": "MPP",
      "party_name": "New Democratic Party of Ontario",
      "email": "cmckenney-co@ndp.on.ca",
      "photo_url": "https://www.ola.org/sites/default/files/member/profile-photo/Catherine-McKenney.jpg",
      "url": "https://www.ola.org/en/members/all/catherine-mckenney",
      "offices": [
        { "type": "legislature", "tel": "1 416 325-0071" },
        { "type": "constituency", "tel": "1 613 722-6414" }
      ]
    },
    {
      "name": "Yasir Naqvi",
      "district_name": "Ottawa Centre",
      "elected_office": "MP",
      "party_name": "Liberal",
      "email": "yasir.naqvi@parl.gc.ca",
      "photo_url": "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/NaqviYasir_Lib.jpg",
      "url": "https://www.ourcommons.ca/Members/en/yasir-naqvi(110572)",
      "offices": [
        { "type": "legislature", "tel": "1 613 996-5322" },
        { "type": "constituency", "tel": "1 613 946-8682" }
      ]
    },
    {
      "name": "Ariel Troster",
      "district_name": "Somerset",
      "elected_office": "Councillor",
      "party_name": "",
      "email": "Ariel.Troster@ottawa.ca",
      "photo_url": "",
      "url": "https://ottawa.ca/en/city-hall/mayor-and-city-councillors/ariel-troster-councillor-ward-14-somerset",
      "offices": [{ "type": "legislature", "tel": "1 613 580-2484" }]
    }
  ]
}
```

- [ ] **Step 5: Write the failing Represent test**

Create `src/lib/mp/represent.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import postcodeFixture from "./__fixtures__/postcode-K1P1A4.json";
import { listAllMps, LookupError, lookupMpByPostal, pickMp, toMp } from "./represent";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("pickMp", () => {
  it("returns the federal MP, skipping provincial and municipal members", () => {
    expect(pickMp(postcodeFixture)).toEqual({
      name: "Yasir Naqvi",
      riding: "Ottawa Centre",
      party: "Liberal",
      email: "yasir.naqvi@parl.gc.ca",
      photoUrl:
        "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/NaqviYasir_Lib.jpg",
      profileUrl: "https://www.ourcommons.ca/Members/en/yasir-naqvi(110572)",
      hillPhone: "1 613 996-5322",
      ridingPhone: "1 613 946-8682",
    });
  });

  it("returns null when there is no MP", () => {
    expect(pickMp({ representatives_centroid: [] })).toBeNull();
    expect(pickMp({})).toBeNull();
  });
});

describe("toMp", () => {
  it("turns empty strings and missing offices into null", () => {
    const councillor = postcodeFixture.representatives_centroid[2];
    expect(toMp({ ...councillor, offices: undefined })).toMatchObject({
      party: null,
      photoUrl: null,
      hillPhone: null,
      ridingPhone: null,
    });
  });
});

describe("lookupMpByPostal", () => {
  it("fetches the postcode and returns the MP", async () => {
    const fetchMock = stubFetch(Response.json(postcodeFixture));
    const mp = await lookupMpByPostal("K1P1A4");
    expect(mp?.name).toBe("Yasir Naqvi");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://represent.opennorth.ca/postcodes/K1P1A4/",
      expect.objectContaining({ next: { revalidate: 86400 } }),
    );
  });

  it("returns null when Represent does not know the postcode", async () => {
    stubFetch(new Response("Not found", { status: 404 }));
    expect(await lookupMpByPostal("Z9Z9Z9")).toBeNull();
  });

  it("throws LookupError on a server error", async () => {
    stubFetch(new Response("oops", { status: 503 }));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
  });

  it("throws LookupError on a timeout or network failure", async () => {
    stubFetch(new DOMException("timed out", "TimeoutError"));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
  });
});

describe("listAllMps", () => {
  it("maps every House of Commons member", async () => {
    stubFetch(Response.json({ objects: [postcodeFixture.representatives_centroid[1]], meta: {} }));
    const mps = await listAllMps();
    expect(mps).toHaveLength(1);
    expect(mps[0].riding).toBe("Ottawa Centre");
  });
});
```

Run: `npx vitest run src/lib/mp/represent.test.ts`
Expected: FAIL, because `./represent` cannot be resolved.

- [ ] **Step 6: Implement the Represent client**

Create `src/lib/mp/represent.ts`:

```ts
import type { Mp } from "@/lib/mp/types";

const REPRESENT_BASE = "https://represent.opennorth.ca";
const TIMEOUT_MS = 8000;
const ONE_DAY_SECONDS = 86400;

type RepresentOffice = { type?: string | null; tel?: string | null };

export type RepresentRep = {
  name: string;
  district_name: string;
  elected_office: string;
  party_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  url?: string | null;
  offices?: RepresentOffice[] | null;
};

export class LookupError extends Error {
  constructor() {
    super("lookup_failed");
    this.name = "LookupError";
  }
}

function orNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

function officePhone(rep: RepresentRep, type: string): string | null {
  return orNull(rep.offices?.find((office) => office.type === type)?.tel);
}

export function toMp(rep: RepresentRep): Mp {
  return {
    name: rep.name,
    riding: rep.district_name,
    party: orNull(rep.party_name),
    email: orNull(rep.email),
    photoUrl: orNull(rep.photo_url),
    profileUrl: orNull(rep.url),
    hillPhone: officePhone(rep, "legislature"),
    ridingPhone: officePhone(rep, "constituency"),
  };
}

/** Picks the federal MP out of a /postcodes/ response. */
export function pickMp(body: { representatives_centroid?: RepresentRep[] }): Mp | null {
  const rep = body.representatives_centroid?.find((r) => r.elected_office === "MP");
  return rep ? toMp(rep) : null;
}

/** GETs a Represent path. Returns null on 404; throws LookupError on anything else that isn't 200. */
async function getRepresent<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${REPRESENT_BASE}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: ONE_DAY_SECONDS },
    });
  } catch {
    throw new LookupError();
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new LookupError();
  return (await response.json()) as T;
}

export async function lookupMpByPostal(code: string): Promise<Mp | null> {
  const body = await getRepresent<{ representatives_centroid?: RepresentRep[] }>(
    `/postcodes/${code}/`,
  );
  return body ? pickMp(body) : null;
}

export async function listAllMps(): Promise<Mp[]> {
  const body = await getRepresent<{ objects: RepresentRep[] }>(
    "/representatives/house-of-commons/?limit=500",
  );
  if (!body) throw new LookupError();
  return body.objects.map(toMp);
}
```

Run: `npx vitest run src/lib/mp/represent.test.ts`
Expected: 8 passed.

- [ ] **Step 7: Write the failing search test**

Create `src/lib/mp/search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Mp } from "./types";
import { MAX_RESULTS, searchMps } from "./search";

function mp(name: string, riding: string): Mp {
  return {
    name,
    riding,
    party: null,
    email: null,
    photoUrl: null,
    profileUrl: null,
    hillPhone: null,
    ridingPhone: null,
  };
}

const MPS = [
  mp("Yasir Naqvi", "Ottawa Centre"),
  mp("Jim Bélanger", "Sudbury East—Manitoulin—Nickel Belt"),
  mp("Élisabeth Brière", "Sherbrooke"),
];

describe("searchMps", () => {
  it("matches names case-insensitively", () => {
    expect(searchMps(MPS, "NAQVI").map((m) => m.name)).toEqual(["Yasir Naqvi"]);
  });

  it("ignores accents in either direction", () => {
    expect(searchMps(MPS, "belanger").map((m) => m.name)).toEqual(["Jim Bélanger"]);
    expect(searchMps(MPS, "élisabeth").map((m) => m.name)).toEqual(["Élisabeth Brière"]);
  });

  it("matches ridings", () => {
    expect(searchMps(MPS, "sherbrooke").map((m) => m.name)).toEqual(["Élisabeth Brière"]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchMps(MPS, "   ")).toEqual([]);
  });

  it("caps results", () => {
    const many = Array.from({ length: 30 }, (_, i) => mp(`Member ${i}`, "Somewhere"));
    expect(searchMps(many, "member")).toHaveLength(MAX_RESULTS);
  });
});
```

Run: `npx vitest run src/lib/mp/search.test.ts`
Expected: FAIL, because `./search` cannot be resolved.

- [ ] **Step 8: Implement search**

Create `src/lib/mp/search.ts`. It strips accents with a `[\u0300-\u036f]` range, not `\p{Diacritic}`, because the tsconfig targets ES2017.

```ts
import type { Mp } from "@/lib/mp/types";

export const MAX_RESULTS = 20;

/** Lowercases and strips accents so "belanger" matches "Bélanger". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function searchMps(mps: Mp[], query: string): Mp[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  return mps
    .filter((mp) => fold(mp.name).includes(needle) || fold(mp.riding).includes(needle))
    .slice(0, MAX_RESULTS);
}
```

Run: `npx vitest run src/lib/mp/search.test.ts`
Expected: 5 passed.

- [ ] **Step 9: Write the failing route tests**

Create `src/app/api/mp/route.test.ts`. It covers both `/api/mp` and `/api/mps`.

```ts
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
```

Run: `npx vitest run src/app/api/mp`
Expected: FAIL, because `./route` and `../mps/route` cannot be resolved.

- [ ] **Step 10: Implement the routes**

Create `src/app/api/mp/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { normalizePostal } from "@/lib/mp/postal";
import { LookupError, lookupMpByPostal } from "@/lib/mp/represent";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const code = normalizePostal(request.nextUrl.searchParams.get("postal") ?? "");
    if (!code) return jsonError("invalid_postal", 400);
    const mp = await lookupMpByPostal(code);
    if (!mp) return jsonError("not_found", 404);
    return NextResponse.json(mp);
  } catch (error) {
    if (error instanceof LookupError) return jsonError("lookup_failed", 502);
    return handleRouteError(error);
  }
}
```

Create `src/app/api/mps/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { LookupError, listAllMps } from "@/lib/mp/represent";
import { searchMps } from "@/lib/mp/search";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (query.length < 2 || query.length > 100) return jsonError("invalid_query", 400);
    return NextResponse.json(searchMps(await listAllMps(), query));
  } catch (error) {
    if (error instanceof LookupError) return jsonError("lookup_failed", 502);
    return handleRouteError(error);
  }
}
```

Run: `npx vitest run src/app/api/mp`
Expected: 8 passed.

- [ ] **Step 11: Run the whole suite and lint**

Run: `npm test && npm run lint`
Expected: 59 passed, and no lint errors.

- [ ] **Step 12: Commit**

```bash
git add src/lib/mp src/app/api/mp src/app/api/mps
git commit -m "platform: add MP lookup by postal code and MP search via Represent"
```

---

### Task 5: Sponsor email builder

**Branch:** `platform/mp-lookup`

**Files:**
- Create: `src/lib/mp/sponsorEmail.ts`
- Test: `src/lib/mp/sponsorEmail.test.ts`

**Interfaces:**
- **Consumes:** `formatPostal` (Task 4). `Mp` (Task 1). `fullRequest` (Task 3).
- **Produces:** from `@/lib/mp/sponsorEmail`, all browser-safe:
  - `buildLetter({ mp: Pick<Mp, "name" | "riding">, title: string, postalCode?: string | null }): string`
  - `buildEmail({ letter: string, petition: { title, issue, request } }): { subject: string; body: string }`
  - `type ComposeLinks = { gmail: string; outlook: string; mailto: string }`
  - `composeLinks({ to, subject, body }): ComposeLinks`

- [ ] **Step 1: Write the failing test**

Create `src/lib/mp/sponsorEmail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildEmail, buildLetter, composeLinks } from "./sponsorEmail";

const MP = { name: "Yasir Naqvi", riding: "Ottawa Centre" };
const PETITION = {
  title: "Review the use of executive aircraft",
  issue: "Whereas the Government spent $42 million;",
  request: "publish per-trip costs.",
};

describe("buildLetter", () => {
  it("writes as a constituent when the MP came from the user's postal code", () => {
    const letter = buildLetter({ mp: MP, title: PETITION.title, postalCode: "K1P1A4" });
    expect(letter).toBe(
      [
        "Dear Yasir Naqvi,",
        "",
        `I'm a constituent in Ottawa Centre. I've drafted an e-petition, "Review the use of executive aircraft," and I'm asking you to authorize it for publication on the House of Commons website.`,
        "",
        "Sponsoring does not mean you endorse it. It allows constituents to sign and, with 500 signatures, have it presented in the House.",
        "",
        "Thank you,",
        "[Your name], K1P 1A4",
      ].join("\n"),
    );
  });

  it("does not claim to be a constituent without a postal code", () => {
    const letter = buildLetter({ mp: MP, title: PETITION.title });
    expect(letter).not.toContain("constituent in");
    expect(letter).toContain("[Your name], [Postal code]");
  });
});

describe("buildEmail", () => {
  it("puts the full petition text under the letter", () => {
    const { subject, body } = buildEmail({ letter: "Dear MP,", petition: PETITION });
    expect(subject).toBe("Request to sponsor an e-petition: Review the use of executive aircraft");
    expect(body).toBe(
      [
        "Dear MP,",
        "",
        "---",
        "",
        "Review the use of executive aircraft",
        "",
        "Whereas the Government spent $42 million;",
        "",
        "We, the undersigned, call upon the Government of Canada to publish per-trip costs.",
      ].join("\n"),
    );
  });
});

describe("composeLinks", () => {
  const links = composeLinks({ to: "mp@parl.gc.ca", subject: "A & B", body: "Line 1\nLine 2" });

  it("builds a Gmail compose link", () => {
    expect(links.gmail).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=mp%40parl.gc.ca&su=A%20%26%20B&body=Line%201%0ALine%202",
    );
  });

  it("builds an Outlook web compose link", () => {
    expect(links.outlook).toBe(
      "https://outlook.live.com/mail/0/deeplink/compose?to=mp%40parl.gc.ca&subject=A%20%26%20B&body=Line%201%0ALine%202",
    );
  });

  it("builds a mailto link", () => {
    expect(links.mailto).toBe("mailto:mp@parl.gc.ca?subject=A%20%26%20B&body=Line%201%0ALine%202");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/mp/sponsorEmail.test.ts`
Expected: FAIL, because `./sponsorEmail` cannot be resolved.

- [ ] **Step 3: Implement the builder**

Create `src/lib/mp/sponsorEmail.ts`. `postalCode` is set only when the MP came from the user's own postal code (see "Differences from the spec" #1).

```ts
import { formatPostal } from "@/lib/mp/postal";
import type { Mp } from "@/lib/mp/types";
import { fullRequest } from "@/lib/petition";

type LetterInput = {
  mp: Pick<Mp, "name" | "riding">;
  title: string;
  /** Normalised postal code ("K1P1A4"). Only set when the MP was found from the user's own postal code. */
  postalCode?: string | null;
};

export function buildLetter({ mp, title, postalCode }: LetterInput): string {
  const intro = postalCode
    ? `I'm a constituent in ${mp.riding}. I've drafted an e-petition, "${title}," and I'm asking you to authorize it for publication on the House of Commons website.`
    : `I've drafted an e-petition, "${title}," and I'm asking you to authorize it for publication on the House of Commons website.`;
  return [
    `Dear ${mp.name},`,
    "",
    intro,
    "",
    "Sponsoring does not mean you endorse it. It allows constituents to sign and, with 500 signatures, have it presented in the House.",
    "",
    "Thank you,",
    `[Your name], ${postalCode ? formatPostal(postalCode) : "[Postal code]"}`,
  ].join("\n");
}

type PetitionText = { title: string; issue: string; request: string };

export function buildEmail({ letter, petition }: { letter: string; petition: PetitionText }) {
  return {
    subject: `Request to sponsor an e-petition: ${petition.title}`,
    body: [letter, "", "---", "", petition.title, "", petition.issue, "", fullRequest(petition.request)].join(
      "\n",
    ),
  };
}

export type ComposeLinks = { gmail: string; outlook: string; mailto: string };

export function composeLinks({ to, subject, body }: { to: string; subject: string; body: string }): ComposeLinks {
  const e = encodeURIComponent;
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`,
    mailto: `mailto:${to}?subject=${e(subject)}&body=${e(body)}`,
  };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/mp/sponsorEmail.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Run the whole suite, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: 65 passed, no lint errors, and a successful build that lists `ƒ /api/mp` and `ƒ /api/mps`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mp/sponsorEmail.ts src/lib/mp/sponsorEmail.test.ts
git commit -m "platform: add sponsor letter, email and compose-link builders"
```

- [ ] **Step 7: Checkpoint.** Tell Muktar that `platform/mp-lookup` is ready. Ask whether to push it and open a pull request. Do not push without a yes.

---

### Task 6: Stories, page shell, and step 1 (Write your petition)

**Branch:** `platform/draft-deploy`, created from `platform/mp-lookup`

**Files:**
- Create: `src/lib/stories.ts`
- Test: `src/lib/stories.test.ts`
- Modify: `src/app/globals.css`, adding colour tokens after `@import "tailwindcss";`
- Create: `src/app/petition/layout.tsx`
- Create: `src/app/petition/loadDraft.ts`
- Create: `src/app/petition/_components/StepHeader.tsx`
- Create: `src/app/petition/_components/ProcessExplainer.tsx`
- Create: `src/app/petition/_components/PetitionForm.tsx`
- Create: `src/app/petition/new/page.tsx`
- Create: `src/app/petition/[id]/page.tsx`
- Create: `src/app/dev/petition/page.tsx`

**Interfaces:**
- **Consumes:**
  - `apiFetch` (Task 2).
  - `LIMITS`, `REQUEST_PREFIX`, `Draft` and `fullRequest` (Task 3).
  - `requireUser` (Task 2).
  - `getDraft` (Task 3).
  - Great's `pipeline/stories.json`, 18 stories in the shared story shape.
- **Produces:**
  - From `@/lib/stories`: `type Story`, `listStories(): Promise<Story[]>` and `getStory(id): Promise<Story | null>`.
  - `loadDraft(params: Promise<{ id: string }>): Promise<Draft>`, which calls `notFound()` when the draft is missing.
  - `StepHeader({ step: 1 | 2 | 3, backHref: string })`.
  - `ProcessExplainer()`.
  - `PetitionForm({ story: { id, title }, draft?: Draft })`, which saves and then navigates to `/petition/<id>/sponsor`.
  - Tailwind colours: `paper`, `canvas`, `ink`, `muted`, `line`, `accent` and `danger`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b platform/draft-deploy platform/mp-lookup
```

- [ ] **Step 2: Write the failing stories test**

Create `src/lib/stories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getStory, listStories } from "./stories";

describe("stories", () => {
  it("lists the pipeline stories", async () => {
    const stories = await listStories();
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), title: expect.any(String) }),
    );
  });

  it("finds a story by id", async () => {
    const [first] = await listStories();
    expect(await getStory(first.id)).toEqual(first);
  });

  it("returns null for an unknown id", async () => {
    expect(await getStory("no-such-story")).toBeNull();
  });
});
```

Run: `npx vitest run src/lib/stories.test.ts`
Expected: FAIL, because `./stories` cannot be resolved.

- [ ] **Step 3: Implement stories**

Create `src/lib/stories.ts`:

```ts
import storiesData from "../../pipeline/stories.json";

// Shared story shape from TASKS.md. Read from Great's pipeline output until Raphael's
// GET /spending/:id exists; then only these two functions change.
export type Story = {
  id: string;
  title: string;
  summary: string;
  amount: number;
  date: string;
  fiscal_year: string;
  department: string;
  dept_code: string;
  program_code: string | null;
  source_type: "data" | "news";
  level: "federal" | "provincial";
  sources: { label: string; url: string }[];
  image_url: string | null;
  petition: {
    number: string;
    title: string;
    signatures: number;
    closes: string;
    url: string;
  } | null;
};

const stories = storiesData as Story[];

export async function listStories(): Promise<Story[]> {
  return stories;
}

export async function getStory(id: string): Promise<Story | null> {
  return stories.find((story) => story.id === id) ?? null;
}
```

Run: `npx vitest run src/lib/stories.test.ts`
Expected: 3 passed.

- [ ] **Step 4: Add the colour tokens**

In `src/app/globals.css`, insert this directly after the first line, `@import "tailwindcss";`:

```css

/* Colours from the wireframe. Izu can replace these with the final design tokens. */
@theme {
  --color-paper: #faf9f6;
  --color-canvas: #eceae5;
  --color-ink: #1c1b19;
  --color-muted: #6b6862;
  --color-line: #dcd9d2;
  --color-accent: #1f6f4a;
  --color-danger: #b42318;
}
```

- [ ] **Step 5: Add the page shell and the draft loader**

Create `src/app/petition/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Start a petition · wheredoesmytaxgo" };

export default function PetitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 lg:py-10">{children}</div>
    </div>
  );
}
```

Create `src/app/petition/loadDraft.ts`:

```ts
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDraft } from "@/lib/drafts";
import type { Draft } from "@/lib/petition";

/** Loads one of the current user's drafts for a page, or shows the not-found page. */
export async function loadDraft(params: Promise<{ id: string }>): Promise<Draft> {
  const { id } = await params;
  const user = await requireUser();
  const draft = await getDraft(user.id, id);
  if (!draft) notFound();
  return draft;
}
```

- [ ] **Step 6: Add the shared step components**

Create `src/app/petition/_components/StepHeader.tsx`:

```tsx
import Link from "next/link";

type Props = { step: 1 | 2 | 3; backHref: string };

export function StepHeader({ step, backHref }: Props) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between text-sm">
        <Link href={backHref} className="text-muted hover:text-ink">
          {step === 1 ? "Cancel" : "← Back"}
        </Link>
        <span className="text-muted">Step {step} of 3</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 rounded-full ${n <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
    </header>
  );
}
```

Create `src/app/petition/_components/ProcessExplainer.tsx`. The wording is from the wireframe.

```tsx
const STEPS = [
  { title: "Draft", detail: "Write the issue and request (you are here)." },
  { title: "5 supporters", detail: "Five people confirm by email before it goes to an MP." },
  { title: "MP sponsor", detail: "An MP authorizes it. Without one it can't be published." },
  { title: "Open for 120 days", detail: "Anyone in Canada can sign on ourcommons.ca." },
  { title: "500 signatures", detail: "Reaching 500 means it will be presented in the House." },
  { title: "Government response", detail: "Required within 45 days of being tabled." },
];

export function ProcessExplainer() {
  return (
    <aside className="rounded-xl border border-line bg-paper p-5 lg:sticky lg:top-8">
      <h2 className="text-sm font-semibold">How a House of Commons e-petition works</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                i === 0 ? "bg-ink text-paper" : "bg-line text-muted"
              }`}
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
```

- [ ] **Step 7: Add the step 1 form**

Create `src/app/petition/_components/PetitionForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { LIMITS, REQUEST_PREFIX, type Draft } from "@/lib/petition";

type Field = "title" | "issue" | "request";
type Props = { story: { id: string; title: string }; draft?: Draft };

const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const field of ["title", "issue", "request"] as const) {
    const value = values[field].trim();
    if (!value || (field === "issue" && value === "Whereas")) {
      errors[field] = "This is required.";
    } else if (value.length > LIMITS[field]) {
      errors[field] = `Keep this under ${LIMITS[field]} characters.`;
    }
  }
  return errors;
}

export function PetitionForm({ story, draft }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    title: draft?.title ?? "",
    issue: draft?.issue ?? "Whereas ",
    request: draft?.request ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = draft
        ? await apiFetch<Draft>(`/api/me/drafts/${draft.id}`, { method: "PATCH", body: values })
        : await apiFetch<Draft>("/api/me/drafts", {
            method: "POST",
            body: { storyId: story.id, storyTitle: story.title, ...values },
          });
      router.push(`/petition/${saved.id}/sponsor`);
    } catch {
      setSaveError("We couldn't save your draft. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-2xl font-semibold">Write your petition</h1>
      <p className="mt-1 text-sm text-muted">
        Linked to: <span className="font-medium text-ink">{story.title}</span>
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold">Title</span>
        <input className={inputClass} value={values.title} onChange={set("title")} />
      </label>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-danger">{errors.title}</span>
        <span className="text-muted">
          {values.title.length} / {LIMITS.title}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">The issue</span>
        <span className="block text-xs text-muted">
          State facts, not opinions. Each point starts with &ldquo;Whereas&rdquo;.
        </span>
        <textarea className={`${inputClass} min-h-32`} value={values.issue} onChange={set("issue")} />
      </label>
      <p className="mt-1 text-xs text-danger">{errors.issue}</p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Requested action</span>
        <span className="block text-xs text-muted">{REQUEST_PREFIX}…</span>
        <textarea className={`${inputClass} min-h-24`} value={values.request} onChange={set("request")} />
      </label>
      <p className="mt-1 text-xs text-danger">{errors.request}</p>

      {saveError && <p className="mt-4 text-sm text-danger">{saveError}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
      >
        {saving ? "Saving…" : "Next: find an MP sponsor"}
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Add the step 1 pages and the dev stories page**

Create `src/app/petition/new/page.tsx`:

```tsx
import Link from "next/link";
import { getStory } from "@/lib/stories";
import { PetitionForm } from "../_components/PetitionForm";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { searchParams: Promise<{ story?: string | string[] }> };

export default async function NewPetitionPage({ searchParams }: Props) {
  const { story: storyId } = await searchParams;
  const story = typeof storyId === "string" ? await getStory(storyId) : null;

  if (!story) {
    return (
      <main>
        <h1 className="text-xl font-semibold">We couldn&rsquo;t find that spending story</h1>
        <Link href="/dev/petition" className="mt-4 inline-block text-sm text-accent underline">
          Back to spending
        </Link>
      </main>
    );
  }

  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm story={{ id: story.id, title: story.title }} />
        <ProcessExplainer />
      </div>
    </main>
  );
}
```

Create `src/app/petition/[id]/page.tsx`:

```tsx
import { loadDraft } from "../loadDraft";
import { PetitionForm } from "../_components/PetitionForm";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function EditPetitionPage({ params }: Props) {
  const draft = await loadDraft(params);
  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm story={{ id: draft.storyId, title: draft.storyTitle }} draft={draft} />
        <ProcessExplainer />
      </div>
    </main>
  );
}
```

Create `src/app/dev/petition/page.tsx`:

```tsx
import Link from "next/link";
import { listStories } from "@/lib/stories";

// Stand-in for Izu's spending feed (screen 04) until it exists.
export default async function DevPetitionPage() {
  const stories = await listStories();
  const money = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto max-w-[1040px]">
        <p className="text-xs uppercase tracking-wide text-muted">Developer page</p>
        <h1 className="mt-1 text-2xl font-semibold">Spending stories</h1>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <li key={story.id} className="rounded-xl border border-line bg-paper p-4">
              <p className="text-xs text-accent">
                {story.fiscal_year} · {story.department}
              </p>
              <h2 className="mt-1 font-medium">{story.title}</h2>
              <p className="mt-1 text-sm text-muted">{money.format(story.amount)}</p>
              <Link
                href={`/petition/new?story=${encodeURIComponent(story.id)}`}
                className="mt-3 inline-block text-sm font-medium text-accent underline"
              >
                Start a petition
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Lint and build**

Run: `npm run lint && npm run build`
Expected: no lint errors. The build lists `○ /dev/petition`, `ƒ /petition/new` and `ƒ /petition/[id]`.

- [ ] **Step 10: Set up a local database for the walkthrough**

Muktar runs this once on his machine. Homebrew Postgres 17 is already installed.

```bash
brew services start postgresql@17
createdb wheredoesmytaxgo
```

Then create `.env.local` with `DATABASE_URL=postgres://localhost:5432/wheredoesmytaxgo`, leaving `AUTH0_DOMAIN` unset so the dev bypass applies, and run:

```bash
npm run db:migrate
```

Expected: `[✓] migrations applied successfully!`

- [ ] **Step 11: Walk through step 1 in the browser**

Start the app with `npm run dev`, using the in-app browser's preview with a `.claude/launch.json` entry that runs `npm run dev` on port 3000. Then check:
1. `/dev/petition` lists 18 stories, each with "Start a petition".
2. Click one. Step 1 shows "Linked to: <story title>", with the form on the left and the six-step explainer on the right at desktop width.
3. Click "Next: find an MP sponsor" with the form empty. All three fields show "This is required." The issue box counts as empty when it only contains "Whereas".
4. Fill in all three fields and click Next. The server log shows `POST /api/me/drafts 201`, then `GET /petition/<id>/sponsor 404`. That 404 is expected here, because the sponsor page is added in Task 7.
5. Visit `/petition/<id>`. The form is pre-filled, and "Next" sends `PATCH` instead of `POST`.
6. Visit `/petition/new?story=nope`. It shows "We couldn't find that spending story".

- [ ] **Step 12: Commit**

```bash
git add src/lib/stories.ts src/lib/stories.test.ts src/app/globals.css src/app/petition src/app/dev
git commit -m "platform: add petition page shell, step 1 form and dev stories page"
```

---

### Task 7: Step 2 (Ask an MP to sponsor it)

**Branch:** `platform/draft-deploy`

**Files:**
- Create: `src/lib/clipboard.ts`
- Test: `src/lib/clipboard.test.ts`
- Modify: `next.config.ts`
- Create: `src/app/petition/_components/MpCard.tsx`
- Create: `src/app/petition/_components/MpSearch.tsx`
- Create: `src/app/petition/_components/LetterEditor.tsx`
- Create: `src/app/petition/_components/SendOptions.tsx`
- Create: `src/app/petition/_components/SponsorStep.tsx`
- Create: `src/app/petition/[id]/sponsor/page.tsx`

**Interfaces:**
- **Consumes:** `apiFetch` and `ApiError` (Task 2). `normalizePostal` (Task 4). `buildLetter`, `buildEmail`, `composeLinks` and `ComposeLinks` (Task 5). `Mp` (Task 1). `Draft` (Task 3). `loadDraft` and `StepHeader` (Task 6).
- **Produces:**
  - `copyText(text: string): Promise<boolean>` from `@/lib/clipboard`.
  - `SponsorStep({ draft: Draft })`.
  - The page `/petition/[id]/sponsor`.

- [ ] **Step 1: Write the failing clipboard test**

Create `src/lib/clipboard.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("returns true when the copy works", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("returns false when the browser blocks the clipboard", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("NotAllowedError"))) },
    });
    expect(await copyText("hello")).toBe(false);
  });
});
```

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: FAIL, because `./clipboard` cannot be resolved.

- [ ] **Step 2: Implement copyText**

Create `src/lib/clipboard.ts`:

```ts
/** Copies text to the clipboard. Returns false when the browser blocks it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: 2 passed.

- [ ] **Step 3: Allow MP photos**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // MP photos from the Represent API
    remotePatterns: [{ protocol: "https", hostname: "www.ourcommons.ca" }],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Add the step 2 components**

Create `src/app/petition/_components/MpCard.tsx`:

```tsx
import Image from "next/image";
import type { Mp } from "@/lib/mp/types";

export function MpCard({ mp }: { mp: Mp }) {
  const rows = [
    { label: "Email", value: mp.email },
    { label: "Hill office", value: mp.hillPhone },
    { label: "Riding office", value: mp.ridingPhone },
  ];

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center gap-4">
        {mp.photoUrl ? (
          <Image
            src={mp.photoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <div className="size-14 rounded-full bg-line" aria-hidden />
        )}
        <div>
          <p className="font-semibold">{mp.name}</p>
          <p className="text-sm text-muted">MP for {mp.riding}</p>
          {mp.party && (
            <span className="mt-1 inline-block rounded-full border border-line px-2 text-xs">{mp.party}</span>
          )}
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line border-t border-line text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-2">
            <dt className="text-muted">{row.label}</dt>
            <dd className="text-right">{row.value ?? "Not listed"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

Create `src/app/petition/_components/MpSearch.tsx`. Results are derived at render time and not cleared inside the effect, because Next's ESLint config enforces `react-hooks/set-state-in-effect`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { Mp } from "@/lib/mp/types";

type Props = { onPick: (mp: Mp) => void };

export function MpSearch({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Mp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const found = await apiFetch<Mp[]>(`/api/mps?q=${encodeURIComponent(q)}`);
        if (!stale) {
          setResults(found);
          setError(null);
        }
      } catch {
        if (!stale) setError("Couldn't reach the MP directory. Try again.");
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const searchable = query.trim().length >= 2;
  const shown = searchable ? results : [];

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <label className="block text-sm font-semibold">
        Search any MP by name or riding
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
          placeholder="e.g. Naqvi or Ottawa Centre"
        />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-2 divide-y divide-line">
        {shown.map((mp) => (
          <li key={`${mp.name}-${mp.riding}`}>
            <button
              type="button"
              onClick={() => onPick(mp)}
              className="w-full py-2 text-left text-sm hover:bg-canvas"
            >
              <span className="font-medium">{mp.name}</span>
              <span className="text-muted">
                {" "}
                · {mp.riding}
                {mp.party ? ` · ${mp.party}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {searchable && shown.length === 0 && !error && (
        <p className="mt-2 text-sm text-muted">No MPs match that yet.</p>
      )}
    </div>
  );
}
```

Create `src/app/petition/_components/LetterEditor.tsx`:

```tsx
"use client";

import { useState } from "react";

type Props = {
  letter: string;
  edited: boolean;
  onSave: (text: string | null) => void;
};

export function LetterEditor({ letter, edited, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sponsorship request</h2>
        <div className="flex gap-3 text-sm">
          {edited && (
            <button type="button" onClick={() => onSave(null)} className="text-muted underline">
              Reset to template
            </button>
          )}
          <button type="button" onClick={() => setEditing(!editing)} className="underline">
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          defaultValue={letter}
          onBlur={(event) => onSave(event.target.value)}
          className="mt-2 min-h-72 w-full rounded-xl border border-line bg-paper p-4 text-sm"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-sm">{letter}</p>
      )}
    </div>
  );
}
```

Create `src/app/petition/_components/SendOptions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import type { ComposeLinks } from "@/lib/mp/sponsorEmail";

type Props = {
  links: ComposeLinks;
  emailText: string;
  continueHref: string;
  onSent: () => void;
};

const linkClass = "block rounded-lg border border-line bg-paper px-4 py-3 text-center text-sm font-medium hover:border-ink";

export function SendOptions({ links, emailText, continueHref, onSent }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    setStatus((await copyText(emailText)) ? "copied" : "failed");
  }

  return (
    <div className="space-y-2">
      <a
        href={links.gmail}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onSent}
        className="block rounded-lg bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
      >
        Open in Gmail
      </a>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={links.outlook} target="_blank" rel="noopener noreferrer" onClick={onSent} className={linkClass}>
          Open in Outlook
        </a>
        <a href={links.mailto} onClick={onSent} className={linkClass}>
          Use my email app
        </a>
      </div>
      <button type="button" onClick={copy} className={`${linkClass} w-full`}>
        {status === "copied" ? "Copied" : "Copy email"}
      </button>
      {status === "failed" && (
        <p className="text-center text-xs text-danger">
          Couldn&rsquo;t copy. Use one of the buttons above, or copy the letter by hand.
        </p>
      )}
      {status === "copied" && (
        <a href={continueHref} className="block text-center text-sm text-accent underline">
          Continue to step 3
        </a>
      )}
    </div>
  );
}
```

Create `src/app/petition/_components/SponsorStep.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import { normalizePostal } from "@/lib/mp/postal";
import { buildEmail, buildLetter, composeLinks } from "@/lib/mp/sponsorEmail";
import type { Mp } from "@/lib/mp/types";
import type { Draft } from "@/lib/petition";
import { LetterEditor } from "./LetterEditor";
import { MpCard } from "./MpCard";
import { MpSearch } from "./MpSearch";
import { SendOptions } from "./SendOptions";

const LOOKUP_ERRORS: Record<string, string> = {
  invalid_postal: "Enter a postal code like K1P 1A4.",
  not_found: "We couldn't find that postal code.",
};

export function SponsorStep({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [mp, setMp] = useState<Mp | null>(draft.mp);
  // Set only when the MP was found from the user's own postal code, so the letter can say "constituent".
  const [postalCode, setPostalCode] = useState<string | null>(null);
  const [postalInput, setPostalInput] = useState("");
  const [finding, setFinding] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [letterOverride, setLetterOverride] = useState<string | null>(draft.sponsorEmail);
  const [saveError, setSaveError] = useState<string | null>(null);

  const patch = (body: object) =>
    apiFetch<Draft>(`/api/me/drafts/${draft.id}`, { method: "PATCH", body });

  async function chooseMp(next: Mp, fromPostal: string | null) {
    setMp(next);
    setPostalCode(fromPostal);
    setSearching(false);
    setSaveError(null);
    try {
      await patch({ mp: next });
    } catch {
      setSaveError("We couldn't save your MP choice. Try again.");
    }
  }

  async function find(event: FormEvent) {
    event.preventDefault();
    const code = normalizePostal(postalInput);
    if (!code) {
      setLookupError(LOOKUP_ERRORS.invalid_postal);
      return;
    }
    setFinding(true);
    setLookupError(null);
    try {
      await chooseMp(await apiFetch<Mp>(`/api/mp?postal=${code}`), code);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      setLookupError(LOOKUP_ERRORS[code] ?? "Couldn't reach the MP directory. Try again.");
    } finally {
      setFinding(false);
    }
  }

  async function saveLetter(text: string | null) {
    setLetterOverride(text);
    try {
      await patch({ sponsorEmail: text });
    } catch {
      setSaveError("We couldn't save your letter. Try again.");
    }
  }

  function markSent() {
    patch({ sponsorRequested: true })
      .catch(() => {})
      .finally(() => router.push(`/petition/${draft.id}/submit`));
  }

  const letter = letterOverride ?? (mp ? buildLetter({ mp, title: draft.title, postalCode }) : "");
  const email = buildEmail({ letter, petition: draft });

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <h1 className="text-2xl font-semibold">Ask an MP to sponsor it</h1>
        <p className="mt-1 text-sm text-muted">
          Every House of Commons e-petition needs one Member of Parliament to authorize it. Any MP can, but your
          own is the usual first ask.
        </p>

        <form onSubmit={find} className="mt-6 flex gap-2">
          <input
            value={postalInput}
            onChange={(event) => setPostalInput(event.target.value)}
            placeholder="Postal code, e.g. K1P 1A4"
            aria-label="Postal code"
            className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
          <button type="submit" disabled={finding} className="rounded-lg border border-ink px-4 text-sm">
            {finding ? "Finding…" : "Find"}
          </button>
        </form>
        {lookupError && (
          <p className="mt-2 text-sm text-danger">
            {lookupError}{" "}
            {lookupError.includes("Try again") && (
              <button type="button" onClick={find} className="underline">
                Try again
              </button>
            )}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {mp && <MpCard mp={mp} />}
          {searching ? (
            <MpSearch onPick={(picked) => chooseMp(picked, null)} />
          ) : (
            <button type="button" onClick={() => setSearching(true)} className="text-sm underline">
              Choose a different MP
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {mp ? (
          <>
            <LetterEditor letter={letter} edited={letterOverride !== null} onSave={saveLetter} />
            <p className="rounded-xl bg-paper p-4 text-sm text-muted">
              Once your MP agrees, name them as sponsor when you submit on ourcommons.ca.
            </p>
            {mp.email ? (
              <SendOptions
                links={composeLinks({ to: mp.email, ...email })}
                emailText={`To: ${mp.email}\nSubject: ${email.subject}\n\n${email.body}`}
                continueHref={`/petition/${draft.id}/submit`}
                onSent={markSent}
              />
            ) : (
              <p className="text-sm text-danger">This MP has no public email address. Choose a different MP.</p>
            )}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
            Find your MP to see the sponsorship request.
          </p>
        )}
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Add the step 2 page**

Create `src/app/petition/[id]/sponsor/page.tsx`:

```tsx
import { loadDraft } from "../../loadDraft";
import { SponsorStep } from "../../_components/SponsorStep";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function SponsorPage({ params }: Props) {
  const draft = await loadDraft(params);
  return (
    <main>
      <StepHeader step={2} backHref={`/petition/${draft.id}`} />
      <SponsorStep draft={draft} />
    </main>
  );
}
```

- [ ] **Step 6: Test, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: 70 passed, no lint errors, and the build lists `ƒ /petition/[id]/sponsor`.

- [ ] **Step 7: Walk through step 2 in the browser**

Use the dev server from Task 6 with a draft created in step 1. Check each of these:
1. Enter `12345` and click Find. It shows "Enter a postal code like K1P 1A4." and makes no network request.
2. Enter `k1p 1a4` and click Find:
   - The card shows **Yasir Naqvi**, MP for Ottawa Centre, Liberal, `yasir.naqvi@parl.gc.ca`, Hill office `1 613 996-5322` and riding office `1 613 946-8682`, with his photo.
   - The letter begins "Dear Yasir Naqvi," and includes "I'm a constituent in Ottawa Centre".
   - The letter ends "[Your name], K1P 1A4".
3. Enter `Z9Z 9Z9`. It shows "We couldn't find that postal code."
4. Click "Choose a different MP" and type `belanger`. **Jim Bélanger** appears. Pick him:
   - The card switches to him.
   - The letter drops the "constituent" line and ends "[Your name], [Postal code]".
5. Reload the page. Jim Bélanger's card is still shown, loaded from `drafts.mp`.
6. Click Edit, change the letter, then click Done. Reload: the edit is still there and "Reset to template" is visible. Click "Reset to template", and the template letter returns.
7. Inspect the send links (do not click them in the embedded browser, because `mailto:` could open the Mail app):
   - The "Open in Gmail" `href` starts with `https://mail.google.com/mail/?view=cm&fs=1&to=`.
   - The "Use my email app" link starts with `mailto:`.
8. Click "Copy email". It shows either "Copied" with a "Continue to step 3" link, or, if the browser blocks the clipboard, the "Couldn't copy…" message.

- [ ] **Step 8: Commit**

```bash
git add src/lib/clipboard.ts src/lib/clipboard.test.ts next.config.ts src/app/petition
git commit -m "platform: add step 2 MP lookup, search, letter editor and send options"
```

---

### Task 8: Step 3 (Submit on ourcommons.ca) and full walkthrough

**Branch:** `platform/draft-deploy`

**Files:**
- Create: `src/app/petition/_components/CopyField.tsx`
- Create: `src/app/petition/[id]/submit/page.tsx`

**Interfaces:**
- **Consumes:** `copyText` (Task 7). `fullRequest` (Task 3). `loadDraft` and `StepHeader` (Task 6).
- **Produces:** the page `/petition/[id]/submit`.

- [ ] **Step 1: Add the copy field**

Create `src/app/petition/_components/CopyField.tsx`:

```tsx
"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";

type Props = { label: string; text: string };

export function CopyField({ label, text }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    setStatus((await copyText(text)) ? "copied" : "failed");
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <button type="button" onClick={copy} className="text-sm text-accent underline">
          {status === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      {status === "failed" && (
        <p className="mt-1 text-xs text-danger">Couldn&rsquo;t copy. Select the text and copy it yourself.</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Add the step 3 page**

Create `src/app/petition/[id]/submit/page.tsx`. `https://www.ourcommons.ca/petitions/en/Petitioner/Save` is the site's "Create" link, and it redirects to the ourcommons.ca login first.

```tsx
import Link from "next/link";
import { fullRequest } from "@/lib/petition";
import { loadDraft } from "../../loadDraft";
import { CopyField } from "../../_components/CopyField";
import { StepHeader } from "../../_components/StepHeader";

const OURCOMMONS_CREATE_URL = "https://www.ourcommons.ca/petitions/en/Petitioner/Save";

type Props = { params: Promise<{ id: string }> };

export default async function SubmitPage({ params }: Props) {
  const draft = await loadDraft(params);
  const sponsor = draft.mp?.name ?? "your MP";

  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={3} backHref={`/petition/${draft.id}/sponsor`} />
      <h1 className="text-2xl font-semibold">Submit it on ourcommons.ca</h1>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>Log in or create an account on ourcommons.ca and start a new e-petition.</li>
        <li>Paste in the title, the issue and the requested action below.</li>
        <li>Name {sponsor} as your sponsor once they agree.</li>
        <li>Five supporters confirm by email, then the MP authorizes it.</li>
      </ol>

      <div className="mt-6 space-y-3">
        <CopyField label="Title" text={draft.title} />
        <CopyField label="The issue" text={draft.issue} />
        <CopyField label="Requested action" text={fullRequest(draft.request)} />
      </div>

      <a
        href={OURCOMMONS_CREATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block rounded-lg bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
      >
        Open ourcommons.ca
      </a>
      <Link href="/dev/petition" className="mt-4 block text-center text-sm text-accent underline">
        Back to spending
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Test, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: 70 passed, no lint errors, and the build lists `ƒ /petition/[id]/submit`.

- [ ] **Step 4: Full walkthrough at desktop width**

With the viewport at about 1280px wide:
1. Go from `/dev/petition` → "Start a petition" → fill in step 1 → Next.
2. In step 2, find by K1P 1A4.
3. In step 2, use "Copy email" → "Continue to step 3", or go straight to `/petition/<id>/submit`.
4. Step 3 lists four steps, and names the chosen MP in "Name <MP> as your sponsor".
5. The three copy blocks show the title, the issue, and the requested action **with** the prefix "We, the undersigned, call upon the Government of Canada to …".
6. Each Copy button shows "Copied" or the "Couldn't copy…" fallback.
7. "Open ourcommons.ca" points at `https://www.ourcommons.ca/petitions/en/Petitioner/Save` with `target="_blank"`.
8. "← Back" returns to step 2, and "Back to spending" returns to `/dev/petition`.
9. The database row has `sponsor_requested_at` set once a send option has been used. Check with `psql wheredoesmytaxgo -c "select title, sponsor_requested_at from drafts"`.

- [ ] **Step 5: Walkthrough at phone width**

Set the viewport to 390×844 and revisit steps 1–3:
- The columns stack.
- Nothing overflows: `document.documentElement.scrollWidth` equals `innerWidth`.
- Buttons are full width and tappable.

- [ ] **Step 6: Commit**

```bash
git add src/app/petition
git commit -m "platform: add step 3 hand-off to ourcommons.ca"
```

- [ ] **Step 7: Checkpoint.** Tell Muktar that the whole flow works locally. Ask whether to push `platform/draft-deploy` and open a pull request. Do not push without a yes.

---

### Task 9: Deploy to Vercel (Muktar's setup and a production walkthrough)

**Branch:** `platform/draft-deploy`, or `main` after the pull requests merge

Claude cannot create accounts or handle credentials, so **Steps 1–3 are Muktar's**. Claude can check the configuration and run the walkthrough afterwards.

- [ ] **Step 1 (Muktar): Auth0**
  - Create a tenant, then an **Application → Regular Web Application**.
  - Allowed Callback URLs: `http://localhost:3000/auth/callback, https://<prod-domain>/auth/callback`
  - Allowed Logout URLs: `http://localhost:3000, https://<prod-domain>`
  - Put `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` in `.env.local`, and generate `AUTH0_SECRET` with `openssl rand -hex 32`.

- [ ] **Step 2 (Muktar): Hosted Postgres**
  - Create a free database on Tiger Data, Neon or Supabase, and copy its **pooled** connection string.
  - Run migrations against it once from the laptop: `DATABASE_URL='<pooled url>' npm run db:migrate`.

- [ ] **Step 3 (Muktar): Vercel**
  - Import `greatnnaji/hack-the-hill-iii`.
  - Set `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `DATABASE_URL`, and `APP_BASE_URL=https://<prod-domain>`.
  - Preview deploys have changing URLs and are not registered with Auth0, so use the production URL for login.

- [ ] **Step 4: Local check with real Auth0**
  - With the Auth0 values in `.env.local`, run `npm run dev` and open `http://localhost:3000/dev/petition`.
  - Expect a redirect to Auth0's login page.
  - After logging in, you land back on `/dev/petition`. `select id, email from users` shows your row.
  - `curl -i http://localhost:3000/api/me/drafts` with no cookie returns `401 {"error":"unauthorized"}`.

- [ ] **Step 5: Production walkthrough, after Muktar deploys**
  - Repeat Task 8 Steps 4 and 5 on `https://<prod-domain>`, starting at `/dev/petition` and logging in through Auth0.
  - Confirm a draft row appears in the hosted database.

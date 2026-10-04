# wheredoesmytaxgo: Platform design (auth, MP lookup, petition drafts, deploy)

**Owner:** Muktar
**Date:** 2026-09-26
**Covers:** Muktar's tasks in `TASKS.md` (Task 1 auth, Task 2 MP lookup + sponsor email, Task 3 draft flow + deploy). The demo script and pitch deck are not covered here.

The product is **wheredoesmytaxgo**. The wireframe and `TASKS.md` call it "Tally". That is a placeholder name. It is a **responsive web app** used mainly on desktop. The wireframe is labelled "Mobile · 390pt", but it is only a layout guide.

## 1. Goals

- Every page requires a logged-in user. A logged-out visitor goes straight to Auth0's hosted login page.
- A logged-in user can turn a spending story into a House of Commons e-petition draft, find an MP to sponsor it, send that MP a sponsorship request by email, and get the text ready to submit on ourcommons.ca.
- Drafts are saved to the user's account in Postgres.
- The app deploys to Vercel.

**Not in scope:** milestone notifications to sponsors (a stretch goal in `TASKS.md`), tracking published petitions, the demo script, and the pitch deck.

## 2. Decisions

| Topic | Decision |
|---|---|
| Where backend code lives | Next.js route handlers under `src/app/api`. No separate API server and no JWT middleware. Handlers read the user from the Auth0 session cookie. |
| Auth | `@auth0/nextjs-auth0` v4, with the gate in `src/proxy.ts`. Next 16 renamed `middleware.ts` to `proxy.ts`. |
| Logged-out visitor | Redirect straight to Auth0 Universal Login. There is no splash page. |
| Database | Postgres through Drizzle ORM and the `postgres` driver. Any Postgres host works: Tiger Data, Neon or Supabase. |
| Logged-out API calls | `401` JSON. The client helper `apiFetch()` then sends the browser to login. |
| "Choose a different MP" | Search all MPs by name or riding. Re-entering a postal code is not enough, because a different MP is usually wanted when your own MP says no. |
| Sending the sponsor email | Gmail compose, Outlook web compose, `mailto:`, and "Copy email". Desktop browsers often have no mail app configured. |

## 3. Auth

### 3.1 Gate (`src/proxy.ts`)
- `/auth/*` is handled by the Auth0 SDK (`auth0.middleware(request)`). This covers login, logout and callback.
- Any other page request without a session redirects to `/auth/login?returnTo=<path+query>`.
- A `/api/*` request without a session returns `401 {"error":"unauthorized"}`.
- The matcher skips `_next/static`, `_next/image`, `favicon.ico` and files in `public/`.

### 3.2 Current user
- `src/lib/auth0.ts` exports the `Auth0Client`. It reads `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` and `APP_BASE_URL`.
- `src/lib/auth.ts` exports `requireUser()`. It returns `{ id, email, name }` from the session, or throws a typed unauthorized error that route handlers turn into `401`.

### 3.3 User row on first login
- The Auth0 `onCallback` hook upserts into `users`: it inserts on first login and updates `email`, `name` and `last_login_at` after that.
- If the upsert fails, the error is logged and login still succeeds.
- `POST /api/me/drafts` also inserts the user row if it is missing (`on conflict do nothing`). So a failed upsert never blocks saving a draft.

### 3.4 Dev bypass
- When `AUTH0_DOMAIN` is unset **and** `NODE_ENV === "development"`, the gate lets every request through. `requireUser()` then returns a fixed user `{ id: "dev|local", email: "dev@localhost", name: "Local Dev" }`.
- The bypass lets teammates run the app before Auth0 credentials exist.
- The bypass never applies in production. There, missing Auth0 variables make the gate respond `500` and log `Auth0 is not configured`. `npm run build` still succeeds without them, so teammates can build locally.

### 3.5 Client helper
- `src/lib/apiFetch.ts` wraps `fetch` for same-origin API calls.
- On `401` it sets `window.location` to `/auth/login?returnTo=<current page>`.
- On other non-2xx responses it throws an `ApiError` with the status and the JSON `error` code, so screens can show an inline message.

## 4. Data model (Drizzle, `src/db/schema.ts`)

`TASKS.md` gives these tables to Raphael. Muktar builds them now, and Raphael adds his own tables (`stories`, `petitions`, spending tables) to the same schema folder.

**`users`**

| Column | Type | Notes |
|---|---|---|
| `id` | text, primary key | Auth0 `sub` |
| `email` | text, nullable | |
| `name` | text, nullable | |
| `created_at` | timestamptz, default now | |
| `last_login_at` | timestamptz, default now | |

**`drafts`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, primary key, default `gen_random_uuid()` | |
| `user_id` | text, references `users.id`, on delete cascade | Indexed |
| `story_id` | text, not null | The story's `id` from the shared contract. There is no foreign key, because stories are not in this database yet. |
| `story_title` | text, not null | A copy of the story title, so "Linked to" survives a data swap |
| `title` | text, not null | 1–250 characters |
| `issue` | text, not null | 1–4,000 characters. The "Whereas…" points. |
| `request` | text, not null | 1–2,000 characters. The text after the fixed prefix. |
| `mp` | jsonb, nullable | A copy of the chosen MP (see §5.1) |
| `sponsor_email` | text, nullable | The edited letter body. `null` means use the template. Up to 5,000 characters. |
| `sponsor_requested_at` | timestamptz, nullable | Set when a send option is used |
| `created_at`, `updated_at` | timestamptz, default now | `updated_at` is set on every update |

- The fixed request prefix is `We, the undersigned, call upon the Government of Canada to`. The full requested action is the prefix, a space, then `request`.
- Postal codes are never stored.
- The 250-character title limit comes from the wireframe. The caps on `issue`, `request` and `sponsor_email` are ours, to stop abuse. They are not official ourcommons.ca limits.

**Migrations:** `drizzle.config.ts`. `npm run db:generate` creates SQL migrations in `drizzle/`, and `npm run db:migrate` applies them to `DATABASE_URL`. Migrations run from a laptop, not during the Vercel build.

**Connection:** `src/db/index.ts` creates a single `postgres` client from `DATABASE_URL` with `prepare: false`, which pooled connection strings need, and exports `db`.

## 5. API

Every route is behind the gate. Request bodies and query strings are validated with zod. Errors use the shape `{ "error": "<code>" }`.

### 5.1 `GET /api/mp?postal=K1P1A4`
- It normalises the postal code: uppercase, whitespace removed. Then it validates against `^[A-Z]\d[A-Z]\d[A-Z]\d$`.
- It calls `https://represent.opennorth.ca/postcodes/<code>/` with an 8-second timeout and a 24-hour fetch cache (`next: { revalidate: 86400 }`).
- It picks the representative from `representatives_centroid` whose `elected_office` is `"MP"`.
- Response `200`:

```json
{
  "name": "Yasir Naqvi",
  "riding": "Ottawa Centre",
  "party": "Liberal",
  "email": "yasir.naqvi@parl.gc.ca",
  "photoUrl": "https://www.ourcommons.ca/.../NaqviYasir_Lib.jpg",
  "profileUrl": "https://www.ourcommons.ca/Members/en/yasir-naqvi(110572)",
  "hillPhone": "1 613 996-5322",
  "ridingPhone": "1 613 946-8682"
}
```

- `hillPhone` comes from the office with type `legislature`, and `ridingPhone` from type `constituency`. Either can be `null`.
- Errors:

| Status | Code | When |
|---|---|---|
| `400` | `invalid_postal` | Fails the format check |
| `404` | `not_found` | Represent returns 404, or no MP is in the response |
| `502` | `lookup_failed` | Timeout, network error, or any other upstream status |

This `MP` shape is also what `drafts.mp` stores.

### 5.2 `GET /api/mps?q=naqvi`
- `q` must be 2–100 characters.
- It loads `https://represent.opennorth.ca/representatives/house-of-commons/?limit=500` with the same timeout and 24-hour cache.
- It returns up to 20 MPs, in the same `MP` shape, whose name or riding contains `q`. Matching ignores case and accents.
- Errors: `400 invalid_query`, `502 lookup_failed`.

### 5.3 Drafts: `/api/me/drafts`
All queries filter on `user_id = requireUser().id`. A draft owned by someone else returns `404 not_found`, the same as a missing draft.

| Method and path | Body | Result |
|---|---|---|
| `POST /api/me/drafts` | `{ storyId, storyTitle, title, issue, request }` | `201` with the draft |
| `GET /api/me/drafts` | | `200 [draft…]`, newest `updated_at` first |
| `GET /api/me/drafts/:id` | | `200` with the draft, or `404` |
| `PATCH /api/me/drafts/:id` | Any of `{ title, issue, request, mp, sponsorEmail, sponsorRequested: true }` | `200` with the updated draft, or `404` |

- `sponsorRequested: true` sets `sponsor_requested_at` to now.
- `sponsorEmail: null` resets the letter to the template.
- Validation failures return `400 invalid_body`. Database errors return `500 server_error`, and the details are logged.

Draft JSON uses camelCase: `id`, `storyId`, `storyTitle`, `title`, `issue`, `request`, `mp`, `sponsorEmail`, `sponsorRequestedAt`, `createdAt`, `updatedAt`.

## 6. Screens

The layout follows the wireframe but is laid out for the web:
- Content sits in a centred container up to about 1040px wide.
- Two columns at 1024px and wider (Tailwind `lg`). Below 1024px there is one column, in wireframe order.
- Styling uses Tailwind plus a few CSS variables in `globals.css`, taken from the wireframe: paper background, ink, muted text, border, and the green accent. Izu can replace these with the real design tokens.

Every step shares a `StepHeader`: "Cancel" on step 1 or a back arrow on steps 2–3, "Step N of 3", and a 3-segment progress bar.

### 6.1 Step 1: Write your petition (wireframe 05)
Routes are `/petition/new?story=<id>` (new) and `/petition/<draftId>` (edit).

- **Left column:**
  - "Write your petition" and "Linked to: <story title>".
  - A **Title** input with a live `n / 250` counter.
  - **The issue**, a textarea with the hint "State facts, not opinions. Each point starts with 'Whereas'." It starts as `Whereas `.
  - **Requested action**, a textarea. The fixed prefix is shown in muted text above it.
  - "Next: find an MP sponsor".
- **Right column:** the sticky "How a House of Commons e-petition works" list of six steps, with the wording from the wireframe:
  1. Draft
  2. 5 supporters
  3. MP sponsor
  4. Open for 120 days
  5. 500 signatures
  6. Government response within 45 days
- **Next:**
  - Client-side validation first: required fields and length limits, shown inline.
  - Then `POST` for a new draft or `PATCH` for an existing one.
  - Then navigate to `/petition/<id>/sponsor`.
  - On failure the typed text stays and an inline error appears with "Try again".
- **Cancel:** goes to `/dev/petition` until Izu's screen 04 exists, then to that story's page (see §7).
- **Errors:** an unknown `story` id on `/new` shows "We couldn't find that spending story" with a link back. An unknown `draftId` shows the Next.js not-found page.

### 6.2 Step 2: Ask an MP to sponsor it (wireframe 06)
The route is `/petition/<draftId>/sponsor`. If the draft is missing, the page shows not-found.

- **Left column:**
  - "Ask an MP to sponsor it" and the explainer text from the wireframe.
  - A postal code input and a **Find** button that calls `GET /api/mp`.
  - On success the **MP card** shows photo, name, riding, party, email, Hill office and riding office. The MP is saved, and any edited letter is reset to the template, in one `PATCH { mp, sponsorEmail: null }`. If `draft.mp` is already set, the card shows on load.
  - Inline errors:
    - `invalid_postal`: "Enter a postal code like K1P 1A4"
    - `not_found`: "We couldn't find that postal code"
    - `lookup_failed`: "Couldn't reach the MP directory.", followed by a single "Try again" button.
  - **Choose a different MP** opens a search box that calls `GET /api/mps?q=` after a 300ms pause in typing. It lists name, riding and party. Picking one sets the card and runs `PATCH { mp, sponsorEmail: null }`, so a letter edited for the previous MP is never sent to the new one.
- **Right column:**
  - The **Sponsorship request** letter. It is generated from the template in §6.4 unless `draft.sponsorEmail` is set.
  - **Edit** swaps it for a textarea, which saves on blur with `PATCH { sponsorEmail }`. "Reset to template" sends `sponsorEmail: null`.
  - A note: "Once your MP agrees, name them as sponsor when you submit on ourcommons.ca." This replaces the wireframe's milestone-notification note.
  - Send options, disabled until an MP is chosen:
    - **Open in Gmail**
    - **Open in Outlook**
    - **Use my email app** (`mailto:`)
    - **Copy email**, which copies the subject and body.
  - Gmail, Outlook and `mailto:` open in a new tab or the mail handler, run `PATCH { sponsorRequested: true }`, then navigate to step 3.
  - **Copy email** shows "Copied" and a "Continue to step 3" link.

### 6.3 Step 3: Submit on ourcommons.ca (not in the wireframe)
The route is `/petition/<draftId>/submit`. It is a single centred column.

- "Submit it on ourcommons.ca", followed by a checklist:
  1. Log in or create an account on ourcommons.ca and start a new e-petition.
  2. Paste in the title, the issue and the requested action.
  3. Name <MP name> as your sponsor once they agree.
  4. Five supporters confirm by email, then the MP authorizes it.
- Three read-only blocks for **Title**, **The issue** and **Requested action** (prefix included). Each has a **Copy** button.
- **Open ourcommons.ca** opens `https://www.ourcommons.ca/petitions/en/Petitioner/Save` in a new tab. That is the site's "Create" page, and it asks the user to log in first.
- **Back to spending** goes to `/dev/petition` for now (see §7).

### 6.4 Sponsor email
`src/lib/mp/sponsorEmail.ts` contains pure functions.

`buildLetter({ mp, title, constituent })` returns the template below. `constituent` is true only when the MP was found from the user's own postal code during this visit. When it is false, which covers an MP picked through "Choose a different MP" and a page reload, the letter leaves out the "I'm a constituent in <riding>." sentence, so it never claims to be from a constituent when it isn't. The sign-off is always the placeholder `[Your name], [Postal code]`, which the user fills in in their email. The letter text can be saved, so it must never contain a real postal code.

```
Dear <MP name>,

I'm a constituent in <riding>. I've drafted an e-petition, "<title>," and I'm asking you to authorize it for publication on the House of Commons website.

Sponsoring does not mean you endorse it. It allows constituents to sign and, with 500 signatures, have it presented in the House.

Thank you,
[Your name], [Postal code]
```

`buildEmail({ letter, draft })` returns:
- **subject:** `Request to sponsor an e-petition: <title>`
- **body:** the letter, a blank line, `---`, then the petition text. That is the title, a blank line, the issue, a blank line, and the full requested action.

`composeLinks({ to, subject, body })` returns:
- `gmail`: `https://mail.google.com/mail/?view=cm&fs=1&to=…&su=…&body=…`
- `outlook`: `https://outlook.live.com/mail/0/deeplink/compose?to=…&subject=…&body=…`
- `mailto`: `mailto:<to>?subject=…&body=…`

All values are encoded with `encodeURIComponent`. The postal code used in the letter is the one typed on this page. It lives only in page state.

## 7. Stand-ins for other people's work

These are built so the flow works end to end, and each is meant to be replaced.

| Stand-in | Replaced by | How to swap |
|---|---|---|
| `src/lib/stories.ts`: `getStory(id)` and `listStories()`, which read Great's `pipeline/stories.json` (18 real stories in the shared story shape) | Raphael's `GET /spending/:id` | Change the two functions to call the API. Callers don't change. |
| `/dev/petition`: a dev-only page listing every story, each with a "Start a petition" link to `/petition/new?story=<id>` | Izu's screen 04 action card | Screen 04 links to `/petition/new?story=<id>`. "Cancel" and "Back to spending" then point at the story page. |
| Screens 05–06 and step 3 | Izu's final visual pass (Task 3) | Restyle in place. The API and routes stay. |
| `users` and `drafts` tables, Drizzle setup, `/api/me/drafts` | Raphael's DB and API (Task 2) | He extends `src/db/schema.ts` |

## 8. Code layout

```
src/proxy.ts
src/lib/auth0.ts                  Auth0Client and onCallback upsert
src/lib/auth.ts                   requireUser(), dev bypass, UnauthorizedError
src/lib/apiFetch.ts               client fetch wrapper
src/lib/http.ts                   json error helpers for route handlers
src/db/schema.ts, src/db/index.ts
src/lib/mp/represent.ts           Represent client, postal normalisation, MP parsing
src/lib/mp/search.ts              MP name/riding filter
src/lib/mp/sponsorEmail.ts        buildLetter, buildEmail, composeLinks
src/lib/drafts.ts                 zod schemas and data access for drafts
src/app/api/mp/route.ts
src/app/api/mps/route.ts
src/app/api/me/drafts/route.ts
src/app/api/me/drafts/[id]/route.ts
src/app/petition/new/page.tsx
src/app/petition/[id]/page.tsx
src/app/petition/[id]/sponsor/page.tsx
src/app/petition/[id]/submit/page.tsx
src/app/petition/_components/     StepHeader, PetitionForm, ProcessExplainer, MpCard, MpSearch, LetterEditor, SendOptions, CopyField
src/lib/stories.ts                reads pipeline/stories.json
src/app/dev/petition/page.tsx
drizzle.config.ts, drizzle/
.env.example
```

## 9. Testing

**Unit tests (Vitest):**
- postal normalisation and validation
- Represent parsing, against a saved copy of the real `K1P1A4` response, including missing offices and no MP
- MP search: case- and accent-insensitive, 20-result cap
- `buildLetter`, `buildEmail` and `composeLinks`, including encoding and the unknown postal code case
- the draft zod schemas and their length limits

**Route tests (Vitest and PGlite):**
- The drafts handlers run against an in-process PGlite database with the Drizzle migrations applied, and a stubbed `requireUser()`.
- Cases: create, list order, get, patch each field, `sponsorRequested`, `404` for another user's draft, `400` on a bad body, and `401` when unauthenticated.
- `/api/mp` and `/api/mps` are tested with a stubbed `fetch`: `200`, `400`, `404`, and `502` on timeout.

**Manual walkthrough (in-app browser):**
- `/dev/petition` → step 1 → step 2 (Find with K1P 1A4, then search for a different MP, edit the letter) → Gmail link → step 3 copy buttons.
- Run it at 1280px and at 390px.
- Then run it again on the Vercel URL with real Auth0 login.

## 10. Configuration and deploy

**`.env.example`** (committed; real values go in `.env.local`):

```
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=          # openssl rand -hex 32
APP_BASE_URL=http://localhost:3000
DATABASE_URL=          # pooled Postgres connection string
```

**Manual steps for Muktar.** Claude cannot create accounts or handle credentials.
1. **Auth0:**
   - Create a tenant and a Regular Web Application.
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Copy the values into `.env.local`.
2. **Postgres:** create a free database on Tiger Data, Neon or Supabase, put its pooled connection string in `DATABASE_URL`, then run `npm run db:migrate`.
3. **Vercel:**
   - Import the team repo and set the same variables, with `APP_BASE_URL` set to the production URL.
   - Add `<prod URL>/auth/callback` and `<prod URL>` to the Auth0 app.
   - Deploys happen only with Muktar's go-ahead.

Preview deploys have changing URLs, so Auth0 login is not supported on them. Use the production URL.

## 11. Build order

1. **Auth:** Auth0 client, `proxy.ts`, dev bypass, `requireUser`, `apiFetch`, and `.env.example`.
2. **Database:** Drizzle schema, migrations, the user upsert in `onCallback`, and the drafts API with its route tests.
3. **MP lookup:** the Represent client, `/api/mp`, `/api/mps`, the sponsor email builders, and their unit tests.
4. **Screens:** `src/lib/stories.ts`, `/dev/petition`, steps 1–3, and the browser walkthrough.
5. **Deploy:** Vercel setup, then a walkthrough on the production URL.

Branches follow `TASKS.md`: `platform/auth` (1–2), `platform/mp-lookup` (3), and `platform/draft-deploy` (4–5).

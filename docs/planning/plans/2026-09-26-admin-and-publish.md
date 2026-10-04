# Publish Step and Admin Page Implementation Plan

> **Update (2026-09-26):** the publish step (spec §1, plan Tasks 1–4) was replaced by Great's PR #14 (campaigns flow: write → publish → live, drafts removed). This branch keeps that flow; only the admin part (Tasks 5–8) remains from this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user publish their petition draft as an in-app campaign, and give our team an admin page to review campaigns, ask an MP, attach the ourcommons.ca petition and tell members to sign.

**Architecture:** Everything sits on top of Raphael's campaigns and petitions API, already on this branch (from `upstream/data-task3`, see `docs/campaigns-api.md`).
- **Publish step:** the existing petition flow (`/petition/...`) keeps step 1 (write, saved as a draft). Step 2 now publishes the draft through `POST /api/campaigns`, and step 3 confirms.
- **Admin pages:** new pages under `/admin` load data on the server with Raphael's library functions. Their client components make changes through his admin API routes with `apiFetch`.
- **Helpers:** email text, CSV and label helpers are pure functions in `src/lib/campaigns/`, each with unit tests.

**Tech Stack:** Next.js 16.3.6 App Router, React 19, TypeScript, Tailwind v4 tokens, Vitest 5, Drizzle with PGlite for route tests.

**Spec:** `docs/planning/specs/2026-09-26-admin-and-publish-design.md`

## Global Constraints

- **Next.js 16.3.6 App Router:**
  - page and layout `params` and `searchParams` are Promises and must be awaited,
  - `notFound()` comes from `next/navigation`,
  - read `node_modules/next/dist/docs/` before using an API you haven't used in this repo.
- **Raphael's code is read-only in this plan:** `src/lib/campaigns/{campaigns,admin,errors,riding,rules}.ts`, `src/lib/petitions/**`, `src/lib/admin.ts`, `src/app/api/{campaigns,admin,petitions}/**`, `src/app/api/me/route.ts`, `src/app/api/me/riding/**`, `src/db/schema.ts`, `drizzle/**`. New files may be added next to them in `src/lib/campaigns/`.
- **No new npm dependencies and no database migrations.**
- **Tests:**
  - Vitest 5, with files named `*.test.ts` (never `.tsx`), running in the `node` environment.
  - Render components with `renderToStaticMarkup(createElement(Component, props))`.
  - In component tests, mock `next/navigation` (and `next/link` where the component uses it).
- **Client components (`"use client"`):** may only use `import type` from modules that touch the database (anything importing `@/db`, such as `@/lib/campaigns/campaigns`, `@/lib/campaigns/admin` and `@/lib/petitions/petitions`).
- **Shared helpers:**
  - Client calls to our API go through `apiFetch` from `@/lib/apiFetch`.
  - Copying to the clipboard goes through `copyText` from `@/lib/clipboard`.
- **Dates on admin pages** use `formatDate` or `formatDateTime` from `src/app/admin/format.ts`. They use the fixed `America/Toronto` time zone, so server and client render the same text.
- **Copy:**
  - The product name is **wheredoesmytaxgo**.
  - The consent checkbox text is exactly: `Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it.`
  - Stage labels: `gathering` Gathering members, `in_review` In review, `mp_asked` MP asked, `mp_agreed` MP agreed, `live` Live, `closed` Closed.
- **Postal codes are never stored or logged by our code.** They are only sent to `POST /api/campaigns`.
- **Code style:**
  - Match the surrounding platform code: 2-space indent, double quotes, semicolons, and short comments that explain why.
  - Use the Tailwind tokens `paper`, `canvas`, `ink`, `muted`, `line`, `accent` and `danger`.
- **Muktar's settings file:** never create or edit `.env.local`. For local runs, pass settings on the command line (e.g. `env AUTH0_DOMAIN= npm run dev`).
- **Commits:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push or open PRs.

## Differences from the spec

1. **Helper locations:** the helpers live in `src/lib/campaigns/` (`publish.ts`, `outreach.ts`, `memberList.ts`, `stages.ts`), instead of `src/lib/admin/` and `publishErrors.ts`, because Raphael's `src/lib/admin.ts` is already a file with that name.
2. **Admin access is checked in the layout and in each admin page** through `requireAdminPage()`, because layouts don't re-run on client-side navigation.
3. **Saved riding:** the publish page reads it on the server with `getSavedRiding(user.id)`, the same value `GET /api/me` returns.
4. **Step 1 copy:** the heading becomes "Start a campaign", and the petition layout's page title becomes "Start a campaign · wheredoesmytaxgo", to match the campaign naming.
5. **`apiFetch`:**
   - `ApiError` gains `details` (the rest of the error body), so step 2 can read `campaignId` and `problems`,
   - `apiFetch` accepts `PUT` and `DELETE`.
6. **CSV formula guard:** the members CSV puts a `'` before any value starting with `=`, `+`, `-` or `@`, because names are typed by users and spreadsheet apps would run them as formulas.
7. **MP search:** it appears after clicking "Choose an MP", so its `autoFocus` doesn't scroll the admin page on load.
8. **Admin data source:** the admin campaign page builds the CSV and emails from `listCampaignMembers()` on the server, not from the members API route.
9. **MP picking:** the MP is picked with the MP search (by name or riding) only. The spec's extra postal-code lookup is left out, because the search already covers all 343 MPs.
10. **Sign-now message:** the ourcommons.ca link sits on its own line, so email apps don't fold the full stop into the link. The wording is otherwise as in the spec.

## File map

| File | Responsibility |
|---|---|
| `src/lib/apiFetch.ts` | + `PUT`/`DELETE`, `ApiError.details` |
| `src/lib/drafts.ts`, `src/app/api/me/drafts/[id]/route.ts` | + `deleteDraft`, `DELETE` |
| `src/app/petition/_components/PetitionForm.tsx` | Step 1 with live House rules |
| `src/app/petition/layout.tsx` | Page title |
| `src/lib/campaigns/publish.ts` | `CONSENT_TEXT`, `publishErrorFor` |
| `src/app/petition/_components/PublishStep.tsx`, `src/app/petition/[id]/publish/page.tsx` | Step 2 |
| `src/app/petition/_components/PublishedSummary.tsx`, `src/app/petition/published/[campaignId]/page.tsx` | Step 3 |
| `src/components/mp/MpCard.tsx`, `src/components/mp/MpSearch.tsx` | Moved from `src/app/petition/_components/` |
| `src/lib/mp/sponsorEmail.ts` | `composeLinks` only (+ `authuser`) |
| `src/lib/campaigns/stages.ts` | Stage order, labels, `isStage` |
| `src/app/admin/requireAdminPage.ts` | Admin-only guard for pages |
| `src/app/admin/listOptions.ts` | `?stage=&sort=` parsing and links |
| `src/app/admin/format.ts` | `formatDate`, `formatDateTime` |
| `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/_components/AdminListFilters.tsx` | Campaign list |
| `src/components/AccountMenu.tsx`, `src/components/SettingsMenu.tsx` | Admin link in the gear menu |
| `src/lib/campaigns/memberList.ts` | `ridingBreakdown`, `membersCsv` |
| `src/app/admin/campaigns/[id]/page.tsx` | One campaign |
| `src/app/admin/_components/CampaignOverview.tsx`, `StageControls.tsx`, `MembersSection.tsx` | Overview, stages and note, members |
| `src/lib/campaigns/outreach.ts` | `buildMpAsk`, `buildSignNow` |
| `src/app/admin/_components/MpAsk.tsx` | Ask an MP |
| `src/app/admin/_components/petitionMessages.ts`, `PetitionSection.tsx`, `SignNow.tsx` | Official petition, sign-now message |
| `.env.example` | `ADMIN_EMAILS`, `TEAM_GMAIL` |

Removed: `src/app/petition/[id]/sponsor/`, `src/app/petition/[id]/submit/`, `SponsorStep.tsx`, `LetterEditor.tsx`, `SendOptions.tsx` and `CopyField.tsx` from `src/app/petition/_components/`.

---

### Task 1: Deleting drafts, and `apiFetch` for PUT, DELETE and error details

**Files:**
- Modify: `src/lib/apiFetch.ts`
- Modify: `src/lib/apiFetch.test.ts`
- Modify: `src/lib/drafts.ts` (add `deleteDraft` after `updateDraft`)
- Modify: `src/app/api/me/drafts/[id]/route.ts`
- Modify: `src/app/api/me/drafts/route.test.ts` (append a `describe` block)

**Interfaces:**
- Produces: `ApiError` with `status`, `code` and `details: Record<string, unknown>`. `apiFetch(path, { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown })`, which resolves to `null` for an empty 204.
- Produces: `deleteDraft(userId: string, id: string): Promise<boolean>`. `DELETE /api/me/drafts/[id]` answers 204, 404 `not_found`, or 401 `unauthorized`.

- [ ] **Step 1: Write the failing apiFetch tests**

Append inside the existing `describe("apiFetch", ...)` block in `src/lib/apiFetch.test.ts`:

```ts
  it("keeps the rest of the error body on the ApiError", async () => {
    stubFetch(Response.json({ error: "already_started", campaignId: "c1" }, { status: 409 }));
    const error = await apiFetch("/api/campaigns", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "already_started", details: { campaignId: "c1" } });
  });

  it("resolves to null for an empty 204 response", async () => {
    stubFetch(new Response(null, { status: 204 }));
    await expect(apiFetch("/api/me/drafts/d1", { method: "DELETE" })).resolves.toBeNull();
  });
```

- [ ] **Step 2: Write the failing route tests**

Append to the end of `src/app/api/me/drafts/route.test.ts`:

```ts
describe("DELETE /api/me/drafts/:id", () => {
  const del = (id: string) =>
    draftRoute.DELETE(new Request(`http://localhost/api/me/drafts/${id}`, { method: "DELETE" }), ctx(id));
  const get = (id: string) => draftRoute.GET(new Request(`http://localhost/api/me/drafts/${id}`), ctx(id));

  it("deletes my draft", async () => {
    signInAs(ALICE);
    const draft = await create();
    const res = await del(draft.id);
    expect(res.status).toBe(204);
    expect((await get(draft.id)).status).toBe(404);
  });

  it("returns 404 for someone else's draft and keeps it", async () => {
    signInAs(ALICE);
    const draft = await create();
    signInAs(BOB);
    expect((await del(draft.id)).status).toBe(404);
    signInAs(ALICE);
    expect((await get(draft.id)).status).toBe(200);
  });

  it("returns 404 for a malformed id", async () => {
    signInAs(ALICE);
    expect((await del("not-a-uuid")).status).toBe(404);
  });

  it("returns 401 when logged out", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());
    expect((await del("00000000-0000-4000-8000-000000000000")).status).toBe(401);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npx vitest run src/lib/apiFetch.test.ts src/app/api/me/drafts/route.test.ts`
Expected: FAIL. The `details` expectation fails, and the `DELETE` tests fail with `draftRoute.DELETE is not a function`.

- [ ] **Step 4: Update `src/lib/apiFetch.ts`**

Replace the `ApiError` class and the `Options` type:

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** The whole error body, e.g. { error, campaignId } for 409 already_started. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown };
```

Replace the error branch at the end of `apiFetch`:

```ts
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const code = details.error;
    throw new ApiError(response.status, typeof code === "string" ? code : "server_error", details);
  }
  return data as T;
```

- [ ] **Step 5: Add `deleteDraft` to `src/lib/drafts.ts`** (after `updateDraft`; `and` and `eq` are already imported)

```ts
export async function deleteDraft(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = await db
    .delete(drafts)
    .where(and(eq(drafts.id, id), eq(drafts.userId, userId)))
    .returning({ id: drafts.id });
  return rows.length > 0;
}
```

- [ ] **Step 6: Add `DELETE` to `src/app/api/me/drafts/[id]/route.ts`**

Change the import to `import { deleteDraft, getDraft, updateDraft } from "@/lib/drafts";` and append:

```ts
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const deleted = await deleteDraft(user.id, (await params).id);
    if (!deleted) return jsonError("not_found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 7: Run the tests to confirm they pass**

Run: `npx vitest run src/lib/apiFetch.test.ts src/app/api/me/drafts/route.test.ts`
Expected: PASS (all tests in both files).

- [ ] **Step 8: Commit**

```bash
git add src/lib/apiFetch.ts src/lib/apiFetch.test.ts src/lib/drafts.ts "src/app/api/me/drafts/[id]/route.ts" src/app/api/me/drafts/route.test.ts
git commit -m "platform: delete drafts, and let apiFetch send PUT/DELETE and keep error details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Step 1 checks the House of Commons rules as you type

**Files:**
- Modify: `src/app/petition/_components/PetitionForm.tsx` (full replacement below)
- Modify: `src/app/petition/layout.tsx` (page title)
- Create: `src/app/petition/_components/PetitionForm.test.ts`

**Interfaces:**
- Consumes: `checkCampaignText({ title, issue, request }) → { words, maxWords, problems: string[] }`, `MAX_TITLE_CHARS` (250) and `PETITION_OPENING` from `@/lib/campaigns/rules`.
- Produces: step 1's **Next** saves the draft, then goes to `/petition/${draft.id}/publish` (built in Task 3).

- [ ] **Step 1: Write the failing test** `src/app/petition/_components/PetitionForm.test.ts`

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Draft } from "@/lib/petition";
import { PetitionForm } from "./PetitionForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const STORY = { id: "data-fin-buv11-2024", title: "Interest on the federal debt rose 52% in two years" };

function draft(text: { title: string; issue: string; request: string }): Draft {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    storyId: STORY.id,
    storyTitle: STORY.title,
    ...text,
    mp: null,
    sponsorEmail: null,
    sponsorRequestedAt: null,
    createdAt: "2026-09-26T12:00:00.000Z",
    updatedAt: "2026-09-26T12:00:00.000Z",
  };
}

const GOOD = { title: "Cut debt interest", issue: "Whereas costs rose.", request: "publish a plan." };
const render = (props: Parameters<typeof PetitionForm>[0]) => renderToStaticMarkup(createElement(PetitionForm, props));

describe("PetitionForm", () => {
  it("counts the words in the issue, the fixed opening and the request", () => {
    // 3 (issue) + 10 (opening) + 3 (request)
    expect(render({ story: STORY, draft: draft(GOOD) })).toContain("16 / 250 words");
  });

  it("enables Next when the text follows the House rules", () => {
    const html = render({ story: STORY, draft: draft(GOOD) });
    expect(html).toContain("Next: publish to the app");
    expect(html).not.toContain('disabled=""');
  });

  it("lists the problems and disables Next when the text breaks the rules", () => {
    const html = render({ story: STORY, draft: draft({ ...GOOD, issue: "Costs rose.", request: "see www.example.com" }) });
    expect(html).toContain("The issue must start with &quot;Whereas&quot;.");
    expect(html).toContain("include links.");
    expect(html).toContain('disabled=""');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/app/petition/_components/PetitionForm.test.ts`
Expected: FAIL. The text "16 / 250 words" isn't found.

- [ ] **Step 3: Replace `src/app/petition/_components/PetitionForm.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { checkCampaignText, MAX_TITLE_CHARS, PETITION_OPENING } from "@/lib/campaigns/rules";
import type { Draft } from "@/lib/petition";

type Field = "title" | "issue" | "request";
type Props = { story: { id: string; title: string }; draft?: Draft };

const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

export function PetitionForm({ story, draft }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    title: draft?.title ?? "",
    issue: draft?.issue ?? "Whereas ",
    request: draft?.request ?? "",
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The same House of Commons rules the campaigns API applies, so publishing can't fail on the text.
  const { words, maxWords, problems } = checkCampaignText(values);

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (problems.length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = draft
        ? await apiFetch<Draft>(`/api/me/drafts/${draft.id}`, { method: "PATCH", body: values })
        : await apiFetch<Draft>("/api/me/drafts", {
            method: "POST",
            body: { storyId: story.id, storyTitle: story.title, ...values },
          });
      router.push(`/petition/${saved.id}/publish`);
    } catch {
      setSaveError("We couldn't save your draft. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-2xl font-semibold">Start a campaign</h1>
      <p className="mt-1 text-sm text-muted">
        Linked to: <span className="font-medium text-ink">{story.title}</span>
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold">Title</span>
        <input className={inputClass} value={values.title} onChange={set("title")} />
      </label>
      <p className="mt-1 text-right text-xs text-muted">{`${values.title.length} / ${MAX_TITLE_CHARS}`}</p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">The issue</span>
        <span className="block text-xs text-muted">
          State facts, not opinions. Each point starts with &ldquo;Whereas&rdquo;.
        </span>
        <textarea className={`${inputClass} min-h-32`} value={values.issue} onChange={set("issue")} />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Requested action</span>
        <span className="block text-xs text-muted">{`${PETITION_OPENING}…`}</span>
        <textarea className={`${inputClass} min-h-24`} value={values.request} onChange={set("request")} />
      </label>

      <p className={`mt-2 text-right text-xs ${words > maxWords ? "text-danger" : "text-muted"}`}>
        {`${words} / ${maxWords} words`}
      </p>
      {problems.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {saveError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {saveError}
        </p>
      )}
      <button
        type="submit"
        disabled={saving || problems.length > 0}
        className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
      >
        {saving ? "Saving…" : "Next: publish to the app"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Update the page title in `src/app/petition/layout.tsx`**

Change `export const metadata: Metadata = { title: "Start a petition · wheredoesmytaxgo" };` to:

```ts
export const metadata: Metadata = { title: "Start a campaign · wheredoesmytaxgo" };
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx vitest run src/app/petition/_components/PetitionForm.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/petition/_components/PetitionForm.tsx src/app/petition/_components/PetitionForm.test.ts src/app/petition/layout.tsx
git commit -m "platform: check the House of Commons rules while writing a campaign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Step 2, Publish to the app

**Files:**
- Create: `src/lib/campaigns/publish.ts`
- Create: `src/lib/campaigns/publish.test.ts`
- Create: `src/app/petition/_components/PublishStep.tsx`
- Create: `src/app/petition/_components/PublishStep.test.ts`
- Create: `src/app/petition/[id]/publish/page.tsx`

**Interfaces:**
- Consumes: `ApiError.details` and `apiFetch` `DELETE` (Task 1), `PETITION_OPENING` from `@/lib/campaigns/rules`, and `getSavedRiding(userId): Promise<string | null>` from `@/lib/campaigns/riding`.
- Consumes: `POST /api/campaigns` with body `{ storyId, title, issue, request, postalCode?, consent: true }` → 201 `{ id }`. Its errors: 409 `already_started` with `campaignId`, 400 `invalid_postal`, `riding_required`, `invalid_text` (with `problems: string[]`), 404 `riding_not_found`, `story_not_found`, 502 `lookup_failed`.
- Produces: `CONSENT_TEXT`, `publishErrorFor(code) → { message, askPostal, editText }`, and a successful publish that navigates to `/petition/published/${id}`. An `already_started` error goes to `/petition/published/${campaignId}?existing=1` (built in Task 4).

- [ ] **Step 1: Write the failing test** `src/lib/campaigns/publish.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { CONSENT_TEXT, publishErrorFor } from "./publish";

describe("publishErrorFor", () => {
  it.each([
    ["invalid_postal", "Enter a postal code like K1P 1A4."],
    ["riding_not_found", "We couldn't find a riding for that postal code."],
    ["riding_required", "Enter your postal code so we can find your riding."],
  ])("asks for the postal code on %s", (code, message) => {
    expect(publishErrorFor(code)).toEqual({ message, askPostal: true, editText: false });
  });

  it.each([
    ["lookup_failed", "Couldn't reach the riding lookup. Try again."],
    ["story_not_found", "That story is no longer available."],
  ])("explains %s", (code, message) => {
    expect(publishErrorFor(code)).toEqual({ message, askPostal: false, editText: false });
  });

  it("sends text problems back to step 1", () => {
    expect(publishErrorFor("invalid_text")).toEqual({
      message: "Your text doesn't follow the House of Commons rules yet:",
      askPostal: false,
      editText: true,
    });
  });

  it("falls back to a general message", () => {
    expect(publishErrorFor("server_error")).toEqual({
      message: "We couldn't publish your campaign. Try again.",
      askPostal: false,
      editText: false,
    });
  });
});

describe("CONSENT_TEXT", () => {
  it("matches the campaigns API wording", () => {
    expect(CONSENT_TEXT).toBe(
      "Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it.",
    );
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/campaigns/publish.test.ts`
Expected: FAIL with "Cannot find module './publish'" or similar.

- [ ] **Step 3: Create `src/lib/campaigns/publish.ts`**

```ts
// Copy for the "Publish to the app" step. No server code here, so the client component can import it.

/** The consent checkbox, word for word as docs/campaigns-api.md gives it. */
export const CONSENT_TEXT =
  "Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it.";

export type PublishProblem = {
  message: string;
  /** Show the postal code field so the user can enter or fix it. */
  askPostal: boolean;
  /** The text itself has to change: link back to step 1. */
  editText: boolean;
};

const PROBLEMS: Record<string, PublishProblem> = {
  invalid_postal: { message: "Enter a postal code like K1P 1A4.", askPostal: true, editText: false },
  riding_not_found: { message: "We couldn't find a riding for that postal code.", askPostal: true, editText: false },
  riding_required: { message: "Enter your postal code so we can find your riding.", askPostal: true, editText: false },
  lookup_failed: { message: "Couldn't reach the riding lookup. Try again.", askPostal: false, editText: false },
  invalid_text: { message: "Your text doesn't follow the House of Commons rules yet:", askPostal: false, editText: true },
  story_not_found: { message: "That story is no longer available.", askPostal: false, editText: false },
};

/** What to tell the user when POST /api/campaigns fails with this error code. */
export function publishErrorFor(code: string): PublishProblem {
  return PROBLEMS[code] ?? { message: "We couldn't publish your campaign. Try again.", askPostal: false, editText: false };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/campaigns/publish.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Write the failing component test** `src/app/petition/_components/PublishStep.test.ts`

```ts
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Draft } from "@/lib/petition";
import { PublishStep } from "./PublishStep";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));

const DRAFT: Draft = {
  id: "00000000-0000-4000-8000-000000000001",
  storyId: "data-fin-buv11-2024",
  storyTitle: "Interest on the federal debt rose 52% in two years",
  title: "Cut debt interest",
  issue: "Whereas costs rose.",
  request: "publish a plan.",
  mp: null,
  sponsorEmail: null,
  sponsorRequestedAt: null,
  createdAt: "2026-09-26T12:00:00.000Z",
  updatedAt: "2026-09-26T12:00:00.000Z",
};

const render = (savedRiding: string | null) =>
  renderToStaticMarkup(createElement(PublishStep, { draft: DRAFT, savedRiding }));

describe("PublishStep", () => {
  it("shows the text as it will be published, with the fixed opening", () => {
    const html = render(null);
    expect(html).toContain("Cut debt interest");
    expect(html).toContain("We, the undersigned, call upon the Government of Canada to publish a plan.");
    expect(html).toContain(`href="/petition/${DRAFT.id}"`);
  });

  it("uses the saved riding, with a way to change it", () => {
    const html = render("Ottawa Centre");
    expect(html).toContain("Ottawa Centre");
    expect(html).toContain(">Change<");
    expect(html).not.toContain('placeholder="K1P 1A4"');
  });

  it("asks for a postal code when no riding is saved", () => {
    const html = render(null);
    expect(html).toContain('placeholder="K1P 1A4"');
    expect(html).toContain("never your postal code");
  });

  it("needs the consent box ticked before publishing", () => {
    const html = render("Ottawa Centre");
    expect(html).toContain(
      "Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it.",
    );
    expect(html).toContain("Publish to the app");
    expect(html).toContain('disabled=""');
  });
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npx vitest run src/app/petition/_components/PublishStep.test.ts`
Expected: FAIL with "Cannot find module './PublishStep'" or similar.

- [ ] **Step 7: Create `src/app/petition/_components/PublishStep.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import { CONSENT_TEXT, publishErrorFor, type PublishProblem } from "@/lib/campaigns/publish";
import { PETITION_OPENING } from "@/lib/campaigns/rules";
import type { Draft } from "@/lib/petition";

type Props = { draft: Draft; savedRiding: string | null };

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function PublishStep({ draft, savedRiding }: Props) {
  const router = useRouter();
  const [askPostal, setAskPostal] = useState(savedRiding === null);
  const [postalCode, setPostalCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [problem, setProblem] = useState<PublishProblem | null>(null);
  const [textProblems, setTextProblems] = useState<string[]>([]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    setPublishing(true);
    setProblem(null);
    setTextProblems([]);
    try {
      const { id } = await apiFetch<{ id: string }>("/api/campaigns", {
        method: "POST",
        body: {
          storyId: draft.storyId,
          title: draft.title,
          issue: draft.issue,
          request: draft.request,
          // Leaving the postal code out tells the API to use the saved riding.
          ...(askPostal ? { postalCode } : {}),
          consent: true,
        },
      });
      // The draft has done its job. If deleting it fails, publishing again only reopens this campaign.
      await apiFetch(`/api/me/drafts/${draft.id}`, { method: "DELETE" }).catch(() => null);
      router.push(`/petition/published/${id}`);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      const details = error instanceof ApiError ? error.details : {};
      if (code === "already_started" && typeof details.campaignId === "string") {
        router.push(`/petition/published/${details.campaignId}?existing=1`);
        return;
      }
      const found = publishErrorFor(code);
      setProblem(found);
      setTextProblems(stringList(details.problems));
      if (found.askPostal) setAskPostal(true);
      setPublishing(false);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Publish your campaign</h1>
      <p className="mt-1 text-sm text-muted">
        Once it&rsquo;s published, anyone reading this story can join it. When it has enough support, our team asks an
        MP to sponsor it.
      </p>

      <article className="mt-6 rounded-xl border border-line bg-paper p-5 text-sm">
        <h2 className="text-lg font-semibold">{draft.title}</h2>
        <p className="mt-3 whitespace-pre-wrap">{draft.issue}</p>
        <p className="mt-3 whitespace-pre-wrap">{`${PETITION_OPENING} ${draft.request}`}</p>
        <Link href={`/petition/${draft.id}`} className="mt-4 inline-block text-accent underline">
          Edit
        </Link>
      </article>

      <form onSubmit={publish} className="mt-6 space-y-4">
        {askPostal ? (
          <label className="block text-sm font-semibold">
            Your postal code
            <input
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="K1P 1A4"
              autoComplete="postal-code"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              We use it to find your riding. We save the riding, never your postal code.
            </span>
          </label>
        ) : (
          <p className="text-sm">
            Your riding: <span className="font-medium">{savedRiding}</span>{" "}
            <button type="button" onClick={() => setAskPostal(true)} className="text-accent underline">
              Change
            </button>
          </p>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1"
          />
          <span>{CONSENT_TEXT}</span>
        </label>

        {problem && (
          <div role="alert" className="text-sm text-danger">
            <p>{problem.message}</p>
            {textProblems.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {textProblems.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            )}
            {problem.editText && (
              <Link href={`/petition/${draft.id}`} className="mt-1 inline-block underline">
                Edit your text
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!consent || publishing}
          className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
        >
          {publishing ? "Publishing…" : "Publish to the app"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 8: Create `src/app/petition/[id]/publish/page.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { getSavedRiding } from "@/lib/campaigns/riding";
import { loadDraft } from "../../loadDraft";
import { PublishStep } from "../../_components/PublishStep";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function PublishPage({ params }: Props) {
  const draft = await loadDraft(params);
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={2} backHref={`/petition/${draft.id}`} />
      <PublishStep draft={draft} savedRiding={await getSavedRiding(user.id)} />
    </main>
  );
}
```

- [ ] **Step 9: Run the tests and type check**

Run: `npx vitest run src/lib/campaigns/publish.test.ts src/app/petition/_components/PublishStep.test.ts && npx tsc --noEmit`
Expected: PASS (12 tests), and no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/campaigns/publish.ts src/lib/campaigns/publish.test.ts src/app/petition/_components/PublishStep.tsx src/app/petition/_components/PublishStep.test.ts "src/app/petition/[id]/publish/page.tsx"
git commit -m "platform: publish a draft to the app as a campaign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Step 3 confirmation, and removing the old sponsor and submit steps

**Files:**
- Create: `src/app/petition/_components/PublishedSummary.tsx`
- Create: `src/app/petition/_components/PublishedSummary.test.ts`
- Create: `src/app/petition/published/[campaignId]/page.tsx`
- Delete: `src/app/petition/[id]/sponsor/page.tsx`, `src/app/petition/[id]/submit/page.tsx`, and `SponsorStep.tsx`, `LetterEditor.tsx`, `SendOptions.tsx` and `CopyField.tsx` from `src/app/petition/_components/`
- Move: `src/app/petition/_components/MpCard.tsx` → `src/components/mp/MpCard.tsx`, and `src/app/petition/_components/MpSearch.tsx` → `src/components/mp/MpSearch.tsx`
- Modify: `src/lib/mp/sponsorEmail.ts` (remove `buildLetter`, `buildEmail` and their imports)
- Modify: `src/lib/mp/sponsorEmail.test.ts` (remove the `buildLetter` and `buildEmail` tests)

**Interfaces:**
- Consumes: `getCampaign(id, viewerId): Promise<CampaignDetail | null>` from `@/lib/campaigns/campaigns`. `CampaignDetail` has `title`, `storyTitle`, `memberCount` and the other fields listed in `docs/campaigns-api.md`.
- Produces: `/petition/published/[campaignId]` (with optional `?existing=1`), and `MpCard({ mp })` and `MpSearch({ onPick })` at `@/components/mp/MpCard` and `@/components/mp/MpSearch`, which Task 7 uses.

- [ ] **Step 1: Write the failing test** `src/app/petition/_components/PublishedSummary.test.ts`

```ts
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";
import { PublishedSummary } from "./PublishedSummary";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));

const CAMPAIGN: CampaignDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Publish a plan to lower debt interest",
  storyId: "data-fin-buv11-2024",
  storyTitle: "Interest on the federal debt rose 52% in two years",
  starterFirstName: "Alice",
  memberCount: 1,
  stage: "gathering",
  createdAt: "2026-09-26T12:00:00.000Z",
  updatedAt: "2026-09-26T12:00:00.000Z",
  joined: true,
  isStarter: true,
  petition: null,
  issue: "Whereas interest on the federal debt rose 52% in two years;",
  opening: "We, the undersigned, call upon the Government of Canada to",
  request: "publish a plan.",
  teamNote: null,
  ridingCount: 1,
  canEdit: true,
  canJoin: false,
  canLeave: false,
};

const render = (campaign: CampaignDetail, existing = false) =>
  renderToStaticMarkup(createElement(PublishedSummary, { campaign, existing }));

describe("PublishedSummary", () => {
  it("confirms the campaign is on its story and explains what happens next", () => {
    const html = render(CAMPAIGN);
    expect(html).toContain("Your campaign is published");
    expect(html).toContain("Interest on the federal debt rose 52% in two years");
    expect(html).toContain("Publish a plan to lower debt interest");
    expect(html).toContain("1 member");
    expect(html).toContain("We ask an MP to sponsor it.");
    expect(html).toContain('href="/dev/petition"');
    expect(html).not.toContain("already started");
  });

  it("formats bigger member counts", () => {
    expect(render({ ...CAMPAIGN, memberCount: 1204 })).toContain("1,204 members");
  });

  it("says so when the user had already started a campaign on this story", () => {
    expect(render(CAMPAIGN, true)).toContain("already started a campaign on this story");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/petition/_components/PublishedSummary.test.ts`
Expected: FAIL with "Cannot find module './PublishedSummary'" or similar.

- [ ] **Step 3: Create `src/app/petition/_components/PublishedSummary.tsx`**

```tsx
import Link from "next/link";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";

const NEXT_STEPS = [
  "People reading the story join your campaign.",
  "When it has enough support, our team reviews it.",
  "We ask an MP to sponsor it.",
  "We open it on ourcommons.ca and email every member a link to sign.",
];

function memberLabel(count: number): string {
  return count === 1 ? "1 member" : `${count.toLocaleString("en-CA")} members`;
}

type Props = { campaign: CampaignDetail; existing: boolean };

export function PublishedSummary({ campaign, existing }: Props) {
  return (
    <section>
      {existing && (
        <p className="mb-4 rounded-lg bg-paper p-3 text-sm">
          You&rsquo;d already started a campaign on this story. Here it is.
        </p>
      )}
      <h1 className="text-2xl font-semibold">Your campaign is published</h1>
      <p className="mt-2 text-sm text-muted">
        On <span className="font-medium text-ink">{campaign.storyTitle}</span>
      </p>

      <div className="mt-6 rounded-xl border border-line bg-paper p-5">
        <h2 className="font-semibold">{campaign.title}</h2>
        <p className="mt-1 text-sm text-muted">{memberLabel(campaign.memberCount)}</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold">What happens next</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        {NEXT_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {/* Izu's story detail screen replaces this link once it exists. */}
      <Link href="/dev/petition" className="mt-8 inline-block text-sm text-accent underline">
        Back to the story
      </Link>
    </section>
  );
}
```

- [ ] **Step 4: Create `src/app/petition/published/[campaignId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaigns/campaigns";
import { PublishedSummary } from "../../_components/PublishedSummary";
import { StepHeader } from "../../_components/StepHeader";

type Props = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ existing?: string | string[] }>;
};

export default async function PublishedPage({ params, searchParams }: Props) {
  const [{ campaignId }, { existing }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const campaign = await getCampaign(campaignId, user.id);
  if (!campaign) notFound();
  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={3} backHref="/dev/petition" />
      <PublishedSummary campaign={campaign} existing={existing === "1"} />
    </main>
  );
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx vitest run src/app/petition/_components/PublishedSummary.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Remove the old steps and move the MP components**

```bash
git rm "src/app/petition/[id]/sponsor/page.tsx" "src/app/petition/[id]/submit/page.tsx" src/app/petition/_components/SponsorStep.tsx src/app/petition/_components/LetterEditor.tsx src/app/petition/_components/SendOptions.tsx src/app/petition/_components/CopyField.tsx
mkdir -p src/components/mp
git mv src/app/petition/_components/MpCard.tsx src/components/mp/MpCard.tsx
git mv src/app/petition/_components/MpSearch.tsx src/components/mp/MpSearch.tsx
```

- [ ] **Step 7: Trim `src/lib/mp/sponsorEmail.ts` to `composeLinks`**

Replace the whole file with:

```ts
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

In `src/lib/mp/sponsorEmail.test.ts`:
- change the import to `import { composeLinks } from "./sponsorEmail";`,
- delete the `MP` and `PETITION` constants,
- delete the `describe("buildLetter", …)` and `describe("buildEmail", …)` blocks,
- keep `describe("composeLinks", …)` unchanged.

- [ ] **Step 8: Check that nothing still imports the removed files**

Run: `grep -rn --include='*.ts' --include='*.tsx' -e SponsorStep -e LetterEditor -e SendOptions -e CopyField -e buildLetter -e buildEmail -e "_components/MpCard" -e "_components/MpSearch" src`
Expected: no output.

- [ ] **Step 9: Run the full checks**

Run: `npm test && npm run lint && npx tsc --noEmit && env AUTH0_DOMAIN= npm run build`
Expected:
- all tests pass,
- lint is clean,
- no type errors,
- the build succeeds and lists `/petition/[id]/publish` and `/petition/published/[campaignId]`, with no `/sponsor` or `/submit` routes.

- [ ] **Step 10: Commit**

```bash
git add -A src/app/petition src/components/mp src/lib/mp/sponsorEmail.ts src/lib/mp/sponsorEmail.test.ts
git commit -m "platform: confirm the published campaign and drop the old MP and hand-off steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Admin access, stage labels, the gear menu link and the campaign list

**Files:**
- Create: `src/lib/campaigns/stages.ts`
- Create: `src/lib/campaigns/stages.test.ts`
- Create: `src/app/admin/requireAdminPage.ts`
- Create: `src/app/admin/requireAdminPage.test.ts`
- Create: `src/app/admin/listOptions.ts`
- Create: `src/app/admin/listOptions.test.ts`
- Create: `src/app/admin/format.ts`
- Create: `src/app/admin/format.test.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/_components/AdminListFilters.tsx`
- Modify: `src/components/AccountMenu.tsx`
- Modify: `src/components/SettingsMenu.tsx`
- Modify: `src/components/SettingsMenu.test.ts`

**Interfaces:**
- Consumes: `isAdmin(user: CurrentUser | null): boolean` from `@/lib/admin`, and `getCurrentUser()` from `@/lib/auth`.
- Consumes: `listAdminCampaigns({ stage?, sort?: "members" | "updated" }): Promise<AdminCampaignRow[]>` from `@/lib/campaigns/admin`. `AdminCampaignRow` = `{ id, title, storyId, storyTitle, starterName, starterEmail, memberCount, ridingCount, stage, teamNote, petitionNumber, createdAt, updatedAt }`.
- Consumes: the `CampaignStage` type from `@/lib/campaigns/campaigns`.
- Produces:
  - `STAGE_ORDER: CampaignStage[]`, `STAGE_LABELS: Record<CampaignStage, string>` and `isStage(value): value is CampaignStage` from `@/lib/campaigns/stages`,
  - `requireAdminPage(): Promise<CurrentUser>`,
  - `formatDate(iso: string | null): string` and `formatDateTime(iso: string | null): string` from `src/app/admin/format.ts`,
  - `SettingsMenu` prop `isAdmin?: boolean`.

- [ ] **Step 1: Write the failing tests**

`src/lib/campaigns/stages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isStage, STAGE_LABELS, STAGE_ORDER } from "./stages";

describe("stages", () => {
  it("lists the stages in order with their labels", () => {
    expect(STAGE_ORDER.map((stage) => STAGE_LABELS[stage])).toEqual([
      "Gathering members",
      "In review",
      "MP asked",
      "MP agreed",
      "Live",
      "Closed",
    ]);
  });

  it("recognises stage names", () => {
    expect(isStage("mp_asked")).toBe(true);
    expect(isStage("official")).toBe(false);
    expect(isStage(undefined)).toBe(false);
  });
});
```

`src/app/admin/requireAdminPage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { requireAdminPage } from "./requireAdminPage";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));

const TEAM: CurrentUser = { id: "auth0|team", email: "team@example.ca", name: "Team Member" };

beforeEach(() => {
  vi.mocked(isAdmin).mockReset();
});

describe("requireAdminPage", () => {
  it("returns the admin", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(TEAM);
    vi.mocked(isAdmin).mockReturnValue(true);
    await expect(requireAdminPage()).resolves.toEqual(TEAM);
  });

  it("shows the not-found page to other users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(TEAM);
    vi.mocked(isAdmin).mockReturnValue(false);
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows the not-found page when nobody is logged in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(isAdmin).not.toHaveBeenCalled();
  });
});
```

`src/app/admin/listOptions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminListHref, adminListOptions } from "./listOptions";

describe("adminListOptions", () => {
  it("defaults to every stage, most members first", () => {
    expect(adminListOptions({})).toEqual({ stage: undefined, sort: "members" });
  });

  it("reads a stage and the updated sort", () => {
    expect(adminListOptions({ stage: "mp_asked", sort: "updated" })).toEqual({ stage: "mp_asked", sort: "updated" });
  });

  it("ignores unknown or repeated values", () => {
    expect(adminListOptions({ stage: "official", sort: "oldest" })).toEqual({ stage: undefined, sort: "members" });
    expect(adminListOptions({ stage: ["live", "closed"], sort: ["updated"] })).toEqual({ stage: undefined, sort: "members" });
  });
});

describe("adminListHref", () => {
  it("leaves defaults out of the link", () => {
    expect(adminListHref({})).toBe("/admin");
    expect(adminListHref({ sort: "members" })).toBe("/admin");
  });

  it("adds the stage and the updated sort", () => {
    expect(adminListHref({ stage: "live" })).toBe("/admin?stage=live");
    expect(adminListHref({ stage: "live", sort: "updated" })).toBe("/admin?stage=live&sort=updated");
  });
});
```

`src/app/admin/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
  it("shows a dash when there is no date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });

  it("uses Ottawa time, so a late-evening UTC time lands on the Ottawa day", () => {
    // 03:00 UTC on Sept 26 is 23:00 on Sept 25 in Ottawa.
    expect(formatDate("2026-09-26T03:00:00.000Z")).toContain("25");
    expect(formatDate("2026-09-26T03:00:00.000Z")).toContain("2026");
  });
});
```

In `src/components/SettingsMenu.test.ts`:
- add `type ReactNode` to the `react` import,
- add this mock after the imports:

```ts
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));
```

- add `vi` to the `vitest` import,
- add these tests inside the `describe`:

```ts
  it("links admins to the admin page", () => {
    const html = render({ name: "Team", email: "team@example.ca", canLogOut: true, isAdmin: true });
    expect(html).toContain('href="/admin"');
    expect(html).toContain(">Admin<");
  });

  it("shows no admin link to everyone else", () => {
    const html = render({ name: "Alice", email: "alice@example.com", canLogOut: true });
    expect(html).not.toContain('href="/admin"');
  });
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/campaigns/stages.test.ts src/app/admin src/components/SettingsMenu.test.ts`
Expected: FAIL. The new modules are missing and there is no admin link.

- [ ] **Step 3: Create `src/lib/campaigns/stages.ts`**

```ts
import type { CampaignStage } from "./campaigns";

// How each stage reads in the app. Kept apart from the database code so client components can import it.
export const STAGE_ORDER: CampaignStage[] = ["gathering", "in_review", "mp_asked", "mp_agreed", "live", "closed"];

export const STAGE_LABELS: Record<CampaignStage, string> = {
  gathering: "Gathering members",
  in_review: "In review",
  mp_asked: "MP asked",
  mp_agreed: "MP agreed",
  live: "Live",
  closed: "Closed",
};

export function isStage(value: unknown): value is CampaignStage {
  return typeof value === "string" && (STAGE_ORDER as string[]).includes(value);
}
```

- [ ] **Step 4: Create `src/app/admin/requireAdminPage.ts`**

```ts
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

// Admin pages look like missing pages to everyone else. The layout and every page call this,
// because a layout doesn't re-run when you move between pages on the client.
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
```

- [ ] **Step 5: Create `src/app/admin/listOptions.ts`**

```ts
import type { CampaignStage } from "@/lib/campaigns/campaigns";
import { isStage } from "@/lib/campaigns/stages";

export type AdminListOptions = { stage?: CampaignStage; sort: "members" | "updated" };

type SearchParams = { stage?: string | string[]; sort?: string | string[] };

/** Reads /admin?stage=&sort=, ignoring anything it doesn't recognise. */
export function adminListOptions(params: SearchParams): AdminListOptions {
  const stage = typeof params.stage === "string" && isStage(params.stage) ? params.stage : undefined;
  return { stage, sort: params.sort === "updated" ? "updated" : "members" };
}

/** The /admin link for a filter, leaving the defaults out so links stay short. */
export function adminListHref({ stage, sort }: Partial<AdminListOptions>): string {
  const query = new URLSearchParams();
  if (stage) query.set("stage", stage);
  if (sort === "updated") query.set("sort", "updated");
  const text = query.toString();
  return text ? `/admin?${text}` : "/admin";
}
```

- [ ] **Step 6: Create `src/app/admin/format.ts`**

```ts
// A fixed time zone, so the server and the browser render the same text (and campaigns read in Ottawa time).
const date = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "America/Toronto" });
const dateTime = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });

export function formatDate(iso: string | null): string {
  return iso ? date.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}
```

- [ ] **Step 7: Add the admin link to the gear menu**

In `src/components/SettingsMenu.tsx`:
- add `import Link from "next/link";` above the `react` import,
- add `isAdmin?: boolean;` to `Props`,
- change the signature to `export function SettingsMenu({ name, email, canLogOut, isAdmin = false }: Props) {`,
- replace the line `<div className="my-3 border-t border-line" />` with:

```tsx
        {isAdmin && (
          <>
            <div className="my-3 border-t border-line" />
            <Link href="/admin" className="block rounded px-2 py-1.5 -mx-2 hover:bg-canvas">
              Admin
            </Link>
          </>
        )}
        <div className="my-3 border-t border-line" />
```

Replace `src/components/AccountMenu.tsx` with:

```tsx
import { SettingsMenu } from "@/components/SettingsMenu";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth0";

// The header gear: shows who is signed in, links our team to /admin, and lets them log out.
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <SettingsMenu name={user.name} email={user.email} canLogOut={isAuthConfigured()} isAdmin={isAdmin(user)} />
  );
}
```

- [ ] **Step 8: Create `src/app/admin/layout.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { requireAdminPage } from "./requireAdminPage";

export const metadata: Metadata = { title: "Admin · wheredoesmytaxgo" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin" className="text-sm font-semibold">
            wheredoesmytaxgo admin
          </Link>
          <AccountMenu />
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create `src/app/admin/_components/AdminListFilters.tsx`**

```tsx
import Link from "next/link";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/campaigns/stages";
import { adminListHref, type AdminListOptions } from "../listOptions";

const chip = "rounded-full border px-3 py-1 text-sm";

function chipClass(active: boolean): string {
  return `${chip} ${active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`;
}

export function AdminListFilters({ current }: { current: AdminListOptions }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link href={adminListHref({ sort: current.sort })} className={chipClass(!current.stage)}>
          All stages
        </Link>
        {STAGE_ORDER.map((stage) => (
          <Link key={stage} href={adminListHref({ stage, sort: current.sort })} className={chipClass(current.stage === stage)}>
            {STAGE_LABELS[stage]}
          </Link>
        ))}
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-muted">Sort:</span>
        <Link href={adminListHref({ stage: current.stage })} className={current.sort === "members" ? "font-semibold" : "underline"}>
          Most members
        </Link>
        <Link
          href={adminListHref({ stage: current.stage, sort: "updated" })}
          className={current.sort === "updated" ? "font-semibold" : "underline"}
        >
          Recently updated
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Create `src/app/admin/page.tsx`**

```tsx
import Link from "next/link";
import { listAdminCampaigns } from "@/lib/campaigns/admin";
import { STAGE_LABELS } from "@/lib/campaigns/stages";
import { AdminListFilters } from "./_components/AdminListFilters";
import { formatDate } from "./format";
import { adminListOptions } from "./listOptions";
import { requireAdminPage } from "./requireAdminPage";

type Props = { searchParams: Promise<{ stage?: string | string[]; sort?: string | string[] }> };

const cell = "p-3";

export default async function AdminPage({ searchParams }: Props) {
  await requireAdminPage();
  const options = adminListOptions(await searchParams);
  const rows = await listAdminCampaigns(options);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <AdminListFilters current={options} />
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No campaigns yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className={cell}>Campaign</th>
                <th className={cell}>Story</th>
                <th className={cell}>Starter</th>
                <th className={`${cell} text-right`}>Members</th>
                <th className={`${cell} text-right`}>Ridings</th>
                <th className={cell}>Stage</th>
                <th className={cell}>Petition</th>
                <th className={cell}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={cell}>
                    <Link href={`/admin/campaigns/${row.id}`} className="font-medium underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className={`${cell} text-muted`}>{row.storyTitle}</td>
                  <td className={cell}>{row.starterName ?? "—"}</td>
                  <td className={`${cell} text-right tabular-nums`}>{row.memberCount.toLocaleString("en-CA")}</td>
                  <td className={`${cell} text-right tabular-nums`}>{row.ridingCount}</td>
                  <td className={cell}>{STAGE_LABELS[row.stage]}</td>
                  <td className={cell}>{row.petitionNumber ?? "—"}</td>
                  <td className={`${cell} text-muted`}>{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 11: Run the tests, type check and lint**

Run: `npx vitest run src/lib/campaigns/stages.test.ts src/app/admin src/components/SettingsMenu.test.ts && npx tsc --noEmit && npm run lint`
Expected: all of those tests pass, with no type errors and lint clean.

- [ ] **Step 12: Commit**

```bash
git add src/lib/campaigns/stages.ts src/lib/campaigns/stages.test.ts src/app/admin src/components/AccountMenu.tsx src/components/SettingsMenu.tsx src/components/SettingsMenu.test.ts
git commit -m "platform: admin-only campaign list and an Admin link in the gear menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin campaign page, with overview, stage and note, and members

**Files:**
- Create: `src/lib/campaigns/memberList.ts`
- Create: `src/lib/campaigns/memberList.test.ts`
- Create: `src/app/admin/campaigns/[id]/page.tsx`
- Create: `src/app/admin/_components/CampaignOverview.tsx`
- Create: `src/app/admin/_components/StageControls.tsx`
- Create: `src/app/admin/_components/MembersSection.tsx`

**Interfaces:**
- Consumes:
  - `getCampaign(id, viewerId)`,
  - `listCampaignMembers(id): Promise<CampaignMemberExport[]>`, where `CampaignMemberExport` = `{ name: string | null; email: string | null; riding: string | null; isStarter: boolean; joinedAt: string }`, with the starter first,
  - `STAGE_ORDER` and `STAGE_LABELS`, and `requireAdminPage`, `formatDate` and `formatDateTime` (Task 5),
  - `PATCH /api/admin/campaigns/:id` with body `{ stage?, teamNote? }`, which can return 409 `needs_petition`.
- Produces: `ridingBreakdown(members): { riding: string; count: number }[]` and `membersCsv(members): string`. The page exports `version`-keyed sections; Tasks 7 and 8 add more sections to this page.

- [ ] **Step 1: Write the failing test** `src/lib/campaigns/memberList.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { CampaignMemberExport } from "./admin";
import { membersCsv, ridingBreakdown } from "./memberList";

const member = (overrides: Partial<CampaignMemberExport>): CampaignMemberExport => ({
  name: "Alice Martin",
  email: "alice@example.com",
  riding: "Ottawa Centre",
  isStarter: false,
  joinedAt: "2026-09-26T12:00:00.000Z",
  ...overrides,
});

describe("ridingBreakdown", () => {
  it("counts members per riding, biggest first, with unknown ridings last", () => {
    const members = [
      member({ riding: "Ottawa Centre" }),
      member({ riding: "Ottawa South" }),
      member({ riding: "Ottawa Centre" }),
      member({ riding: null }),
    ];
    expect(ridingBreakdown(members)).toEqual([
      { riding: "Ottawa Centre", count: 2 },
      { riding: "Ottawa South", count: 1 },
      { riding: "Unknown riding", count: 1 },
    ]);
  });

  it("orders ties by riding name", () => {
    expect(ridingBreakdown([member({ riding: "Spadina—Harbourfront" }), member({ riding: "Kanata" })])).toEqual([
      { riding: "Kanata", count: 1 },
      { riding: "Spadina—Harbourfront", count: 1 },
    ]);
  });
});

describe("membersCsv", () => {
  it("writes a header and one line per member", () => {
    expect(membersCsv([member({}), member({ name: null, email: "bob@example.com", riding: null })])).toBe(
      "name,email,riding,joined_at\r\n" +
        "Alice Martin,alice@example.com,Ottawa Centre,2026-09-26T12:00:00.000Z\r\n" +
        ",bob@example.com,,2026-09-26T12:00:00.000Z\r\n",
    );
  });

  it("quotes values with commas, quotes or line breaks", () => {
    const csv = membersCsv([member({ name: 'Martin, "Al"\nJr' })]);
    expect(csv.split("\r\n")[1]).toBe('"Martin, ""Al""\nJr",alice@example.com,Ottawa Centre,2026-09-26T12:00:00.000Z');
  });

  it("stops spreadsheet apps from running a name as a formula", () => {
    const csv = membersCsv([member({ name: "=HYPERLINK(1)" }), member({ name: "@SUM(A1), x" })]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("'=HYPERLINK(1),")).toBe(true);
    expect(lines[2].startsWith(`"'@SUM(A1), x",`)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/campaigns/memberList.test.ts`
Expected: FAIL with "Cannot find module './memberList'" or similar.

- [ ] **Step 3: Create `src/lib/campaigns/memberList.ts`**

```ts
import type { CampaignMemberExport } from "./admin";

// Member list helpers for the admin page. Types only from ./admin, so the browser can use these to build the CSV.

export type RidingCount = { riding: string; count: number };

/** Members per riding, biggest first, ties by name; members without a riding are counted last. */
export function ridingBreakdown(members: Pick<CampaignMemberExport, "riding">[]): RidingCount[] {
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const { riding } of members) {
    if (riding) counts.set(riding, (counts.get(riding) ?? 0) + 1);
    else unknown += 1;
  }
  const rows = [...counts]
    .map(([riding, count]) => ({ riding, count }))
    .sort((a, b) => b.count - a.count || a.riding.localeCompare(b.riding));
  if (unknown > 0) rows.push({ riding: "Unknown riding", count: unknown });
  return rows;
}

function csvField(value: string | null): string {
  let text = value ?? "";
  // Names are typed by users; spreadsheet apps run cells starting with = + - @ as formulas.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The members as CSV (RFC 4180, CRLF line endings) for sending to an MP. */
export function membersCsv(members: CampaignMemberExport[]): string {
  const lines = [
    ["name", "email", "riding", "joined_at"],
    ...members.map((member) => [member.name, member.email, member.riding, member.joinedAt]),
  ];
  return lines.map((fields) => fields.map(csvField).join(",")).join("\r\n") + "\r\n";
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/campaigns/memberList.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create `src/app/admin/_components/CampaignOverview.tsx`**

```tsx
import type { CampaignMemberExport } from "@/lib/campaigns/admin";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";
import { STAGE_LABELS } from "@/lib/campaigns/stages";
import { formatDate } from "../format";

type Props = { campaign: CampaignDetail; starter: CampaignMemberExport | undefined };

export function CampaignOverview({ campaign, starter }: Props) {
  const starterText = starter
    ? [starter.name ?? "No name", starter.email ?? "no email"].join(" · ")
    : campaign.starterFirstName;

  return (
    <section>
      <p className="text-sm text-muted">On {campaign.storyTitle}</p>
      <h1 className="mt-1 text-2xl font-semibold">{campaign.title}</h1>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Starter</dt>
          <dd>{starterText}</dd>
        </div>
        <div>
          <dt className="text-muted">Started</dt>
          <dd>{formatDate(campaign.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Stage</dt>
          <dd>{STAGE_LABELS[campaign.stage]}</dd>
        </div>
        <div>
          <dt className="text-muted">Team note</dt>
          <dd>{campaign.teamNote ?? "None"}</dd>
        </div>
      </dl>
      <article className="mt-6 rounded-xl border border-line bg-paper p-5 text-sm">
        <p className="whitespace-pre-wrap">{campaign.issue}</p>
        <p className="mt-3 whitespace-pre-wrap">{`${campaign.opening} ${campaign.request}`}</p>
      </article>
    </section>
  );
}
```

- [ ] **Step 6: Create `src/app/admin/_components/StageControls.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import type { CampaignDetail, CampaignStage } from "@/lib/campaigns/campaigns";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/campaigns/stages";

type Props = { campaign: Pick<CampaignDetail, "id" | "stage" | "teamNote" | "petition"> };

export function StageControls({ campaign }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(campaign.teamNote ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(change: { stage?: CampaignStage; teamNote?: string | null }) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/campaigns/${campaign.id}`, { method: "PATCH", body: change });
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "needs_petition"
          ? "Attach the ourcommons.ca petition first."
          : "Couldn't save that. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || refreshing;

  return (
    <section>
      <h2 className="text-lg font-semibold">Stage</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {STAGE_ORDER.map((stage) => {
          const current = stage === campaign.stage;
          const needsPetition = stage === "live" && !campaign.petition;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={current}
              disabled={busy || current || needsPetition}
              onClick={() => save({ stage })}
              className={`rounded-full border px-3 py-1 text-sm ${
                current ? "border-ink bg-ink text-paper" : "border-line bg-paper disabled:opacity-50"
              }`}
            >
              {STAGE_LABELS[stage]}
            </button>
          );
        })}
      </div>
      {!campaign.petition && (
        <p className="mt-2 text-xs text-muted">Live needs the ourcommons.ca petition attached first.</p>
      )}

      <label className="mt-6 block text-sm font-semibold">
        Team note
        <span className="block text-xs font-normal text-muted">Shown publicly on the campaign.</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          className="mt-2 min-h-20 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => save({ teamNote: note.trim() || null })}
        className="mt-2 rounded-lg border border-ink px-4 py-2 text-sm disabled:opacity-60"
      >
        Save note
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Create `src/app/admin/_components/MembersSection.tsx`**

```tsx
"use client";

import type { CampaignMemberExport } from "@/lib/campaigns/admin";
import { membersCsv, ridingBreakdown } from "@/lib/campaigns/memberList";
import { formatDate } from "../format";

type Props = { campaignId: string; members: CampaignMemberExport[] };

const cell = "p-3";

export function MembersSection({ campaignId, members }: Props) {
  const ridings = ridingBreakdown(members);

  function download() {
    const url = URL.createObjectURL(new Blob([membersCsv(members)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-${campaignId.slice(0, 8)}-members.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{`Members (${members.length.toLocaleString("en-CA")})`}</h2>
        <button type="button" onClick={download} className="rounded-lg border border-ink px-4 py-2 text-sm">
          Download CSV
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{ridings.map((row) => `${row.riding} ${row.count}`).join(" · ")}</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className={cell}>Name</th>
              <th className={cell}>Email</th>
              <th className={cell}>Riding</th>
              <th className={cell}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={`${member.email}-${member.joinedAt}`} className="border-b border-line last:border-0">
                <td className={cell}>
                  {member.name ?? "—"}
                  {member.isStarter && <span className="ml-2 rounded bg-canvas px-1.5 py-0.5 text-xs">Starter</span>}
                </td>
                <td className={cell}>{member.email ?? "—"}</td>
                <td className={cell}>{member.riding ?? "Unknown riding"}</td>
                <td className={`${cell} text-muted`}>{formatDate(member.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Create `src/app/admin/campaigns/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCampaignMembers } from "@/lib/campaigns/admin";
import { getCampaign } from "@/lib/campaigns/campaigns";
import { CampaignOverview } from "../../_components/CampaignOverview";
import { MembersSection } from "../../_components/MembersSection";
import { StageControls } from "../../_components/StageControls";
import { requireAdminPage } from "../../requireAdminPage";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCampaignPage({ params }: Props) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const campaign = await getCampaign(id, admin.id);
  if (!campaign) notFound();
  const members = await listCampaignMembers(id);
  // Sections that copy saved values into form state remount whenever the saved campaign changes.
  const version = [
    campaign.updatedAt,
    campaign.stage,
    campaign.teamNote,
    campaign.petition?.number,
    campaign.petition?.syncedAt,
  ].join("|");

  return (
    <main className="space-y-10">
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← All campaigns
      </Link>
      <CampaignOverview campaign={campaign} starter={members.find((member) => member.isStarter)} />
      <StageControls key={`stage-${version}`} campaign={campaign} />
      <MembersSection campaignId={campaign.id} members={members} />
    </main>
  );
}
```

- [ ] **Step 9: Run the checks**

Run: `npx vitest run src/lib/campaigns/memberList.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS, with no type errors and lint clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/campaigns/memberList.ts src/lib/campaigns/memberList.test.ts "src/app/admin/campaigns/[id]/page.tsx" src/app/admin/_components/CampaignOverview.tsx src/app/admin/_components/StageControls.tsx src/app/admin/_components/MembersSection.tsx
git commit -m "platform: admin campaign page with stages, team note and members CSV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Asking an MP

**Files:**
- Modify: `src/lib/mp/sponsorEmail.ts` (`composeLinks` gains `authuser`)
- Modify: `src/lib/mp/sponsorEmail.test.ts`
- Create: `src/lib/campaigns/outreach.ts`
- Create: `src/lib/campaigns/outreach.test.ts`
- Create: `src/app/admin/_components/MpAsk.tsx`
- Modify: `src/app/admin/campaigns/[id]/page.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes:
  - `MpCard` and `MpSearch` from `@/components/mp/*` (Task 4),
  - the `Mp` type from `@/lib/mp/types` (`name`, `riding`, `party`, `email`, `photoUrl`, `profileUrl`, `hillPhone`, `ridingPhone`),
  - `PETITION_OPENING` and `SIGNATURES_NEEDED` from `@/lib/campaigns/rules`,
  - `copyText`, and `PATCH /api/admin/campaigns/:id`.
- Produces:
  - `composeLinks({ to, subject, body, authuser? })`,
  - `type Email = { subject: string; body: string }`,
  - `buildMpAsk({ campaign: { title, issue, request }, mp: { name, riding }, members: { riding: string | null }[] }): Email`,
  - the page reads `TEAM_GMAIL`, which Task 8 also uses.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("composeLinks", …)` in `src/lib/mp/sponsorEmail.test.ts`:

```ts
  it("opens Gmail in the team's account when one is given", () => {
    const withAccount = composeLinks({
      to: "mp@parl.gc.ca",
      subject: "A & B",
      body: "Line 1\nLine 2",
      authuser: "team@gmail.com",
    });
    expect(withAccount.gmail).toBe(
      "https://mail.google.com/mail/?authuser=team%40gmail.com&view=cm&fs=1&to=mp%40parl.gc.ca&su=A%20%26%20B&body=Line%201%0ALine%202",
    );
    expect(withAccount.outlook).toBe(links.outlook);
  });
```

Create `src/lib/campaigns/outreach.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMpAsk } from "./outreach";

const CAMPAIGN = {
  title: "Publish a plan to lower debt interest",
  issue: "Whereas interest on the federal debt rose 52% in two years;",
  request: "publish a plan to reduce what Canadians pay in debt interest.",
};
const MP = { name: "Yasir Naqvi", riding: "Ottawa Centre" };
const members = (...ridings: (string | null)[]) => ridings.map((riding) => ({ riding }));

describe("buildMpAsk", () => {
  it("writes the ask with the campaign text and member counts", () => {
    const { subject, body } = buildMpAsk({
      campaign: CAMPAIGN,
      mp: MP,
      members: members("Ottawa Centre", "Ottawa South", "Ottawa Centre"),
    });
    expect(subject).toBe("Request to sponsor an e-petition: Publish a plan to lower debt interest");
    expect(body).toBe(
      [
        "Dear Yasir Naqvi,",
        "",
        "We're writing from wheredoesmytaxgo, where Canadians follow federal spending and organize around it. One of our campaigns is looking for an MP to sponsor it:",
        "",
        "Publish a plan to lower debt interest",
        "",
        "Whereas interest on the federal debt rose 52% in two years;",
        "",
        "We, the undersigned, call upon the Government of Canada to publish a plan to reduce what Canadians pay in debt interest.",
        "",
        "This campaign has 3 members from 2 ridings, including 2 in Ottawa Centre. We can share the member list so you can verify them.",
        "",
        "Would you sponsor it? Once you agree, we'll create it on ourcommons.ca and name you as the sponsor. Sponsoring doesn't mean you endorse it: it lets Canadians sign it and, with 500 signatures, have it presented in the House.",
        "",
        "Thank you,",
        "The wheredoesmytaxgo team",
      ].join("\n"),
    );
  });

  it("uses singular words for one member in one riding", () => {
    const { body } = buildMpAsk({ campaign: CAMPAIGN, mp: MP, members: members("Ottawa Centre") });
    expect(body).toContain("This campaign has 1 member from 1 riding, including 1 in Ottawa Centre.");
  });

  it("leaves out the local count when nobody is from the MP's riding", () => {
    const { body } = buildMpAsk({ campaign: CAMPAIGN, mp: MP, members: members("Ottawa South") });
    expect(body).toContain("This campaign has 1 member from 1 riding. We can share");
    expect(body).not.toContain("including");
  });

  it("doesn't count a missing riding as a riding", () => {
    const { body } = buildMpAsk({ campaign: CAMPAIGN, mp: MP, members: members("Ottawa Centre", null) });
    expect(body).toContain("This campaign has 2 members from 1 riding, including 1 in Ottawa Centre.");
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/mp/sponsorEmail.test.ts src/lib/campaigns/outreach.test.ts`
Expected: FAIL. The Gmail link has no `authuser`, and `./outreach` doesn't exist.

- [ ] **Step 3: Add `authuser` to `composeLinks`** (replace the whole `src/lib/mp/sponsorEmail.ts`)

```ts
export type ComposeLinks = { gmail: string; outlook: string; mailto: string };

type ComposeInput = {
  to: string;
  subject: string;
  body: string;
  /** Open Gmail in this Google account, e.g. the app's Gmail, when the browser is signed into several. */
  authuser?: string | null;
};

export function composeLinks({ to, subject, body, authuser }: ComposeInput): ComposeLinks {
  const e = encodeURIComponent;
  const account = authuser ? `authuser=${e(authuser)}&` : "";
  return {
    gmail: `https://mail.google.com/mail/?${account}view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`,
    mailto: `mailto:${to}?subject=${e(subject)}&body=${e(body)}`,
  };
}
```

- [ ] **Step 4: Create `src/lib/campaigns/outreach.ts`**

```ts
import type { Mp } from "@/lib/mp/types";
import { PETITION_OPENING, SIGNATURES_NEEDED } from "./rules";

// Emails our team sends by hand from the admin page. No server code, so the admin page's client components can use it.

export type Email = { subject: string; body: string };

type CampaignText = { title: string; issue: string; request: string };

function count(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-CA")} ${n === 1 ? one : many}`;
}

/** The email asking an MP to sponsor a campaign, with the member numbers they can verify. */
export function buildMpAsk({
  campaign,
  mp,
  members,
}: {
  campaign: CampaignText;
  mp: Pick<Mp, "name" | "riding">;
  members: { riding: string | null }[];
}): Email {
  const ridings = new Set(members.map((member) => member.riding).filter(Boolean)).size;
  const local = members.filter((member) => member.riding === mp.riding).length;
  const localText = local > 0 ? `, including ${local.toLocaleString("en-CA")} in ${mp.riding}` : "";

  return {
    subject: `Request to sponsor an e-petition: ${campaign.title}`,
    body: [
      `Dear ${mp.name},`,
      "",
      "We're writing from wheredoesmytaxgo, where Canadians follow federal spending and organize around it. One of our campaigns is looking for an MP to sponsor it:",
      "",
      campaign.title,
      "",
      campaign.issue,
      "",
      `${PETITION_OPENING} ${campaign.request}`,
      "",
      `This campaign has ${count(members.length, "member", "members")} from ${count(ridings, "riding", "ridings")}${localText}. We can share the member list so you can verify them.`,
      "",
      `Would you sponsor it? Once you agree, we'll create it on ourcommons.ca and name you as the sponsor. Sponsoring doesn't mean you endorse it: it lets Canadians sign it and, with ${SIGNATURES_NEEDED} signatures, have it presented in the House.`,
      "",
      "Thank you,",
      "The wheredoesmytaxgo team",
    ].join("\n"),
  };
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run src/lib/mp/sponsorEmail.test.ts src/lib/campaigns/outreach.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/app/admin/_components/MpAsk.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MpCard } from "@/components/mp/MpCard";
import { MpSearch } from "@/components/mp/MpSearch";
import { apiFetch } from "@/lib/apiFetch";
import type { CampaignMemberExport } from "@/lib/campaigns/admin";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";
import { buildMpAsk } from "@/lib/campaigns/outreach";
import { copyText } from "@/lib/clipboard";
import { composeLinks } from "@/lib/mp/sponsorEmail";
import type { Mp } from "@/lib/mp/types";

type Props = { campaign: CampaignDetail; members: CampaignMemberExport[]; teamGmail: string | null };

const buttonClass = "rounded-lg border border-line bg-paper px-4 py-2 text-center text-sm font-medium hover:border-ink";

export function MpAsk({ campaign, members, teamGmail }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [searching, setSearching] = useState(false);
  const [mp, setMp] = useState<Mp | null>(null);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(picked: Mp) {
    setMp(picked);
    setSearching(false);
    setCopied("idle");
    setNote(`We've asked ${picked.name} (${picked.riding}) to sponsor this campaign.`);
  }

  const email = mp ? buildMpAsk({ campaign, mp, members }) : null;
  const links = mp?.email && email ? composeLinks({ to: mp.email, ...email, authuser: teamGmail }) : null;

  async function copy() {
    if (!mp || !email) return;
    const text = `To: ${mp.email ?? ""}\nSubject: ${email.subject}\n\n${email.body}`;
    setCopied((await copyText(text)) ? "copied" : "failed");
  }

  async function markAsked() {
    setSaving(true);
    setError(null);
    const teamNote = note.trim();
    try {
      await apiFetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: teamNote ? { stage: "mp_asked", teamNote } : { stage: "mp_asked" },
      });
      startRefresh(() => router.refresh());
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Ask an MP</h2>
      {searching ? (
        <div className="mt-3">
          <MpSearch onPick={pick} />
        </div>
      ) : !mp ? (
        <button type="button" onClick={() => setSearching(true)} className={`mt-3 ${buttonClass}`}>
          Choose an MP
        </button>
      ) : (
        <div className="mt-3 space-y-4">
          <MpCard mp={mp} />
          <button type="button" onClick={() => setSearching(true)} className="text-sm underline">
            Choose a different MP
          </button>

          {email && (
            <div className="rounded-xl border border-line bg-paper p-4 text-sm">
              <p className="font-semibold">{email.subject}</p>
              <p className="mt-3 whitespace-pre-wrap">{email.body}</p>
            </div>
          )}
          {!mp.email && (
            <p className="text-sm text-danger">This MP has no public email address. Copy the email and send it another way.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {links && (
              <>
                <a href={links.gmail} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                  Open in Gmail
                </a>
                <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                  Open in Outlook
                </a>
                <a href={links.mailto} className={buttonClass}>
                  Use my email app
                </a>
              </>
            )}
            <button type="button" onClick={copy} className={buttonClass}>
              {copied === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          {copied === "failed" && (
            <p className="text-xs text-danger">Couldn&rsquo;t copy. Select the email above and copy it by hand.</p>
          )}

          <label className="block text-sm font-semibold">
            Team note when marking as asked
            <span className="block text-xs font-normal text-muted">Shown publicly on the campaign. Leave it empty to skip.</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              className="mt-2 min-h-16 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="button"
            disabled={saving || refreshing}
            onClick={markAsked}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
          >
            Mark as MP asked
          </button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Add `MpAsk` to `src/app/admin/campaigns/[id]/page.tsx`**

Add the import `import { MpAsk } from "../../_components/MpAsk";`. After the `version` constant, add:

```tsx
  const teamGmail = process.env.TEAM_GMAIL?.trim() || null;
```

After `<MembersSection … />`, add:

```tsx
      <MpAsk campaign={campaign} members={members} teamGmail={teamGmail} />
```

- [ ] **Step 8: Document the settings in `.env.example`**

Append:

```
# Team-only /admin page: comma-separated login emails of our team (Raphael's src/lib/admin.ts reads it).
ADMIN_EMAILS=

# Optional: the app's Gmail address, so the admin page's Gmail buttons open in that account.
TEAM_GMAIL=
```

- [ ] **Step 9: Run the checks**

Run: `npx vitest run src/lib/mp/sponsorEmail.test.ts src/lib/campaigns/outreach.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS, with no type errors and lint clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/mp/sponsorEmail.ts src/lib/mp/sponsorEmail.test.ts src/lib/campaigns/outreach.ts src/lib/campaigns/outreach.test.ts src/app/admin/_components/MpAsk.tsx "src/app/admin/campaigns/[id]/page.tsx" .env.example
git commit -m "platform: write and send the MP sponsor ask from the admin page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Attaching the official petition and telling members to sign

**Files:**
- Modify: `src/lib/campaigns/outreach.ts` (add `buildSignNow`)
- Modify: `src/lib/campaigns/outreach.test.ts`
- Create: `src/app/admin/_components/petitionMessages.ts`
- Create: `src/app/admin/_components/petitionMessages.test.ts`
- Create: `src/app/admin/_components/PetitionSection.tsx`
- Create: `src/app/admin/_components/SignNow.tsx`
- Modify: `src/app/admin/campaigns/[id]/page.tsx`

**Interfaces:**
- Consumes: `PUT /api/admin/campaigns/:id/petition` with body `{ number, title }`, which returns `{ sync: "synced" | "not_found" | "failed", campaign: CampaignDetail }`. Its errors: 400 `invalid_body`, `invalid_petition_number`, 404 `not_found`, 409 `petition_taken`.
- Consumes: `POST /api/admin/petitions/sync`, which returns `{ synced, notFound, failed }`.
- Consumes: `CampaignDetail.petition: PetitionCard | null`, where `PetitionCard` = `{ number, title, url, signatures, status: "pending" | "open" | "closed" | "presented" | "response", sponsorName, sponsorRiding, openedAt, closesAt, presentedAt, responseTabledAt, syncedAt, … }`.
- Consumes: `formatDate`, `formatDateTime`, `copyText`, `composeLinks` and `SIGNATURES_NEEDED`.
- Produces: `buildSignNow({ campaign: { title }, petition: { number, url } }): Email`, and `attachMessage`, `attachErrorFor`, `syncSummary` and `PETITION_STATUS_LABELS`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/campaigns/outreach.test.ts` (and change its import to `import { buildMpAsk, buildSignNow } from "./outreach";`):

```ts
describe("buildSignNow", () => {
  it("tells members where to sign and that the confirmation email matters", () => {
    const { subject, body } = buildSignNow({
      campaign: { title: "Publish a plan to lower debt interest" },
      petition: { number: "e-7203", url: "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-7203" },
    });
    expect(subject).toBe("It's live: sign Publish a plan to lower debt interest on ourcommons.ca");
    expect(body).toBe(
      [
        "The campaign you joined is now official petition e-7203. Sign it here:",
        "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-7203",
        "",
        "Your signature only counts after you confirm the email from the House of Commons.",
        "",
        "Thank you,",
        "The wheredoesmytaxgo team",
      ].join("\n"),
    );
  });
});
```

Create `src/app/admin/_components/petitionMessages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { attachErrorFor, attachMessage, PETITION_STATUS_LABELS, syncSummary } from "./petitionMessages";

describe("attachMessage", () => {
  it("confirms a petition found on ourcommons.ca", () => {
    expect(attachMessage("synced", "e-7203")).toBe("Attached and updated from ourcommons.ca.");
  });

  it("explains that a new petition takes a few days to appear", () => {
    expect(attachMessage("not_found", "e-7203")).toBe(
      "Saved. ourcommons.ca doesn't show e-7203 yet. That's normal until the Clerk of Petitions publishes it, usually 3–5 working days after the MP accepts. It updates automatically.",
    );
  });

  it("says when ourcommons.ca couldn't be reached", () => {
    expect(attachMessage("failed", "e-7203")).toBe("Saved, but we couldn't reach ourcommons.ca. Use Refresh later.");
  });
});

describe("attachErrorFor", () => {
  it.each([
    ["invalid_petition_number", "That doesn't look like a petition number (e.g. e-7203)."],
    ["petition_taken", "That petition is already attached to another campaign."],
    ["invalid_body", "Enter the petition number and its title."],
    ["server_error", "Couldn't attach the petition. Try again."],
  ])("%s", (code, message) => {
    expect(attachErrorFor(code)).toBe(message);
  });
});

describe("syncSummary", () => {
  it("sums up a refresh", () => {
    expect(syncSummary({ synced: 3, notFound: 1, failed: 0 })).toBe("3 updated · 1 not published yet · 0 failed");
  });
});

describe("PETITION_STATUS_LABELS", () => {
  it("has a label for every status", () => {
    expect(PETITION_STATUS_LABELS).toEqual({
      pending: "Waiting for ourcommons.ca",
      open: "Open for signature",
      closed: "Closed",
      presented: "Presented to the House",
      response: "Government response tabled",
    });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/campaigns/outreach.test.ts src/app/admin/_components/petitionMessages.test.ts`
Expected: FAIL. `buildSignNow` isn't exported, and `./petitionMessages` doesn't exist.

- [ ] **Step 3: Add `buildSignNow` to `src/lib/campaigns/outreach.ts`**

```ts
/** The "it's live, sign here" email for every member, sent by hand with the addresses in BCC. */
export function buildSignNow({
  campaign,
  petition,
}: {
  campaign: { title: string };
  petition: { number: string; url: string };
}): Email {
  return {
    subject: `It's live: sign ${campaign.title} on ourcommons.ca`,
    body: [
      `The campaign you joined is now official petition ${petition.number}. Sign it here:`,
      // On its own line so email apps don't fold punctuation into the link.
      petition.url,
      "",
      "Your signature only counts after you confirm the email from the House of Commons.",
      "",
      "Thank you,",
      "The wheredoesmytaxgo team",
    ].join("\n"),
  };
}
```

- [ ] **Step 4: Create `src/app/admin/_components/petitionMessages.ts`**

```ts
import type { PetitionCard } from "@/lib/petitions/petitions";

export type AttachSync = "synced" | "not_found" | "failed";

export const PETITION_STATUS_LABELS: Record<PetitionCard["status"], string> = {
  pending: "Waiting for ourcommons.ca",
  open: "Open for signature",
  closed: "Closed",
  presented: "Presented to the House",
  response: "Government response tabled",
};

/** What attaching a petition number did, from the API's sync result. */
export function attachMessage(sync: AttachSync, number: string): string {
  switch (sync) {
    case "synced":
      return "Attached and updated from ourcommons.ca.";
    case "not_found":
      return `Saved. ourcommons.ca doesn't show ${number} yet. That's normal until the Clerk of Petitions publishes it, usually 3–5 working days after the MP accepts. It updates automatically.`;
    case "failed":
      return "Saved, but we couldn't reach ourcommons.ca. Use Refresh later.";
  }
}

export function attachErrorFor(code: string): string {
  switch (code) {
    case "invalid_petition_number":
      return "That doesn't look like a petition number (e.g. e-7203).";
    case "petition_taken":
      return "That petition is already attached to another campaign.";
    case "invalid_body":
      return "Enter the petition number and its title.";
    default:
      return "Couldn't attach the petition. Try again.";
  }
}

export function syncSummary(result: { synced: number; notFound: number; failed: number }): string {
  return `${result.synced} updated · ${result.notFound} not published yet · ${result.failed} failed`;
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run src/lib/campaigns/outreach.test.ts src/app/admin/_components/petitionMessages.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/app/admin/_components/PetitionSection.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";
import { SIGNATURES_NEEDED } from "@/lib/campaigns/rules";
import { formatDate, formatDateTime } from "../format";
import { attachErrorFor, attachMessage, PETITION_STATUS_LABELS, syncSummary, type AttachSync } from "./petitionMessages";

type Props = { campaign: CampaignDetail };
type AttachResult = { sync: AttachSync; campaign: CampaignDetail };
type SyncResult = { synced: number; notFound: number; failed: number };

const inputClass = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-normal";

export function PetitionSection({ campaign }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const petition = campaign.petition;
  const [number, setNumber] = useState(petition?.number ?? "");
  const [title, setTitle] = useState(petition?.title ?? campaign.title);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function attach(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiFetch<AttachResult>(`/api/admin/campaigns/${campaign.id}/petition`, {
        method: "PUT",
        body: { number, title },
      });
      setMessage(attachMessage(result.sync, result.campaign.petition?.number ?? number.trim()));
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(attachErrorFor(caught instanceof ApiError ? caught.code : ""));
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      setMessage(syncSummary(await apiFetch<SyncResult>("/api/admin/petitions/sync", { method: "POST" })));
      startRefresh(() => router.refresh());
    } catch {
      setError("Couldn't reach ourcommons.ca. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  const sponsor = petition?.sponsorName
    ? `${petition.sponsorName}${petition.sponsorRiding ? ` (${petition.sponsorRiding})` : ""}`
    : "—";

  return (
    <section>
      <h2 className="text-lg font-semibold">Official petition</h2>
      {petition ? (
        <div className="mt-3 rounded-xl border border-line bg-paper p-4 text-sm">
          <a href={petition.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            {`${petition.number}: ${petition.title}`}
          </a>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Row label="Status" value={PETITION_STATUS_LABELS[petition.status]} />
            <Row label="Signatures" value={`${petition.signatures.toLocaleString("en-CA")} of ${SIGNATURES_NEEDED}`} />
            <Row label="Sponsor" value={sponsor} />
            <Row label="Opened" value={formatDate(petition.openedAt)} />
            <Row label="Closes" value={formatDate(petition.closesAt)} />
            <Row label="Presented" value={formatDate(petition.presentedAt)} />
            <Row label="Government response" value={formatDate(petition.responseTabledAt)} />
            <Row label="Last updated" value={formatDateTime(petition.syncedAt)} />
          </dl>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          After a team member creates the petition on ourcommons.ca, attach its number here.
        </p>
      )}

      <form onSubmit={attach} className="mt-4 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
        <label className="text-sm font-semibold">
          Number
          <input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="e-7203" className={inputClass} />
        </label>
        <label className="text-sm font-semibold">
          Title on ourcommons.ca
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={busy || refreshing}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
        >
          {petition ? "Replace" : "Attach"}
        </button>
      </form>
      <button
        type="button"
        onClick={refreshAll}
        disabled={busy || refreshing}
        className="mt-3 text-sm underline disabled:opacity-60"
      >
        Refresh from ourcommons.ca
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/app/admin/_components/SignNow.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { CampaignMemberExport } from "@/lib/campaigns/admin";
import type { CampaignDetail } from "@/lib/campaigns/campaigns";
import { buildSignNow } from "@/lib/campaigns/outreach";
import { copyText } from "@/lib/clipboard";
import { composeLinks } from "@/lib/mp/sponsorEmail";

type Props = { campaign: CampaignDetail; members: CampaignMemberExport[]; teamGmail: string | null };

const buttonClass = "rounded-lg border border-line bg-paper px-4 py-2 text-center text-sm font-medium hover:border-ink";

export function SignNow({ campaign, members, teamGmail }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  if (!campaign.petition) return null;

  const email = buildSignNow({ campaign, petition: campaign.petition });
  const addresses = members.map((member) => member.email).filter((address): address is string => !!address);
  // No recipients in the link: a long member list doesn't fit in a URL, so they're pasted into BCC.
  const gmail = composeLinks({ to: "", ...email, authuser: teamGmail }).gmail;

  async function copy(text: string, done: string) {
    setStatus((await copyText(text)) ? done : "Couldn't copy. Select the text and copy it by hand.");
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Tell members to sign</h2>
      <div className="mt-3 rounded-xl border border-line bg-paper p-4 text-sm">
        <p className="font-semibold">{email.subject}</p>
        <p className="mt-3 whitespace-pre-wrap">{email.body}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(`Subject: ${email.subject}\n\n${email.body}`, "Message copied.")}
          className={buttonClass}
        >
          Copy message
        </button>
        <a href={gmail} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          Open in Gmail
        </a>
        <button
          type="button"
          onClick={() => copy(addresses.join(", "), `${addresses.length} member emails copied. Paste them into BCC.`)}
          className={buttonClass}
        >
          {`Copy member emails (${addresses.length})`}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Paste the member emails into BCC so members don&rsquo;t see each other&rsquo;s addresses.
      </p>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </section>
  );
}
```

- [ ] **Step 8: Add both sections to `src/app/admin/campaigns/[id]/page.tsx`**

Add these imports:

```tsx
import { PetitionSection } from "../../_components/PetitionSection";
import { SignNow } from "../../_components/SignNow";
```

After `<MpAsk … />`, add:

```tsx
      <PetitionSection campaign={campaign} />
      <SignNow campaign={campaign} members={members} teamGmail={teamGmail} />
```

- [ ] **Step 9: Run the full checks**

Run: `npm test && npm run lint && npx tsc --noEmit && env AUTH0_DOMAIN= npm run build`
Expected: all tests pass, lint is clean, there are no type errors, and the build lists `/admin` and `/admin/campaigns/[id]`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/campaigns/outreach.ts src/lib/campaigns/outreach.test.ts src/app/admin/_components/petitionMessages.ts src/app/admin/_components/petitionMessages.test.ts src/app/admin/_components/PetitionSection.tsx src/app/admin/_components/SignNow.tsx "src/app/admin/campaigns/[id]/page.tsx"
git commit -m "platform: attach the ourcommons.ca petition and tell members to sign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end check in the browser (done by the controller, not a subagent)

This checks the whole loop against a throwaway database, without touching Muktar's `.env.local` or his running dev server.

- [ ] **Step 1: Throwaway database with every migration**

```bash
SP=<scratchpad>
export LC_ALL=en_US.UTF-8
/opt/homebrew/Cellar/postgresql@17/17.10/bin/pg_ctl -D "$SP/pgdata" -o "-p 5499 -c unix_socket_directories=''" -l "$SP/pg.log" start
psql -h 127.0.0.1 -p 5499 -U postgres -d postgres -c "drop database if exists wdmtg_admin" -c "create database wdmtg_admin"
env DATABASE_URL=postgres://postgres@127.0.0.1:5499/wdmtg_admin npx drizzle-kit migrate
```

Then confirm that `campaigns`, `campaign_members`, `petitions`, `users` and `drafts` exist in `wdmtg_admin`.

- [ ] **Step 2: Copy the app and start it** (next dev allows only one server per project folder)
  - Rsync the repo to `$SP/admin-check`, excluding `.git`, `.next`, `node_modules`, `.env*` and `.claude`.
  - Run `cp -Rc node_modules`.
  - Start `DATABASE_URL=… npx next dev --port 3100` there through `.claude/launch.json`.
  - With no `.env*` files, Auth0 is off and the dev user is an admin.

- [ ] **Step 3: Publish flow**
  - `/dev/petition` → Start a petition. The word counter and rule messages update, and Next is disabled with a link in the text.
  - Save → step 2: enter postal code `K1P 1A4`, tick consent, Publish.
  - Step 3 shows the campaign and "1 member".
  - The `drafts` row is gone, and `users.riding` is `Ottawa Centre`.
  - Start again on the same story → step 3 opens with "already started".

- [ ] **Step 4: Admin**
  - The gear menu shows **Admin**.
  - `/admin` lists the campaign, and the stage filter and sort links work.
  - Add a second member with SQL: insert a `users` row and a `campaign_members` row with riding `Ottawa South`.
  - Open the campaign:
    - the riding breakdown reads `Ottawa Centre 1 · Ottawa South 1`,
    - Download CSV,
    - Choose an MP (search "Naqvi") → check the email's counts and Gmail link,
    - Mark as MP asked, which saves the prefilled note and moves the stage to MP asked.
  - Attach `e-4701` → the synced details appear (closed, signature count). Then:
    - Live is enabled,
    - the "Tell members to sign" section shows,
    - Copy member emails reports 2.

- [ ] **Step 5: Widths and logs**
  - Repeat the key screens at 375px: no sideways page scroll, and the tables scroll inside their boxes.
  - Check the dev server log for errors.

- [ ] **Step 6: Clean up**
  - Stop the server.
  - Remove `.claude/launch.json` and the copy.
  - Stop Postgres.

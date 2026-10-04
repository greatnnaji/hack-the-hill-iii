# Muktar's campaign work: publish step and admin page

> **Update (2026-09-26):** the publish step (spec §1, plan Tasks 1–4) was replaced by Great's PR #14 (campaigns flow: write → publish → live, drafts removed). This branch keeps that flow; only the admin part (Tasks 5–8) remains from this plan.

**Date:** 2026-09-26
**Owner:** Muktar
**Covers:** TASKS.md, Muktar Task 3 Phase 2 (publish a draft as a campaign) and Task 4 (admin page).
**Builds on:** Raphael's campaigns and petitions API on `upstream/data-task3` (commit 2547f6b), documented in `docs/campaigns-api.md`. This work lives on `platform/admin`, branched from that commit. Its PR opens once Raphael's branch is merged.

## Background

The app no longer creates petitions. People start **campaigns** on a spending story, and others join them. When a campaign has enough support, our team reviews it, asks an MP to sponsor it, opens the official e-petition on ourcommons.ca, and emails every member a link to sign it there. Joining in the app is support, not a signature.

Raphael's branch already provides everything on the server: campaigns, members, stages, the admin API, and the ourcommons.ca petition sync. This spec covers only the two pieces Muktar builds on top of it:

1. **Publish step:** the existing petition form now publishes to the app as a campaign, instead of emailing an MP.
2. **Admin page:** the team's page for reviewing campaigns, asking an MP, recording the ourcommons.ca petition, and telling members to sign.

## Not in this spec

These belong to other people or haven't been assigned yet. They are listed so nobody assumes this spec covers them.

- **Server APIs, tables and the ourcommons.ca sync:** Raphael, already built.
- **The 1,000-supporter target, deadline, and automatic move to review:** Great's Task 3 in TASKS.md. They aren't in Raphael's branch yet.
- **Campaigns on the story detail screen:** Izu's Task 2.
- **Unassigned:** the campaign page, the Campaigns page (`/campaigns`) and the Petitions page (`/petitions`). The team needs to decide who builds them.
- **Stage names:** TASKS.md (`gathering → review → sponsor_asked → official → closed`) and Raphael's branch (`gathering, in_review, mp_asked, mp_agreed, live, closed`) disagree. This spec uses Raphael's, because the code uses them. If the team renames them, only the labels in this work change.

## 1. Publish step

The flow keeps three steps. Step 2 changes from "Ask an MP" to "Publish to the app".

| Step | URL | What happens |
|---|---|---|
| 1. Write | `/petition/new?story=…`, `/petition/[id]` | Same form as today. It checks the House rules as you type and saves a draft (`/api/me/drafts`, unchanged). |
| 2. Publish | `/petition/[id]/publish` (replaces `/sponsor`) | Review the text, confirm your riding, tick consent, publish. |
| 3. Published | `/petition/published/[campaignId]` (replaces `/submit`) | Confirms the campaign is on its story and explains what happens next. |

### Step 1 changes
- **Rules as you type.** The form uses `checkCampaignText` from `@/lib/campaigns/rules`, Raphael's code, which is safe in the browser:
  - a counter, e.g. "182 / 250 words", counting the issue, the fixed opening and the request,
  - the `problems` messages under the form, such as "Petitions can't include links.",
  - **Next** is disabled while there are problems.
- The existing character limits on drafts stay as a server-side backstop.

### Step 2: `/petition/[id]/publish`
- **Preview:** the campaign as others will see it: title, the issue, then the opening ("We, the undersigned, call upon the Government of Canada to") followed by the request. An **Edit** link goes back to step 1.
- **Riding:**
  - If `GET /api/me` returns a `riding`, it shows "Your riding: Ottawa Centre" with a **Change** link.
  - Otherwise, or after **Change**, a postal code field appears. The postal code goes to the server, which saves only the riding.
- **Consent checkbox:** required. Its wording matches Raphael's API exactly: *"Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it."*
- **Publish to the app** sends `POST /api/campaigns` with `{ storyId, title, issue, request, postalCode?, consent: true }` from the draft. On success (201) the app:
  1. deletes the draft with a new `DELETE /api/me/drafts/[id]` (owner only; 204, or 404 if it isn't yours), so it can't be published twice;
  2. goes to step 3.

- **Errors:** each shows a message on the page, from one pure function `publishErrorFor(code)`.

| Code | Message |
|---|---|
| `invalid_postal` | "Enter a postal code like K1P 1A4." |
| `riding_not_found` | "We couldn't find a riding for that postal code." |
| `riding_required` | Shows the postal code field. |
| `lookup_failed` (502) | "Couldn't reach the riding lookup. Try again." |
| `invalid_text` | Lists `problems` and links back to step 1. |
| `story_not_found` | "That story is no longer available." |
| `already_started` (409) | Goes to step 3 for the returned `campaignId` with `?existing=1`, which shows "You'd already started a campaign on this story. Here it is." The draft is kept. |

### Step 3: `/petition/published/[campaignId]`
- Loads the campaign on the server, the same data as `GET /api/campaigns/:id`.
- Shows:
  - "Your campaign is published on *{story title}*."
  - the member count,
  - what happens next: people join from the story, our team reviews it when it has enough support, we ask an MP to sponsor it, we open it on ourcommons.ca and email every member a link to sign.
- **Back to the story** links to `/dev/petition` until Izu's story detail screen exists, then to that screen.
- An unknown campaign shows the standard not-found page.

### Removed from the user flow
- **Pages and components:** `/petition/[id]/sponsor`, `/petition/[id]/submit`, `SponsorStep`, `LetterEditor`, `SendOptions` and `CopyField`.
- **Moved to admin:** `MpCard` and `MpSearch`.
- **Sponsor email:** `buildLetter` and `buildEmail` in `src/lib/mp/sponsorEmail.ts` are replaced by the admin email builders below. `composeLinks` stays.
- **Drafts table:** `mp`, `sponsor_email` and `sponsor_requested_at` stop being written. The columns stay, to keep this change free of migrations.
- **PR #9 (tidy-ups):** its letter-editor fixes become unnecessary. Its other fixes still apply: Represent logging, MP field length limits and screen-reader alerts.

## 2. Admin page

### Access
- **The layout** at `src/app/admin/layout.tsx` calls Raphael's `isAdmin(user)` from `src/lib/admin.ts`, which reads `ADMIN_EMAILS`. It calls `notFound()` for anyone else. His admin API routes already answer non-admins with 404.
- **The gear menu** shows an **Admin** link when `isAdmin` is true. `AccountMenu` works this out on the server and passes it to `SettingsMenu`.
- **Local dev with Auth0 off:** the dev user is an admin, which Raphael's code already does.

### `/admin`: campaign list
- Loaded on the server with `listAdminCampaigns({ stage, sort })`.
- **Columns:** campaign title, story, starter name, members, ridings, stage, petition number (if any), last updated.
- **Filters:** a stage filter (`?stage=`) and a sort (`?sort=members`, the default, or `updated`), kept in the URL so the view can be shared and reloaded.
- **Each row** links to `/admin/campaigns/[id]`.
- **Empty state:** "No campaigns yet."

### `/admin/campaigns/[id]`: one campaign
The campaign and its members are loaded on the server, using Raphael's campaign detail and `listCampaignMembers`. Changes go through his admin API from client components, using `apiFetch`.

**a. Overview**
- title, story, starter name and email, created date, current stage, and the team note,
- the full text: issue, opening, request.

**b. Members**
- **Count by riding:** a breakdown sorted by count, e.g. "Ottawa Centre 41 · Ottawa South 12 · …".
- **Table:** name, email, riding, joined date. The starter is marked.
- **Download CSV:** built in the browser from the members data. The columns are `name,email,riding,joined_at`, with commas and quotes escaped properly. The file name is `campaign-{short id}-members.csv`.

**c. Stage and team note**
- **Stage buttons:** one per stage, and moving backwards is allowed. They call `PATCH /api/admin/campaigns/:id` with `{ stage }`.
  - **Live** is disabled until a petition is attached, with the hint "Attach the ourcommons.ca petition first". It also handles `409 needs_petition`.
- **Team note:** a text box saved with `{ teamNote }`. It is public, since it shows on the campaign, and the page says so. Clearing it sends `null`.

**d. Ask an MP**
- **Pick the MP** with the existing `MpSearch`, or look one up by postal code with the existing `/api/mp`. The chosen MP shows in `MpCard`.
- **The MP email** is built by `buildMpAsk({ campaign, mp, members })` as `{ subject, body }`:
  - **Subject:** "Request to sponsor an e-petition: {title}"
  - **Body:**
    - an introduction: we're wheredoesmytaxgo, where Canadians follow federal spending and organize around it,
    - the campaign text,
    - "This campaign has {N} members from {M} ridings, including {X} in {MP's riding}."
    - "We can share the member list so you can verify them."
    - the ask: sponsor it once we create it on ourcommons.ca,
    - a team sign-off.
  - When the MP's riding has no members, that part of the sentence is left out.
- **Sending:** **Copy**, **Open in Gmail**, **Open in Outlook** and **Use my email app**, reusing `composeLinks`. If the MP has no public email, the page says so and offers only **Copy**.
- **Which Gmail account:** the email should go from the app's Gmail account. If the optional `TEAM_GMAIL` setting is present, Gmail links add `authuser={TEAM_GMAIL}`, so they open in that account even when a team member is signed into several.
- **Mark as MP asked** sets the stage to `mp_asked`. It also offers a prefilled team note, "We've asked {MP name} ({riding}) to sponsor this campaign.", which can be edited before saving. That note is how the chosen MP is recorded, since the campaigns table has no column for it.

**e. Official petition**
- **Form:** petition number (`e-7203`, `E-7203` and `7203` are all accepted by the API) and title, prefilled with the campaign title. **Attach** sends `PUT /api/admin/campaigns/:id/petition`, which replaces any earlier number.
- **Result:**

| `sync` | Message |
|---|---|
| `synced` | Shows the petition: status, signatures of 500, sponsor, opened and closing dates, link |
| `not_found` | "Saved. ourcommons.ca doesn't show e-7203 yet. That's normal until the Clerk of Petitions publishes it, usually 3–5 working days after the MP accepts. It updates automatically." |
| `failed` | "Saved, but we couldn't reach ourcommons.ca. Use Refresh later." |

- **Errors:** `invalid_petition_number` shows "That doesn't look like a petition number (e.g. e-7203)", and `petition_taken` shows "That petition is already attached to another campaign".
- **Refresh from ourcommons.ca** calls `POST /api/admin/petitions/sync` and reports "{synced} updated · {notFound} not published yet · {failed} failed".
- **Display:** once attached, the petition details come from the campaign's `petition`.

**f. Tell members to sign** (shown once a petition is attached)
- **The message** comes from `buildSignNow({ campaign, petition })`:
  - **Subject:** "It's live: sign {title} on ourcommons.ca"
  - **Body:** "The campaign you joined is now official petition {number}. Sign it here: {url}. Your signature only counts after you confirm the email from the House of Commons."
- **Buttons:**
  - **Copy message**
  - **Open in Gmail**, with the subject and body; the recipients are pasted into BCC
  - **Copy member emails**, comma-separated for the BCC field. Member lists can be too long for a link, so recipients never go in the URL.

## Files

| File | Change |
|---|---|
| `src/app/petition/new/page.tsx`, `src/app/petition/[id]/page.tsx`, `_components/PetitionForm.tsx` | Live rules, word counter, Next goes to `/publish` |
| `src/app/petition/[id]/publish/page.tsx`, `_components/PublishStep.tsx` | New |
| `src/app/petition/published/[campaignId]/page.tsx` | New |
| `src/app/petition/[id]/sponsor/**`, `submit/**`, `SponsorStep`, `LetterEditor`, `SendOptions`, `CopyField` | Removed |
| `src/app/api/me/drafts/[id]/route.ts` | Add `DELETE` |
| `src/lib/drafts.ts` | Add `deleteDraft(userId, id)` |
| `src/lib/campaigns/publishErrors.ts` | `publishErrorFor(code)` |
| `src/app/admin/layout.tsx`, `page.tsx`, `campaigns/[id]/page.tsx` | New |
| `src/app/admin/_components/*` | Stage controls, members table and CSV, MP ask, petition form, sign-now |
| `src/lib/admin/emails.ts` | `buildMpAsk`, `buildSignNow` |
| `src/lib/admin/members.ts` | `ridingBreakdown`, `membersCsv` |
| `src/lib/mp/sponsorEmail.ts` | Keep `composeLinks` (plus the optional `authuser`); remove `buildLetter` and `buildEmail` |
| `src/components/AccountMenu.tsx`, `SettingsMenu.tsx` | Admin link |
| `src/app/petition/_components/MpCard.tsx`, `MpSearch.tsx` | Move to `src/components/mp/` |

## Testing
- **Unit tests:**
  - `buildMpAsk`: counts, the "including X in your riding" sentence and when it's left out, an MP with no email,
  - `buildSignNow`,
  - `membersCsv`: escaping commas, quotes and new lines,
  - `ridingBreakdown`: ordering and members without a riding,
  - `publishErrorFor`: every code,
  - `composeLinks` with and without `authuser`,
  - `deleteDraft`: only the owner can delete.
- **Route tests** (PGlite, the existing pattern): `DELETE /api/me/drafts/[id]` returns 204 for the owner, 404 for anyone else, and 401 when logged out.
- **Admin access:** the layout calls `notFound()` for non-admins (with `isAdmin` mocked), and the gear menu shows **Admin** only to admins.
- **Browser walkthrough** against a throwaway database with Raphael's migrations, using the dev user (an admin):
  - write a draft → publish with a postal code → see step 3 → the draft is gone,
  - `/admin` lists the campaign → open it → members table and CSV → pick an MP → check the MP email and Gmail link → mark MP asked with the prefilled note,
  - attach a real published petition number (e.g. e-4701) → the synced details appear → the sign-now message,
  - a second member is added directly in the database to check counts and the riding breakdown,
  - desktop and 375px widths.

## Rollout
1. Raphael's `data-task3` is merged, and its migration `0002_campaigns.sql` is run on Neon.
2. `ADMIN_EMAILS`, and optionally `TEAM_GMAIL`, are added in Vercel.
3. This branch is rebased onto `main` and opened as a PR.

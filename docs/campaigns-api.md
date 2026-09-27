# Campaigns and petitions API

For the frontend: every endpoint behind the story page, Start a campaign, the campaign page, `/campaigns`, `/petitions` and `/admin`.

- JSON in and out, camelCase fields, dates as ISO strings.
- Errors are always `{ "error": "<code>" }` (some add fields, listed below). Show a message based on the code.
- "Login" means the route needs a session: `401 { "error": "unauthorized" }` otherwise. Public routes work logged out, and add the viewer's flags (`joined`, `isStarter`, `canJoin`…) when logged in.
- Call them with `apiFetch()` from `src/lib/apiFetch.ts` (it sends a 401 to the login page).

## Stages

| `stage` | Show as | Who moves it here |
|---|---|---|
| `gathering` | Gathering members | Start (default) |
| `in_review` | In review | Automatically when a gathering campaign reaches its `target` (1,000), or Admin |
| `mp_asked` | MP asked | Admin |
| `mp_agreed` | MP agreed | Admin, or automatically when a petition number is attached |
| `live` | Live | Automatically when ourcommons.ca shows the petition open for signature |
| `closed` | Closed | Admin (with a `teamNote`), or automatically when the petition's signing period ends |

Joining is open from `gathering` to `mp_agreed`. Once `live`, show **Sign on ourcommons.ca** (`petition.url`) instead.

## Shapes

**CampaignSummary** (lists)

```ts
{
  id: string; title: string; storyId: string; storyTitle: string;
  starterFirstName: string;        // first name only, "Someone" if unknown
  memberCount: number; stage: Stage; createdAt: string; updatedAt: string;
  target: number;                  // 1,000 members: "412 of 1,000"
  deadline: string;                // last day to gather members, "YYYY-MM-DD"
  joined: boolean;                 // viewer is a member ("Joined" tag)
  isStarter: boolean;              // viewer started it ("Your campaign")
  petition: PetitionCard | null;
}
```

**CampaignDetail** (campaign page) = CampaignSummary plus

```ts
{
  issue: string;                   // starts with "Whereas"
  opening: string;                 // "We, the undersigned, call upon the Government of Canada to"
  request: string;                 // shown after the opening
  teamNote: string | null;         // our team's note, show under the stage tracker
  ridingCount: number;             // "from N ridings"
  canEdit: boolean;                // starter, nobody else has joined yet
  canJoin: boolean;                // logged in, not a member, stage gathering..mp_agreed
  canLeave: boolean;               // member but not the starter
}
```

**PetitionCard** (official petition)

```ts
{
  number: string;                  // "e-7203"
  title: string; url: string;      // url = the ourcommons.ca page to sign
  campaignId: string; campaignTitle: string; storyId: string;
  sponsorName: string | null; sponsorRiding: string | null;
  signatures: number; signaturesNeeded: 500;
  status: "pending" | "open" | "closed" | "presented" | "response";
  openedAt: string | null; closesAt: string | null;
  presentedAt: string | null;      // "Presented to the House on …"
  responseTabledAt: string | null; // "Government response tabled on …" (read it at url)
  syncedAt: string | null;         // "Updated 20 min ago"
}
```

`pending` means our team attached the number but ourcommons.ca doesn't show it yet.

## Public and member routes

| Route | Login | Does | Returns / errors |
|---|---|---|---|
| `GET /api/campaigns?story=&stage=&mine=1&sort=` | only for `mine=1` | Lists campaigns. `story`: one story's campaigns, live first, closed last (story page). Without `story`, closed are hidden unless `stage=closed`. `mine=1`: started or joined (Mine tab). `sort=members` (default) or `newest`. | `CampaignSummary[]` · 400 `invalid_query` |
| `POST /api/campaigns` | yes | Starts a campaign; the starter becomes the first member. Body `{ storyId, title, issue, request, postalCode?, consent: true, days? }`. `days`: 30–120 to gather members (default 120), sets `deadline`. The login must have an email (the team BCCs every member the ourcommons.ca link). `postalCode` can be left out if `GET /api/me` already has a `riding`. | 201 `{ id }` · 400 `invalid_body`, `invalid_text` + `problems: string[]`, `invalid_postal`, `riding_required`, `email_required` · 404 `story_not_found`, `riding_not_found` · 409 `already_started` + `campaignId` (open that one instead) · 502 `lookup_failed` |
| `GET /api/campaigns/:id` | no | The campaign page. | `CampaignDetail` · 404 `not_found` |
| `PATCH /api/campaigns/:id` | yes | Starter edits `{ title?, issue?, request? }` while `canEdit`. | `CampaignDetail` · 400 `invalid_body`, `invalid_text` + `problems` · 403 `not_starter` · 404 `not_found` · 409 `locked` |
| `POST /api/campaigns/:id/members` | yes | Join. Body `{ postalCode?, consent: true }` (consent is the checkbox, required). | 201 `CampaignDetail` · 400 `invalid_body`, `invalid_postal`, `riding_required`, `email_required` · 404 `not_found`, `riding_not_found` · 409 `already_member`, `not_joinable` + `stage` · 502 `lookup_failed` |
| `DELETE /api/campaigns/:id/members` | yes | Leave. | `CampaignDetail` · 403 `starter_cannot_leave` · 404 `not_found`, `not_member` |
| `GET /api/petitions?story=` | no | Official petitions (Petitions page; `story` for a story page). Open first, then pending, closed, presented, response. | `PetitionCard[]` |
| `GET /api/spending`, `GET /api/spending/:id` | no | The feed and the story page. Each story comes with `campaigns: CampaignSummary[]` in the same order as `?story=` (`[]` = "No campaigns yet. Start the first one."). | stories with `campaigns` |
| `GET /api/me` | yes | The user: `{ id, name, firstName, email, riding, isAdmin }`. Use `riding` for "Your riding: …" and `isAdmin` for the gear menu's Admin link. | |
| `PUT /api/me/riding` | yes | Body `{ postalCode }`. Finds the riding and saves only the riding (the postal code is never stored). | `{ riding }` · 400 `invalid_body`, `invalid_postal` · 404 `riding_not_found` · 502 `lookup_failed` |

The consent checkbox text: *"Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it."*

### Checking the text as the user types

Import from `@/lib/campaigns/rules` (no database code, safe in client components):

```ts
import { checkCampaignText, PETITION_OPENING, MAX_PETITION_WORDS } from "@/lib/campaigns/rules";
const { words, maxWords, problems } = checkCampaignText({ title, issue, request });
// words counts issue + opening + request; problems are ready-to-show messages, e.g. "Petitions can't include links."
```

The API runs the same check and returns the same messages as `invalid_text`.

## Admin routes

Only for emails in `ADMIN_EMAILS` (comma-separated, in `.env.local` and the host's settings). Everyone else gets **404 `not_found`**, as if the route didn't exist. In local dev without Auth0, the dev user is an admin.

| Route | Does | Returns / errors |
|---|---|---|
| `GET /api/admin/campaigns?stage=&sort=members\|updated` | Every campaign, closed included. Rows: `{ id, title, storyId, storyTitle, starterName, starterEmail, memberCount, ridingCount, stage, teamNote, petitionNumber, createdAt, updatedAt }`. | 400 `invalid_query` |
| `PATCH /api/admin/campaigns/:id` | Body `{ stage?, teamNote? }` (`teamNote: null` removes it). | `CampaignDetail` · 400 `invalid_body` · 404 `not_found` · 409 `needs_petition` (can't set `live` without a petition) |
| `GET /api/admin/campaigns/:id/members` | Members for the sponsor email: `{ name, email, riding, isStarter, joinedAt }[]`, starter first. All consented to this. | 404 `not_found` |
| `PUT /api/admin/campaigns/:id/petition` | After creating the petition on ourcommons.ca: body `{ number: "e-7203", title }`. Fetches it straight away; stage becomes `mp_agreed`, then `live` once it's open. | `{ sync: "synced" \| "not_found" \| "failed", campaign: CampaignDetail }` · 400 `invalid_body`, `invalid_petition_number` · 404 `not_found` · 409 `petition_taken` |
| `POST /api/admin/petitions/sync` | Refresh every petition from ourcommons.ca now. | `{ synced, notFound, failed }` |

## Keeping petition numbers fresh

- Viewing a campaign with a petition, or `GET /api/petitions`, refreshes petitions older than 30 minutes from ourcommons.ca, after the response is sent (Next.js `after()`), so pages never wait for it.
- `npm run petitions:sync` refreshes all of them from the command line (e.g. a scheduled job).
- ourcommons.ca has no petition API, so the sync reads the public petition page (`src/lib/petitions/ourcommons.ts`).

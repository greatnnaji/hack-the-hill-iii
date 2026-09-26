# Tally: Task Breakdown

## MVP

A user enters income + province, sees their federal tax broken down by where it goes, browses real federal spending stories with their personal share of each, and either opens a linked House of Commons e-petition or drafts a new one and emails their MP to sponsor it.

**In the MVP:** 6 screens (layout from the wireframe), real tax math, real government spending data, stories from that data plus news, real MP lookup, Auth0 login to save petition drafts.

**Not in the MVP (stretch):** tracking petitions, signature trend charts (Tiger Data), provincial items, milestone notifications.

**Ground rules**
- Screens 01–04 need no login. Only ask for Auth0 login at "Start a petition" / saving a draft.
- Income never leaves the device. The tax calculation runs on the client.
- Only federal items get a petition card. House of Commons e-petitions can't cover provincial spending.
- Petitions can't be signed or submitted inside the app. "Join petition" opens ourcommons.ca, and "Start a petition" produces a draft + sponsor email.
- **The wireframe is a layout guide only.** Its numbers, labels and dates are placeholders. Real numbers come from the data.

## Decisions made

1. **Spending data source:** GC InfoBase open data ([dataset page](https://open.canada.ca/data/en/dataset/a35cf382-690c-4221-a971-cf0fd189a46f)). Three files:
   - [programs_spending.csv](https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/55934650-3380-44d5-82c1-bb68f8cc5abb/download/programs_spending.csv): how much each program spent per year. Use the `expenditure` column (actual spending).
   - [programs.csv](https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/8d3cd22d-15b0-468a-bb75-c1e736107c45/download/programs.csv): program names. Join on `year` + `dept_code` + `program_code`.
   - [organizations.csv](https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/d9f87f7f-62f9-4baf-a803-2d8743f38e76/download/organizations.csv): department names. Join on `dept_code`.
2. **Year meaning:** `2024` in the data = April 2024 to March 2025 (checked: Canada Health Transfer shows $52.1B, the official 2024–25 amount). Label it "2024–25" in the app.
3. **Your share formula (same on every screen):**
   `your share = your federal tax × (item cost ÷ total federal spending that year)`
   Example: you pay $9,510, military aircraft cost $3.3B, total spending ~$520B → $9,510 × (3.3 ÷ 520) ≈ **$60**. "Total federal spending" = sum of `expenditure` in programs_spending.csv for that year. Raphael computes it once and everyone uses that number.
4. **Screen 02 breakdown:** show the 7 biggest programs with plain-English names (e.g. "Market Debt and Foreign Reserves Management" → "Interest on the debt"), plus one "All other programs" bar. Only 7 names to rewrite by hand.
5. **Feed filter chips:** filter by department (e.g. "National Defence", "Health"). The department comes free with every row of the data, so there's no manual sorting.
6. **Stories come from two places:**
   - **Data stories (main source):** programs whose spending jumped a lot from one year to the next. Example: military aircraft buying went from $0.8B (2022–23) to $3.3B (2024–25) → "Military aircraft spending quadrupled in two years."
   - **News stories (extra):** scraped news for things the data doesn't show, like one-off contracts.

## Branches

One branch per task, named `<area>/<task>` (listed under each task below). Merge into `main` via PR when a phase works.

## Who owns what

| Person | Area |
|---|---|
| **Izu** | UI: all 6 screens |
| **Raphael** | Data: tax calculator, spending data load, breakdown, DB schema, API, petition sync |
| **Great** | Stories: data stories from spending jumps, news scraping, petition matching |
| **Muktar** | Everything else: Auth0, MP lookup, sponsor email, draft flow, deploy, demo |

## Shared contract (agree on this first, together)

The spending item (story) shape everyone builds against:

```json
{
  "id": "string",
  "title": "Military aircraft spending quadrupled in two years",
  "summary": "What happened, neutral tone",
  "amount": 3263727280,
  "date": "2025-03-31",
  "fiscal_year": "2024-25",
  "department": "National Defence",
  "dept_code": "ND",
  "program_code": "BUR03",
  "source_type": "data",
  "level": "federal",
  "sources": [{ "label": "GC InfoBase: Federal Programs Spending", "url": "https://..." }],
  "image_url": "https://...",
  "petition": {
    "number": "e-5123",
    "title": "...",
    "signatures": 18420,
    "closes": "2025-06-01",
    "url": "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-5123"
  }
}
```

- `source_type` is `"data"` (from the spending file) or `"news"` (scraped).
- `program_code` is filled for data stories, and for news stories when Great can match one.
- `petition` is `null` when no open petition matches.

---

## Izu (UI)

### Task 1: Build the onboarding + tax overview (screens 01–02)
Branch: `ui/onboarding-overview`
- **Phase 1:** Set up the frontend project and design tokens (colours, type, spacing from the wireframe). Build screen 01 (income input with auto-format, province dropdown defaulting from locale) and screen 02 with mock numbers.
- **Phase 2:** Save income and province to local storage. Plug in Raphael's tax calculator and `GET /breakdown` (top 7 programs + "All other"). Horizontal bar list.
- **Phase 3:** "Edit" link back to 01, "How we calculate" link, loading/error states, check at 390pt width.

### Task 2: Build the spending feed + detail page (screens 03–04)
Branch: `ui/feed-detail`
- **Phase 1:** Create `mock/spending.json` (~5 items in the shared shape). Build feed cards, department filter chips, bottom tab bar and the detail page from mock data.
- **Phase 2:** Swap mock data for `GET /spending?department=` and `GET /spending/:id`. Show personal share using the formula in Decisions #3. Detail page in order: facts → "How this relates to you" → sources → action card.
- **Phase 3:** Both action card states: open petition (progress bar, Join → ourcommons.ca, Start different) vs. none (Start a petition only). Empty feed state, image fallbacks.

### Task 3: Build the petition flow (screens 05–06)
Branch: `ui/petition-flow`
- **Phase 1:** Screen 05 form (title with 250-char counter, issue with "Whereas" helper, requested action, 6-step explainer under the form). Screen 06 layout (postal code + Find, MP card, email template) with a sample MP.
- **Phase 2:** Wire to Muktar's `GET /mp?postal=` and draft endpoints. Step progress bar (1 of 3, 2 of 3). Editable sponsorship email.
- **Phase 3:** Login prompt when tapping "Start a petition", step 3 hand-off screen, validation messages, final visual pass across all screens.

---

## Raphael (Data)

### Task 1: Build the tax calculator + breakdown
Branch: `data/tax-breakdown`
- **Phase 1:** Tax calculator as a pure function: 2024 federal + provincial brackets → `{ federal, provincial, total, effectiveRate }`. Check a few incomes against an online Canadian tax calculator.
- **Phase 2:** From programs_spending.csv (2024–25): compute **total federal spending** (Decisions #3) and the top 7 programs. Write a plain-English name for each of the 7. Serve via `GET /breakdown` → `[{ name, amount, percent }]` + "All other programs".
- **Phase 3:** Unit tests for a few incomes per province. Write the "How we calculate" content with sources.

### Task 2: Build the database + spending API
Branch: `data/db-api`
- **Phase 1:** Set up Postgres (Tiger Data if going for that prize; it's still Postgres). Load the 3 GC InfoBase files into tables: `programs_spending`, `programs`, `organizations`. Also create `stories`, `petitions`, `users` (Auth0 `sub`), `drafts`.
- **Phase 2:** Endpoints `GET /spending?department=`, `GET /spending/:id`, `GET /departments` (for filter chips), and `POST /internal/spending` (Great's scripts write stories here, protected with a shared secret).
- **Phase 3:** Include the matched petition inline in `/spending` responses. Endpoints `POST /me/drafts`, `GET /me/drafts`, `PATCH /me/drafts/:id` using Muktar's auth middleware.

### Task 3: Build the petition sync
Branch: `data/petition-sync`
- **Phase 1:** Figure out how to get open e-petitions from ourcommons.ca (export or scrape). Pull a handful by hand into `petitions`.
- **Phase 2:** Scheduled job that refreshes open petitions and signature counts.
- **Phase 3 (stretch, Tiger Data prize):** Store hourly snapshots `(petition_id, time, count)` as a hypertable, expose a trend endpoint for a signature chart on screen 04.

---

## Great (Stories)

### Task 1: Build data stories from spending jumps (main feed source)
Branch: `stories/data-stories`
- **Phase 1:** Using programs_spending.csv + programs.csv, find programs with the biggest jumps (or drops) between years, e.g. 2022–23 → 2024–25. Ignore tiny programs (e.g. under $50M) and `ISS` internal services rows. Pick ~20 good ones by hand.
- **Phase 2:** Script that turns each jump into a story in the shared shape: plain-English headline, neutral "What happened" summary (LLM can draft it from the program name + numbers), `source_type: "data"`. Push to `POST /internal/spending`.
- **Phase 3:** Hand-check the top ~15 stories so the demo feed is accurate and readable.

### Task 2: Build the news pipeline (extra stories)
Branch: `stories/news-pipeline`
- **Phase 1:** Pull CBC / CTV / Google News RSS with queries like "federal government spent", "contract", "$ million". Save raw articles locally.
- **Phase 2:** LLM extraction per article → `amount, department, date, level`, a neutral headline and summary. Drop `level: provincial`. Match to a `program_code` if possible. Push with `source_type: "news"`.
- **Phase 3:** Dedupe the same story across outlets. Find or generate images. Run it on a schedule.

### Task 3: Build petition matching
Branch: `stories/petition-matching`
- **Phase 1:** Hand-match a few stories to open e-petitions to see what a good match looks like.
- **Phase 2:** For each story, find candidate petitions from Raphael's `petitions` table (keywords or embeddings), then an LLM yes/no check. Set `petition` or leave it `null`.
- **Phase 3:** Review matches for the demo stories and fix bad ones by hand. Make sure the demo story has a live petition.

---

## Muktar (Everything else)

### Task 1: Build auth (Auth0)
Branch: `platform/auth`
- **Phase 1:** Create the Auth0 tenant and app, share env vars with the team.
- **Phase 2:** Auth0 login in the frontend, triggered only from "Start a petition". JWT validation middleware on the API for `/me/*` routes.
- **Phase 3:** Create the user row on first login. Make sure logged-out users can still use screens 01–04 with no prompts.

### Task 2: Build MP lookup + sponsor email
Branch: `platform/mp-lookup`
- **Phase 1:** Test the Open North Represent API: `https://represent.opennorth.ca/postcodes/K1P1A4/` → MP name, riding, email, phones.
- **Phase 2:** `GET /mp?postal=` endpoint wrapping it (return only the federal MP). Sponsor email template filled from the draft + MP.
- **Phase 3:** "Send request by email" opens a `mailto:` link with subject and body. "Choose a different MP" flow. Handle bad postal codes.

### Task 3: Build the draft flow + deploy + demo
Branch: `platform/draft-deploy`
- **Phase 1:** Set up hosting (e.g. Vercel) with env vars so there's a deploy URL from the start.
- **Phase 2:** Draft flow: step 1 saves the draft, step 2 attaches the MP, step 3 hands off to ourcommons.ca with the text ready to copy.
- **Phase 3:** End-to-end test of the full path on the deployed URL. Demo script, pitch deck, final deploy.

---

## If time runs out, cut in this order

1. Stretch items (Tiger Data trends, tracking petitions, provincial items)
2. News pipeline (data stories alone fill the feed)
3. Petition matching (show "Start a petition" everywhere)

Never cut: tax calc, breakdown, data stories, detail page, MP lookup + email.

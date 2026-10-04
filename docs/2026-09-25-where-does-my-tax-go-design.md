# Where Does My Tax Go? — Hackathon MVP Design

**Date:** 2026-09-25
**Status:** Draft for review (v2: split into two parts)
**Scope:** Canada, federal government spending

> **One-liner:** Your federal tax receipt, with a reply button.

## How this spec is organized

The product is built in **two parts by two sub-teams working at the same time**.

| Section | Who reads it |
|---|---|
| **Shared** (§1–§11): the problem, users, flow, the handoff contract between the parts, privacy, and trust rules | Everyone |
| **Part 1 — Spending tracker** (§12–§18): "Where does my money go?" | Part 1 team |
| **Part 2 — Civic action layer** (§19–§26): "What can I do about it?" | Part 2 team |
| **Bringing it together** (§27–§32): team, schedule, integration checkpoints, fallbacks, and the demo | Everyone |

---

# Shared

## 1. Summary

Where Does My Tax Go? shows Canadians what the federal government spends their money on, in plain language and in their own dollars, and gives them a way to make the people responsible answer for it.

- **Part 1, the spending tracker,** answers *"Where does my money go?"* It shows a personal tax receipt, spending categories, and a page for each specific spending decision.
- **Part 2, the civic action layer,** answers *"What can I do about it?"* People gather on a spending decision's page, back a shared question, and send it to their MP. Answers are posted back on the same page.

The two parts meet in one place: **the spending decision page.** Part 1 shows the facts. Part 2 adds a panel with the questions and actions.

The platform holds decision makers accountable by **making them answer in public**. It does not promise that citizens can stop or undo a spending decision. At the federal level, the money is usually spent before the public hears about it. What citizens can realistically win is an explanation, on the record, and pressure that makes the next decision better.

## 2. Problem

Canadians hear about federal spending in two ways:

- **News headlines.** They cover one scandal at a time, with no sense of scale. People get angry for a week, then move on, because there is nothing obvious to do.
- **Budget documents and dashboards.** They cover everything, in language and numbers most people can't use, and they offer no way to act.

Neither shows a person what *their* money bought. Neither gives them a way to turn "that seems off" into a question that someone responsible has to answer.

## 3. Target user

**The headline-triggered taxpayer.** A working Canadian, roughly 25–45, who just saw a story about government spending. They have about five minutes of motivation. They don't know whether to be angry, how big the problem really is, or what they could do about it.

Not the target: policy experts and analysts. They already have the government's own data tools.

Later audience (Future concept): journalists and civic groups, who could use the collected questions as leads.

## 4. Glossary

| Term | Meaning in this product |
|---|---|
| **Spending decision** | One contract or grant from the government's published records, or a hand-built "project" that groups several contracts (hero decisions only). Each gets its own page. |
| **Question** | A templated question attached to one spending decision, chosen by picking a reason. Each decision has at most one question per reason. |
| **Backer** | A person who clicked "I want to know too" on a question. |
| **MP (Member of Parliament)** | The person each riding elects to the House of Commons in Ottawa. Every Canadian has exactly one MP, based on where they live. MPs vote on federal laws and spending, and they can make ministers answer questions in Parliament. |
| **Riding** | A federal electoral district. Each riding elects one MP. There are 343. |
| **Your share** | The part of a spending decision that the user's own federal income tax paid for. |
| **Proactive disclosure** | The government's public records of contracts over $10,000 and grants over $25,000, published every quarter. |
| **E-petition** | An official House of Commons online petition. Once one gets 500 signatures, the government must give a written response. |
| **Access to information request** | A formal legal request for a department to release its documents. |
| **Hero decision** | One of the 5 hand-picked, fact-checked spending decisions used in the demo. |
| **Civic panel** | Part 2's section at the bottom of each spending decision page, holding its questions and actions. |
| **Handoff contract** | The small set of shared types, functions, and components (§9.3) that the two parts agree on, so each can build without waiting for the other. |

## 5. Labels and assumptions

Every feature has one label:

- **Must-have for MVP**: the demo fails without it.
- **Nice-to-have**: build it if time allows, in the priority order in the part's build order.
- **Future concept**: part of the pitch vision only. Do not build it.

**Assumed capacity:** the Must-haves fit about 24 hours with 3 people. The Nice-to-haves fit if you have 36–48 hours or a fourth person. The schedule in §28 is written for 24 hours; stretch it in proportion for longer events.

## 6. Success criteria for the demo

1. A judge can go from the landing page to a ready-to-send letter to their own MP in **under 90 seconds**.
2. **Every number on screen links to an official source.**
3. It works on a phone screen.
4. It works if the venue internet drops: a demo mode loads all data locally, including a cached MP lookup.
5. It includes at least one positive or neutral spending decision, so the demo doesn't read as partisan.
6. **Each part works on its own.** Part 1 can be demoed without Part 2. Part 2 can be demoed on sample decisions without Part 1.

## 7. The two parts at a glance

| | Part 1: Spending tracker | Part 2: Civic action layer |
|---|---|---|
| Question it answers | Where does my money go? | What can I do about it? |
| Screens | Landing, Receipt, Category, Spending decision page (facts) | Civic panel (inside the decision page), Ask your MP, Confirmation |
| Data it owns | Government spending data, the tax estimate, decisions | Questions, backers, answers, MP lookup |
| Outside services | None at runtime (all static files) | Represent API (MP lookup); Supabase (Nice-to-have) |
| People | 2: data lead, tracker UI | 1–2: civic lead (plus civic services in a team of 4) |
| Works alone? | Yes: a complete "inform" demo | Yes: on sample decisions, through a test page |

## 8. User flow

```
            PART 1: Spending tracker                          │  PART 2: Civic action layer
                                                              │
Landing ──► Receipt ──► Category ──► Spending decision page ──┼──► Civic panel ──► Ask your MP ──► Confirmation
                                          ▲                   │   (bottom of the
Shared link (news, social) ───────────────┘                   │    decision page)
```

1. **Landing** (Part 1). The user enters a postal code (optional, used later to find their MP) and their income on a slider. "Use a typical income" skips the slider.
2. **Receipt** (Part 1). "You paid about $8,000 in federal income tax. Here's where it went." About 10 lines, largest first, printed like a store receipt.
3. **Category** (Part 1). Tapping a receipt line opens its spending decisions, sorted by size, each with its "your share" amount and fact badges.
4. **Spending decision page** (Part 1). What it was, who got the money, how much, which department decided and which minister is responsible, the user's share, fact badges, and sources.
5. **Civic panel** (Part 2), at the bottom of that page. The user's MP, the questions people are asking, and a button to back one. If the question for their reason doesn't exist yet, backing creates it.
6. **Ask your MP** (Part 2). A prefilled, sourced letter to the user's own MP, which they can edit and then send from their own email.
7. **Confirmation** (Part 2). "You're backer #1,285. Here's what happens next."

A shared link to a spending decision page also works as an entry point. Without landing-page inputs, the page uses a typical income and shows a "See your own receipt" prompt.

## 9. Shared foundation

The whole team builds this together in the first 2 hours (§28), before splitting up.

### 9.1 Stack
- **Front end:** Vite + React + TypeScript, deployed as one static site (Vercel or Netlify).
- **Validation:** zod schemas for the shared types, so both parts can check data against the contract.
- **Tests:** Vitest.
- **Part 1 data pipeline:** one script in Python or Node (the data lead's choice). It writes static JSON.
- **Part 2 community store:** browser storage plus seed data for the MVP. Supabase is a Nice-to-have (§23.3).

### 9.2 Folder layout and ownership

Each part owns its own folders. This keeps the two sub-teams from editing the same files.

```
/pipeline                   Part 1   data script, LLM summary cache, validation
/public/data                Part 1   receiptCategories.json, decisions.json, config.json
/public/data/civic          Part 2   questionTemplates.json, seedCommunity.json, mpCache.json
/src/shared                 Joint    handoff contract (§9.3), theme, demo mode, sample decisions
/src/app                    Joint    routes only
/src/tracker                Part 1   screens, components, lib (tax, share, badges)
/src/civic                  Part 2   CivicPanel, screens, components, lib, services
```

**Rule for `/src/shared`:** it is frozen after the foundation phase. Adding a new *optional* field is fine at any time. Any other change needs both part leads to agree and a heads-up in the team chat.

### 9.3 The handoff contract

This is everything one part needs from the other. Nothing else crosses the line.

**Part 1 provides to Part 2:**

```ts
// src/shared/types.ts — the Decision type is derived from a zod schema of the same shape
type Decision = {
  id: string;
  type: "contract" | "grant" | "project";
  titlePlain: string;
  summaryPlain: string;
  summaryIsAi: boolean;
  recipientName: string;
  department: string;
  ministerResponsible: string;
  ministerAsOf: string;          // ISO date
  categoryId: string;
  originalValue: number;         // dollars
  currentValue: number;          // dollars, maximum committed
  amendmentCount: number;
  competitive: boolean | null;   // null = unknown
  awardDate: string;             // ISO date
  riding: string | null;         // grants only
  sourceUrl: string;
  contextLinks: { title: string; url: string }[];
  dataAsOf: string;              // ISO date
  isHero: boolean;
};

type UserInputs = {
  income: number;
  incomeIsTypical: boolean;
  postalCode: string | null;
};

// src/shared/data.ts — maintained by Part 1
function getDecision(id: string): Promise<Decision | null>;
function listDecisions(filter?: { categoryId?: string; riding?: string }): Promise<Decision[]>;

// src/shared/userInputs.tsx — maintained by Part 1
// Set on Landing and kept in sessionStorage for the browser tab only.
function useUserInputs(): UserInputs & { setPostalCode(code: string): void };
```

**Part 2 provides to Part 1:**

```tsx
// src/civic/CivicPanel.tsx — maintained by Part 2
// Part 1 renders this at the bottom of the spending decision page.
function CivicPanel(props: { decision: Decision }): JSX.Element;
```

Part 2 commits a **stub** `CivicPanel` during the foundation phase that renders "Questions and actions coming soon." Part 1 imports it from the start and never has to change that line.

### 9.4 Sample decisions
During the foundation phase, the Part 1 data lead hand-writes `src/shared/fixtures/decisions.sample.json`. It holds 3 decisions that match the `Decision` type exactly:
1. a contract awarded without competition and amended twice;
2. a competitively awarded contract with no amendments;
3. a grant with a riding.

Part 2 builds and tests against these until real data arrives at checkpoint 1.

### 9.5 Routes

| Route | Screen | Owner |
|---|---|---|
| `/` | Landing | Part 1 |
| `/receipt` | Receipt | Part 1 |
| `/category/:id` | Category | Part 1 |
| `/decision/:id` | Spending decision page (includes the Civic panel) | Part 1 |
| `/decision/:id/ask/:reason` | Ask your MP | Part 2 |
| `/decision/:id/done/:reason` | Confirmation | Part 2 |
| `/dev/civic/:sampleId` | Test page: the Civic panel on a sample decision (development only) | Part 2 |

### 9.6 Theme
`src/shared/theme.css` defines the colours, fonts, spacing, the receipt paper style, and the badge style. It's set in the foundation phase so both parts look like one product.

### 9.7 Demo mode — Must-have for MVP
`src/shared/demoMode.ts` exports `isDemoMode()`. It's turned on by `?demo=1` and remembered for the browser tab. In demo mode:
- Part 1 needs no change, because its data is already static.
- Part 2 uses the cached MP lookup and the local community store with seed data.

The app must run end to end with the network off.

## 10. Privacy — Must-have for MVP
- **Income:** never leaves the browser. Kept in sessionStorage only. (Part 1)
- **Postal code:** sent only to the Represent API to find the MP, and never stored by us. When someone backs a question, we store only the **riding name**. (Part 2)
- **Name in the letter:** typed into the user's own email app. We never see it. (Part 2)
- **Device ID:** a random ID in browser storage, used only to allow one backing per question. (Part 2)
- No accounts and no sign-in.

## 11. Trust and fairness rules — Must-have for MVP

| Rule | Enforced by |
|---|---|
| Every number links to an official source. | Part 1 |
| Contract amounts say "up to $X" and show the original and current value. | Part 1 |
| Badges state facts from the record, never judgments. There is no "suspicious" badge. | Part 1 |
| No political party labels on spending decisions. | Both |
| AI summaries are labelled, use only the record's fields, and are reviewed by a person for hero decisions. | Part 1 |
| Every decision offers the positive `support` option. | Part 2 |
| Buttons say **"Ask,"** never "Stop this" or "Cancel this." | Part 2 |
| Seeded numbers are disclosed in the README and when judges ask. | Part 2 |
| The demo includes at least one positive or neutral decision. | Both |

---

# Part 1 — Spending tracker

**Answers:** "Where does my money go?"
**Owns:** Landing, Receipt, Category, and the spending decision page (everything except the Civic panel), plus the data pipeline and the `Decision` data.

## 12. Part 1 scope

| Feature | Label |
|---|---|
| Landing: postal code (format check only) and income slider, with "Use a typical income" | Must-have for MVP |
| Receipt: about 10 plain-language lines, printed like a store receipt (CSS animation) | Must-have for MVP |
| Category drill-down for 2–3 categories; a one-card explanation for the rest | Must-have for MVP |
| Spending decision page: facts, your share, badges, who's responsible, sources, and the Civic panel slot | Must-have for MVP |
| Data pipeline, 5 hero decisions, and about 100 other decisions | Must-have for MVP |
| Badges: "Awarded without competition" and "Cost grew N times" | Must-have for MVP |
| Badge: "Signed in the last 2 weeks of the fiscal year" | Nice-to-have |
| In your riding: a map of federal grants to organizations in the user's riding | Nice-to-have |
| Share card: an image reading "My share of [decision]: $0.93" | Nice-to-have |
| French version of the tracker screens and hero decisions | Nice-to-have |
| City and provincial spending | Future concept |
| Paste a news link and get the matching spending decisions | Future concept |

## 13. Part 1 screens

### 13.1 Landing — Must-have for MVP
- Postal code field (optional). It checks the Canadian postal code format only. Finding the MP is Part 2's job.
- Income slider with a "Use a typical income" option.
- Note under the fields: "Your income never leaves this device."
- Saves both values through `useUserInputs()`.

### 13.2 Receipt — Must-have for MVP
- Styled as a store receipt: monospace text, a torn-paper edge, and lines that print one by one.
- Top line: the user's estimated federal income tax.
- About 10 category lines, each with a dollar amount. Suggested categories:
  - Seniors' pensions
  - Health transfer to provinces
  - Other transfers to provinces
  - Children's benefits
  - Employment Insurance
  - Interest on the national debt
  - National defence
  - Grants to organizations and communities
  - Running government departments
  - Other
- A clear insight line: "Most of your money goes straight to people and provinces. About X% runs federal departments, and that's where contracts are." X is the combined share of the "Running government departments" and "National defence" lines.
- A methodology note, always visible and not hidden in a tooltip: "Estimate. Your federal income tax, split in the same proportions as total federal spending."
- Footer: "Data: fiscal year [year]" with a source link.

### 13.3 Category — Must-have for MVP (2–3 categories only)
- Drill-down is built only for categories that contain hero decisions: "Running government departments," "Grants to organizations and communities," and at most one more.
- Other categories show one card instead, with what it pays for, how many people it reaches, and a source link.
- Each decision in the list shows its plain title, recipient, amount, your share, and badges.

### 13.4 Spending decision page — Must-have for MVP
Sections, top to bottom:

1. **Header:** plain-language title, recipient, department, amount (labelled "up to $X" for contracts), and date.
2. **Your share:** a large number, e.g. "Your share: about 93¢."
3. **Fact badges**, shown only where they apply:
   - *Awarded without competition.* Its tooltip explains that this can be legitimate, for example in emergencies or when there is only one supplier.
   - *Cost grew N times (+X%)*, shown when the contract was amended.
4. **Plain summary:** 2–3 sentences, labelled "AI summary — check the original record," with a link to that record.
5. **Who's responsible:** the department, and the minister responsible for it (name, with an "as of" date).
6. **Context:** links to official reviews, such as Auditor General or Parliamentary Budget Officer reports. Hero decisions only.
7. **`<CivicPanel decision={decision} />`**, owned by Part 2.
8. **Footer:** "Data as of [date]" and a link to the original record.

If the user arrived from a shared link without landing-page inputs, "your share" uses a typical income, with a "See your own receipt" link to Landing.

## 14. Part 1 data

### 14.1 Sources
| Source | Used for | Label | Watch out for |
|---|---|---|---|
| Annual Financial Report of the Government of Canada (Finance Canada) | Receipt category amounts and total federal spending | Must-have for MVP | Hand-group into about 10 plain categories. Cite each one. |
| Proactive disclosure: contracts over $10,000 (open.canada.ca) | Spending decisions, recipients, original vs. amended value, whether competitive | Must-have for MVP | Very large, messy CSV. Filter offline. The value is the maximum committed, not necessarily the amount paid. |
| CRA federal tax brackets and basic personal amount | The tax estimate | Must-have for MVP | Hardcode the current year's figures in `config.json`. |
| Statistics Canada median income | The "Use a typical income" default | Must-have for MVP | Hardcode in `config.json` and cite it. |
| Auditor General and Parliamentary Budget Officer reports | Context links for hero decisions | Must-have for MVP | Hand-link. Pass these to Part 2 for its seeded answers. |
| Department → minister list | "Who's responsible" | Must-have for MVP | Hand-enter for demo departments, with an "as of" date. Ministers change. |
| Proactive disclosure: grants and contributions | Grant decisions; the "In your riding" map | Must-have for MVP (hero grant only); Nice-to-have (map) | Check how often the riding field is filled in. |
| GC InfoBase (Treasury Board) | Mapping departments to categories | Nice-to-have | |

### 14.2 The demo data slice
- **5 hero decisions**, hand-picked and fact-checked:
  1. A spending decision already reviewed by the Auditor General (e.g. ArriveCAN, entered as a "project" grouping its contracts, with the total from the AG report).
  2. A contract that grew through several amendments.
  3. A contract awarded without competition, with the tooltip explaining the legitimate reasons that can happen.
  4. A grant to an organization in the demo riding, as the positive or neutral example.
  5. One more from a different department, for balance.
- **About 100 other decisions**, taken automatically from the contracts data for the drill-down categories and the most recent full fiscal year.

### 14.3 Part 1 data files (built offline, loaded as static JSON)

`receiptCategories.json`
```
id, name, plainDescription, amountDollars, shareOfTotal, hasDrilldown, sourceUrl
```

`decisions.json`: an array of `Decision` (§9.3).

`config.json`
```
fiscalYear, totalFederalSpending, taxBrackets [...], basicPersonalAmount,
typicalIncome, typicalIncomeSourceUrl
```

### 14.4 Calculations
- **Federal tax estimate** = apply the brackets to income, then subtract the basic personal amount credit. Ignore other credits. Always labelled "estimate." If the result is below 0, use 0.
- **Your share of a category or decision** = (amount ÷ total federal spending) × the user's estimated federal tax.
- **Display rules:** show amounts under $1 in cents ("93¢"), under $100 to the cent, and above that to the nearest dollar.

### 14.5 Pipeline steps
1. Download the contracts and grants CSVs.
2. Filter to the drill-down categories' departments and the chosen fiscal year.
3. Map each department to a receipt category and to its minister.
4. Generate plain summaries with an LLM (Claude), using only each record's own fields. Cache the results in a file so they're generated once.
5. Add the 5 hero decisions by hand, and have a person review each hero summary.
6. Validate (§17.2), then write to `public/data/`.

## 15. Part 1 units

| Unit | What it does | Depends on |
|---|---|---|
| `estimateFederalTax(income, config)` | Returns the estimated federal income tax | config |
| `yourShare(amount, userTax, totalSpending)` | Returns the user's share in dollars | nothing |
| `formatShare(dollars)` | Applies the display rules in §14.4 | nothing |
| `badgesFor(decision)` | Returns the fact badges that apply | nothing |
| `getDecision`, `listDecisions` | Load decisions from static JSON; validate them against the schema in development | `/public/data` |
| `useUserInputs` | Holds the landing-page inputs for the tab | sessionStorage |

## 16. Part 1 errors and edge cases

| Situation | What happens |
|---|---|
| Postal code in the wrong format | Inline message with an example ("K1A 0A6"). |
| Postal code skipped | Everything in Part 1 works. Part 2 asks for it at the letter step. |
| Income skipped | Use the typical income, and label the receipt "Based on a typical income." |
| Estimated tax is $0 | The receipt switches to "How every $100 of federal spending is split." "Your share" becomes "per $100." |
| Shared link, no landing-page inputs | Use the typical income, with a "See your own receipt" link. |
| Decision ID not found | "We couldn't find this spending decision," with a link to the receipt. |
| Record is missing a field (e.g. no description) | Hide that row. Never show "undefined" or a blank label. |
| Decision was competitive or not amended | Hide the matching badge. |
| Minister has changed since the data was entered | The "as of" date is always shown next to the minister's name. |

## 17. Part 1 tests

### 17.1 Unit tests (Vitest) — Must-have for MVP
- `estimateFederalTax`: $0 income; income exactly on each bracket boundary; high income; result never below 0.
- `yourShare` and `formatShare`: cents, dollars-and-cents, and whole-dollar cases.
- `badgesFor`: competitive vs. not; amended vs. not; missing fields.

### 17.2 Data validation — Must-have for MVP
These checks run at the end of the pipeline, in a small Node script (`pipeline/validate.ts`) that imports the shared zod schema. It runs this way even if the rest of the pipeline is written in Python.
- Every decision passes the shared `Decision` schema. (This is the contract test: if it passes, Part 2 can use the data.)
- Every decision has a `sourceUrl`, a value above 0, and a valid `categoryId`.
- Every hero decision has at least one context link and a reviewed summary.
- Receipt category shares add up to 100% (±0.5%).

## 18. Part 1 build order
1. Foundation work (§28): sample decisions, `Decision` schema, `useUserInputs`, `getDecision`.
2. `config.json` and `receiptCategories.json`, then the Receipt screen.
3. Hero decisions in `decisions.json`, ready by **checkpoint 1**.
4. Spending decision page, with badges and your share.
5. Landing and Category screens.
6. The remaining ~100 decisions from the pipeline.
7. Error states and phone layout.
8. Nice-to-haves, in this order:
   1. Share card
   2. In your riding map
   3. Fiscal year-end badge
   4. French

---

# Part 2 — Civic action layer

**Answers:** "What can I do about it?"
**Owns:** the Civic panel, Ask your MP, Confirmation, questions and backing, the community store, and the MP lookup.

## 19. Part 2 scope

| Feature | Label |
|---|---|
| Civic panel: your MP, questions with backer and riding counts, and a back button | Must-have for MVP |
| Templated questions only, no free text; at most one question per reason per decision | Must-have for MVP |
| One backing per question per device | Must-have for MVP |
| MP lookup from postal code, with a cached demo response | Must-have for MVP |
| Ask your MP: a prefilled, editable letter opened in the user's email, plus a copy button | Must-have for MVP |
| Confirmation screen | Must-have for MVP |
| Seeded community data for hero decisions | Must-have for MVP |
| Local community store (browser storage + seed) | Must-have for MVP |
| Supabase store + live counter (judges scan a QR code, and the count updates on the big screen) | Nice-to-have |
| Answered questions: an answer with its official source, closing the question | Nice-to-have |
| Link to official e-petitions, with the rules explained | Nice-to-have |
| Prefilled access to information request | Nice-to-have |
| Most-asked this week: decisions ranked by backers | Nice-to-have |
| French version of the civic screens | Nice-to-have |
| Short optional notes (up to 280 characters) with moderation | Future concept |
| Verified accounts so MP offices and departments can post answers | Future concept |
| Community Notes–style context that needs agreement across viewpoints | Future concept |
| A weekly digest to each MP of their constituents' top questions | Future concept |
| A civic calendar ("Parliament votes on more spending in 3 weeks — ask now") | Future concept |
| Your MP's votes and speeches on related topics (openparliament.ca) | Future concept |
| Submissions to House of Commons committees | Future concept |

## 20. Civic panel and questions (no social feed)

Participation happens **on the spending decision**, not in a feed. People back shared questions instead of posting their own opinions.

### 20.1 What the panel shows — Must-have for MVP
1. **Your MP:** "Your MP: [name], [riding]." If there's no postal code yet, it shows "Add your postal code to find your MP" with an inline field that calls `setPostalCode`.
2. **Questions:** each with its text, backer count, riding count, and an "I want to know too" button. Most backers first; answered questions last.
3. **Add a reason:** reasons that don't have a question yet on this decision. Picking one creates the question with the user as its first backer.
4. **Take action:** after the user backs a question, an "Ask your MP about this" button opens `/decision/:id/ask/:reason`.

### 20.2 Rules — Must-have for MVP
- Questions exist only in the Civic panel. There is no global feed, no profiles, follows, replies, or direct messages.
- There is no free text in the MVP. Every question comes from a template. This keeps the MVP almost free of moderation work.
- Each decision has at most one question per reason.
- Backing takes one click. Each device can back a question once.
- Each question shows two numbers: **backers** and **ridings they come from**. Backers from many ridings are more convincing than raw volume.

### 20.3 Reasons and templates — Must-have for MVP
Conditions use only `Decision` fields, so Part 2 never depends on Part 1's badge code.

| Reason code | Question text | Shown when |
|---|---|---|
| `delivered` | What exactly did we get for this money? | Always |
| `no_competition` | Why was this awarded without competition? | `decision.competitive === false` |
| `cost_grew` | Why did the cost grow from $X to $Y? | `decision.amendmentCount > 0` |
| `duplicate` | Is this already being paid for somewhere else? | Always |
| `value` | Was this good value for money? | Always |
| `support` | This is worth it — keep funding it. | Always (a positive signal, shown as support rather than a question) |

### 20.4 Answers — Nice-to-have
- An answered question shows the answer summary, its source (e.g. "Auditor General report, 2024, paragraph X"), and the date.
- In the MVP, the team adds answers directly to the seed data or database, using the context links from Part 1's data lead.
- Seed one answered question on a hero decision, so the demo can show the loop closing.

## 21. Actions: how accountability happens

The platform never acts on the user's behalf. It prepares the action, and the user takes it.

### 21.1 Ask your MP — Must-have for MVP
- Reached from the Civic panel after the user backs a question (or supports a decision).
- If the user has no postal code yet, the screen asks for it first.
- The letter is prefilled and editable:

```
To: [MP email]
Subject: Question about [decision title] ($[amount], [department])

Dear [MP name],

I'm your constituent in [riding] ([postal code]).

I'm writing about [decision title]: [one-sentence plain summary].
Amount: up to $[amount]. Department: [department]. Minister responsible: [minister].
Source: [original record URL]

My question: [question text]

[Personal note — the user is prompted to add one sentence]

I'm one of [N] Canadians, from [R] ridings, who have asked this question on Where Does My Tax Go?

Sincerely,
[Name]
```

- The "one-sentence plain summary" is the first sentence of `decision.summaryPlain`.
- Sending opens the user's own email app (a `mailto:` link). A "Copy letter" button is always shown next to it.
- The postal code is included because MP offices give priority to their own constituents.
- The user is prompted to add a personal sentence, because identical form letters get less attention.
- For the `support` reason, the letter says "I support this spending" instead of asking a question.

### 21.2 Confirmation — Must-have for MVP
- "You're backer #N on this question, from N ridings."
- What happens next: "MPs pay attention when many constituents ask the same thing. Answers will be posted on this page."
- Links back to the decision and to the receipt.

### 21.3 Official e-petition — Nice-to-have
- A link to House of Commons e-petitions, with a plain explanation: once a petition reaches 500 signatures, the government must respond in writing.
- Starting a petition needs an MP to sponsor it, so the page explains that and links to the rules.
- **We do not host our own petitions.** They would have no official weight and would just duplicate Change.org.

### 21.4 Request the documents — Nice-to-have
- Prefilled text for an access to information request about this contract, with a copy button and a link to the government's online request service.
- The user submits it and pays any fee themselves.

## 22. Part 2 data

### 22.1 Sources
| Source | Used for | Label | Watch out for |
|---|---|---|---|
| Represent API (Open North) | Postal code → riding, MP name, and MP email | Must-have for MVP | Rate-limited. Bundle a cached response for the demo postal code in `mpCache.json`. |
| Seeded community data | Backer and riding counts for hero decisions | Must-have for MVP | Disclose that it's seeded. The live backing is real. |
| House of Commons e-petitions | Link and rules | Nice-to-have | Link out only. |
| Government access to information online request service | Link | Nice-to-have | Link out only. |

### 22.2 Part 2 data files

`questionTemplates.json`
```
reasonCode, text, appliesWhen ("always" | "notCompetitive" | "amended")
```

`seedCommunity.json`
```
questions [{decisionId, reasonCode, backers, ridingCounts {riding: n}, answer | null}]
answer = {summary, sourceTitle, sourceUrl, date}
```

`mpCache.json`
```
{ "[postal code]": {riding, mpName, mpEmail, mpUrl} }
```

## 23. Part 2 services

### 23.1 `lookupMp(postalCode)`
- Returns `{riding, mpName, mpEmail | null, mpUrl}` or `{error: "notFound" | "unavailable"}`.
- Checks `mpCache.json` first. In demo mode, it uses only the cache.
- Times out after 3 seconds.

### 23.2 `CommunityStore`
```ts
getQuestions(decisionId): Promise<Question[]>
back(decisionId, reasonCode, riding | null): Promise<"ok" | "alreadyBacked" | "unavailable">
subscribe(decisionId, callback): () => void   // used by the live counter
```
`Question` is a Part 2 type and is not part of the handoff contract.

### 23.3 Two implementations behind the same interface
- **Local (Must-have for MVP):** browser storage plus `seedCommunity.json`. Backings only show on the device that made them, which is fine for a single-screen demo.
- **Supabase (Nice-to-have):** a hosted database with live updates. It's needed for the live counter, where judges back a question from their phones.

Switching between them is a single line in `src/civic/services/index.ts`.

## 24. Part 2 units

| Unit | What it does | Depends on |
|---|---|---|
| `questionsFor(decision, templates, stored)` | Returns which questions to show, merged with counts | nothing |
| `composeMpLetter(decision, question, mp, counts, user)` | Returns the letter's subject and body | nothing |
| `lookupMp(postalCode)` | See §23.1 | Represent API, `mpCache.json` |
| `CommunityStore` | See §23.2 | browser storage or Supabase |
| `CivicPanel`, `AskMp`, `Confirmation` | The screens | the units above and the handoff contract |

## 25. Part 2 errors and edge cases

| Situation | What happens |
|---|---|
| MP lookup fails or takes over 3 seconds | Use the cache if the postal code is in it. Otherwise show "We couldn't find your MP" with a link to the House of Commons MP search. Backing keeps working. |
| Postal code skipped | Backing works, recorded with riding "unknown" and not counted toward ridings. Ask for the postal code on the Ask your MP screen. |
| MP has no email in the data | Show a link to the MP's contact page instead of the email button. |
| No email app, or letter too long for `mailto:` | The "Copy letter" button is always visible. |
| Community store unreachable | Show seeded counts read-only. Disable backing, with the message "Backing is paused — try again shortly." |
| User backs the same question twice | Ignored. Show "You've already backed this." |
| Unknown reason code in the URL | Return to the decision page. |
| Decision was competitive or not amended | Hide the matching question. |

## 26. Part 2 tests and build order

### 26.1 Unit tests (Vitest) — Must-have for MVP
- `questionsFor`: conditional templates appear only when they apply; stored counts merge correctly. Run against all 3 sample decisions.
- `composeMpLetter`: includes the source URL, postal code, riding, backer count, and ridings count; uses support wording for the `support` reason.
- `lookupMp` (with a fake network): success, not found, timeout, and cache hit.
- `CommunityStore` (local version): one backing per device per question; riding counts go up correctly; `unknown` riding isn't counted.

### 26.2 Build order
1. Foundation work (§28): the stub `CivicPanel`, and the `/dev/civic/:sampleId` test page.
2. `questionTemplates.json`, `questionsFor`, and the local `CommunityStore` with seed data.
3. The real Civic panel with backing, working on sample decisions.
4. At **checkpoint 1**: the Civic panel on real hero decision pages.
5. `lookupMp` with `mpCache.json`, then Ask your MP and Confirmation.
6. Seed data for all 5 hero decisions.
7. Error states and phone layout.
8. Nice-to-haves, in this order:
   1. Supabase + live counter
   2. Answered questions
   3. E-petition and documents request links
   4. Most-asked this week
   5. French

---

# Bringing it together

## 27. Team and ownership

| Team size | Part 1: Spending tracker | Part 2: Civic action layer | Pitch |
|---|---|---|---|
| **3 people** | Data lead (pipeline, hero decisions, fact-check); Tracker UI (Landing, Receipt, Category, Decision page) | Civic lead (everything in Part 2) | Tracker UI leads the slides after checkpoint 2 |
| **4 people** | Same as above | Civic UI (panel, Ask your MP, Confirmation); Civic services (store, MP lookup, seed data, Supabase) | Civic services leads the slides after checkpoint 2 |

Each part has **one lead**: the data lead for Part 1, and the civic lead (or civic UI in a team of 4) for Part 2. The two leads are the only people who can approve changes to `/src/shared`.

## 28. Schedule and integration checkpoints (24-hour version)

| Time | Part 1 | Part 2 | Together |
|---|---|---|---|
| **0–2h: Foundation** | Sample decisions, `Decision` schema, `useUserInputs`, `getDecision` | Stub `CivicPanel`, `/dev/civic` test page | Repo, routes, theme, demo mode flag. Freeze `/src/shared`. |
| **2–8h** | Config, receipt data, Receipt screen, hero decisions | Templates, local store, Civic panel with backing on sample decisions | |
| **Checkpoint 1 (8h)** | Hero decisions in `decisions.json` | Civic panel ready to use | 15 minutes: walk Receipt → Decision → back a question on a real hero decision. |
| **8–16h** | Decision page, Landing, Category, remaining decisions | MP lookup, Ask your MP, Confirmation, full seed data | |
| **Checkpoint 2 (16h): feature freeze** | | | Full flow end to end, including `?demo=1` with the network off. Choose which Nice-to-haves to try. Anything not working end to end is cut, not fixed. |
| **16–21h** | Error states, polish, Nice-to-haves | Error states, polish, Nice-to-haves | Pitch deck |
| **21–24h** | | | Rehearse twice (once offline), complete the fact-check, keep a buffer |

## 29. If one part falls behind

- **Part 2 is late:** the stub panel still renders, so Part 1 demos on its own. Part 2's build order puts backing before the MP letter. The smallest useful Part 2 demo is backing with counts plus the letter using the cached demo MP.
- **Part 1 is late:** Part 2 keeps building on sample decisions. The smallest Part 1 demo is:
  - a receipt with hardcoded numbers for the demo persona;
  - the 5 hero decisions only, in one flat list instead of category pages;
  - a decision page with just the header, your share, the summary, and the Civic panel.
- **Both are late:** at checkpoint 2, cut to the hero flow in the demo script (§30) and nothing else.

## 30. Demo script and pitch

Two presenters, one per part. The handoff between them mirrors the product: first *inform*, then *act*.

**Presenter A (Part 1 lead):**
- **0:00–0:20 Hook.** "In 2024 the Auditor General couldn't pin down exactly what ArriveCAN cost. The best estimate was about $59.5M. People were angry for a week and then moved on, because there was nothing obvious to do."
- **0:20–0:50 Receipt.** Priya, a nurse in Ottawa Centre earning $72K, enters her postal code and income. Her receipt prints: about $8,000. First surprise: interest on the debt is one of her biggest lines. Second: only a small share runs federal departments.
- **0:50–1:20 Spending decision.** She taps "Running government departments," then ArriveCAN. "Your share: about 93¢." Fact badges show what the record says, only the ones confirmed in the fact-check. "News gave you the outrage. We give you the scale."

**Handoff line:** "That's where most spending tools stop. This is where we start."

**Presenter B (Part 2 lead):**
- **1:20–1:50 Questions.** 1,284 people from 212 ridings are asking "What exactly did we get for this money?" Priya backs it. If the live counter was built: "Scan this code and back it too." The number climbs on screen.
- **1:50–2:25 Act.** Her real MP appears, with a sourced letter she can personalize and send. If answered questions were built, show one with an Auditor General citation: the loop can close.
- **2:25–2:45 Balance.** She opens "Grants to organizations and communities," finds a grant to a community group in her riding, and supports it. "This isn't an outrage machine."
- **2:45–3:00 Vision.** "Next: every MP gets a weekly digest of what their constituents are asking about specific spending. Anger becomes questions, and questions get answers."

**Answers for likely judge questions:**
- *"Isn't this the government's own data tool?"* (A) That's built for analysts. It stops at the department level, has no personal view, and offers no way to act.
- *"Won't this become a partisan outrage tool?"* (B) Questions come from templates, there's a support option, every decision shows its real scale, and all facts come from official sources.
- *"Do letters to MPs work?"* (B) Constituent letters with postal codes get logged. The real asset is the count across ridings, which is what the MP digest builds on.
- *"Is the data accurate?"* (A) Every number links to its source, contract amounts are labelled as maximums, and the receipt shows its method.

## 31. Facts to verify before the pitch

The Part 1 data lead owns this list, and the Part 2 lead checks the items marked (P2).

- ArriveCAN total (the Auditor General's 2024 estimate, about $59.5M).
- Total federal spending for the chosen fiscal year.
- The ~$8,000 tax figure for a $72,000 income, using current CRA brackets.
- Priya's share figures (the 93¢ and the debt interest line), recomputed from the final data.
- Which fact badges truly apply to the ArriveCAN project (how it was awarded, whether costs grew).
- What "contract value" means in the disclosure data (maximum committed vs. amount paid).
- Every hero decision's minister is current on demo day.
- (P2) 343 ridings, and that the Represent API returns MP emails for the current ridings.
- (P2) E-petition rules: 500 signatures, and the deadline for the government's response.

## 32. Out of scope

| Not building | Why | Instead |
|---|---|---|
| Our own petition system | No official weight; duplicates Change.org | Link to official e-petitions (Part 2, Nice-to-have) |
| Open discussion threads or forums | Turns into a generic social feed and needs moderation | Templated questions with backing |
| User accounts and profiles | Adds time and privacy risk, and makes it social | Device ID for one backing per question |
| An "ask the budget anything" chatbot | Judges have seen many, and it can make things up | Plain summaries generated ahead of time and reviewed |
| City and provincial spending | Triples the data work | Future concept |
| Live data updates | Large, messy files, and demo risk | An offline pipeline and static JSON |

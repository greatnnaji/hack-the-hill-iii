# Where Does My Tax Go

Your federal tax receipt, with a way to act on it.

Live: https://wheredoesmytaxgo.vip

Built at Hack the Hill III by a team of 4.

## What it does

1. Enter your income and province. You see your federal tax broken down by where it went.
2. Browse real federal spending stories, each showing your personal share of the cost.
3. Start or join a campaign on a story.
4. At 1,000 supporters, the team finds an MP to sponsor it, opens the official e-petition on ourcommons.ca, and sends every supporter a link to sign.

### Your share

```
your share = your federal tax × (program cost ÷ total federal spending that year)
```

Example: on a $75,000 income in Ontario you pay about $8,920 in federal tax. Military aircraft cost $3.3B and total federal spending was about $520B, so your share is $8,920 × (3.3 ÷ 520), about $57.

## Screenshots

![Start page: enter your income and province](docs/screenshots/banner.png)

![Receipt page: $8,920 of federal tax on a $75,000 income in Ontario, split across the biggest federal programs](docs/screenshots/tax_receipt.png)

## How it works

### Architecture

The tax math runs in the browser (`src/shared/tax.ts`), so your income never leaves your device. Postgres on Neon, accessed through Drizzle, holds users, campaigns, campaign supporters, official petitions, and the GC InfoBase tables behind the tax breakdown. Stories are not in the database. They live in JSON files written by the pipeline (`pipeline/stories.json` and `pipeline/news_stories.json`) and are read by `src/lib/stories.ts`. Story ids never change, because campaigns point at them.

### Stories pipeline

Data stories are built by hand when new spending data comes out. News stories refresh every 6 hours through GitHub Actions (`.github/workflows/news-pipeline.yml`), which commits the new stories back to the repo. Gemini answers are cached, so each article is only read once.

```mermaid
flowchart LR
    subgraph data["Data stories (run by hand)"]
        csv["GC InfoBase CSVs<br/>programs_spending, programs, organizations"]
        jumps["find_jumps.py<br/>biggest year-over-year changes"]
        cand["candidates.csv"]
        review["Manual review"]
        picked["picked.csv"]
        build["build_stories.py<br/>Claude drafts text if missing"]
        stories["stories.json"]
        csv --> jumps --> cand --> review --> picked --> build --> stories
    end

    subgraph news["News stories (GitHub Actions, every 6 hours)"]
        rss["Google News RSS"]
        fetch["fetch_news.py"]
        raw["news_raw.json"]
        buildnews["build_news.py<br/>Gemini extracts amount, department, summary<br/>drops non-federal, merges duplicates"]
        newsout["news_stories.json"]
        rss --> fetch --> raw --> buildnews --> newsout
    end

    csv -. department and program list .-> buildnews
    imgs["make_images.py<br/>Gemini department illustrations"] --> build
    imgs --> buildnews
    stories --> app["src/lib/stories.ts<br/>/api/spending"]
    newsout --> app
```

## Tech stack

**Web app**
- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- Postgres with Drizzle ORM (`postgres` driver), Drizzle Kit for migrations
- Auth0 (`@auth0/nextjs-auth0`)
- Zod for input validation
- Vitest for tests, PGlite for an in-memory test database

**Stories pipeline (Python)**
- pandas for the GC InfoBase spending data
- Google Gemini (`google-genai`) for reading news articles and for department illustrations
- Anthropic Claude (`anthropic`) as an optional drafter for data story text
- Pydantic for structured LLM output
- Pillow for images

## Local setup

You need Node.js 22.12 or newer (Vitest 5 requires it), Python 3.11, and a Postgres database (Neon or local).

### Web app

```bash
npm install
cp .env.example .env
```

Fill in `.env`. At minimum set `DATABASE_URL`. Leave `AUTH0_DOMAIN` empty to use the local login bypass.

Download the GC InfoBase CSVs into `pipeline/data/` (gitignored, too big to commit):

```bash
mkdir -p pipeline/data
base=https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource
curl -sfL -o pipeline/data/programs_spending.csv $base/55934650-3380-44d5-82c1-bb68f8cc5abb/download/programs_spending.csv
curl -sfL -o pipeline/data/programs.csv $base/8d3cd22d-15b0-468a-bb75-c1e736107c45/download/programs.csv
curl -sfL -o pipeline/data/organizations.csv $base/d9f87f7f-62f9-4baf-a803-2d8743f38e76/download/organizations.csv
```

Set up the database and start the app:

```bash
npm run db:migrate   # create tables
npm run db:load      # load the GC InfoBase CSVs
npm run db:seed      # optional: demo campaigns
npm run dev
```

Open http://localhost:3000. Run `npm test` for the test suite and `npm run lint` for lint.

### Stories pipeline

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
```

News stories (needs `GEMINI_API_KEY`):

```bash
python3 pipeline/fetch_news.py
python3 pipeline/build_news.py
```

Data stories (`ANTHROPIC_API_KEY` is optional, only used when `picked.csv` has no title for a story):

```bash
python3 pipeline/find_jumps.py      # writes candidates.csv for review
# copy the approved rows into pipeline/picked.csv
python3 pipeline/build_stories.py
```

Department illustrations (needs a paid-tier `GEMINI_API_KEY`): `python3 pipeline/make_images.py`

## Team

| Person | Area |
|---|---|
| Great Nnaji | Stories pipeline (GC InfoBase spending jumps, Google News ingestion, LLM story generation, dedupe, 6-hourly GitHub Actions refresh) and campaigns (start and join) |
| Izuchukwu Amadi | UI: all 6 screens |
| Raphaël | Tax calculator, tax breakdown, spending API, official petitions |
| Muktar Akinbile | Auth0 login, MP lookup, draft flow, admin page, deploy |

All four of us presented the demo.

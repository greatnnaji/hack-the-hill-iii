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

Example: you pay $9,510 in federal tax, military aircraft cost $3.3B, and total federal spending was about $520B. Your share is $9,510 × (3.3 ÷ 520), about $60.

## Screenshots

| Tax breakdown | Spending stories | Story detail | Campaign |
|---|---|---|---|
| ![Tax breakdown](docs/screenshots/breakdown.png) | ![Spending stories](docs/screenshots/feed.png) | ![Story detail](docs/screenshots/story.png) | ![Campaign](docs/screenshots/campaign.png) |

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

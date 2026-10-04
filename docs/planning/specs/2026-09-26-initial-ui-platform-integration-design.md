# Initial UI and platform integration design

**Owner:** Muktar  
**Date:** 2026-09-26  
**Covers:** Integrating `greatnnaji/main` PR #4 (Initial UI) into the platform features already on `cloverzer0/main`.

## 1. Goal

Bring the initial tax journey UI from PR #4 into the fork while preserving the existing Auth0 login, database, draft APIs, MP lookup, and petition screens. The integrated app should support both user journeys in one Next.js application.

## 2. Constraints

- Do not take PR #4's deletions of the platform implementation.
- Keep the current Auth0 gate and keep `/api/*` handlers and their response contracts intact.
- Keep petition pages under `/petition/*` and tax-journey pages at `/`, `/receipt`, `/category/[id]`, and `/decision/[id]`.
- Retain PR #4's illustrative receipt data and session-only income/province/postal-code preferences. The UI must continue to identify those estimates as illustrative and must not send income to the server.
- Do not connect the illustrative tracker to the spending API or alter the petition draft data model as part of this integration.

## 3. Route and component structure

Use explicit App Router pages for the tax journey rather than PR #4's optional catch-all route. The root page owns the landing/input screen; separate receipt, category, and decision pages own their corresponding URLs. Shared client components hold the common header, navigation, and input state. This keeps URLs directly addressable and avoids a catch-all route taking ownership of the existing petition paths.

Keep the existing static petition routes and route handlers in place. Next's existing `src/proxy.ts` continues to protect pages and API requests; this integration does not add a public route or weaken authentication.

## 4. UI and state

Bring over the PR #4 cinematic journey, receipt/category/decision views, shared fixture data, user-input types, and session-storage helpers. Adapt navigation to the explicit App Router pages while preserving browser back/forward behavior. Keep the current landing page's default Next.js starter content only as replaced root content; do not remove petition or API code.

Merge the new visual styles into `src/app/globals.css`, retaining the existing platform color tokens and base styles. Namespace or reconcile overlapping selectors so the new tax journey styles do not change petition screen layout.

## 5. Data and security boundaries

- Tax estimates and spending records remain the mock values supplied by PR #4.
- User income, province, and optional postal code stay in browser session storage, as in PR #4; no API call stores them.
- Auth0 sessions, database writes, draft ownership, and postal-code handling for MP lookup remain unchanged.
- Existing links from the petition flow continue to use its current routes and API contracts.

## 6. Acceptance criteria

1. `/` shows the Initial UI landing journey; input state persists locally.
2. `/receipt`, `/category/[id]`, and `/decision/[id]` load directly, and navigation/back/forward works between them.
3. Existing `/petition/*`, `/api/*`, `/auth/*`, and development petition routes remain available with their current behavior.
4. The global stylesheet supports both screen families without layout regressions.
5. Existing project checks pass, and the integrated routes are reviewed at desktop and phone widths.

## 7. Out of scope

- Replacing illustrative tax or spending values with live data.
- Changing the petition UI to match the Initial UI visual system.
- Changing Auth0 configuration, Neon setup, or Vercel deployment.
- Deleting any of the existing platform features to make the tree match upstream PR #4.

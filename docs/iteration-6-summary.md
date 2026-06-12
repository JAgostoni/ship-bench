# Iteration 6 summary — E2E tests, QA pass, verification

**Status:** complete — all six tasks delivered; the project's brief deliverables (1–8) now exist in the repo.

## What was built

| Task | Outcome |
| --- | --- |
| 6.1 Fixtures + deterministic setup | `e2e/global-setup.ts` migrates `data/kb-e2e.sqlite` (reusing the app's own migration runner) and resets it to the canonical 12 articles. `e2e/fixtures.ts` exposes `resetToSeed()` / `wipeArticles()` — row-level resets over WAL from the test process, safe while the web server holds the file. The seed articles moved to `src/lib/seed-data.ts` so the seed script and fixtures share one source (script behavior unchanged). `playwright.config.ts` gained `globalSetup`, `workers: 1` (shared server + SQLite ⇒ serial), and a non-auto-opening HTML reporter; otherwise it matches architecture §8.2 as shipped in iteration 1. |
| 6.2 Critical journey | `e2e/journey.spec.ts` — the exact architecture §8.2 sequence, ending with a search for the **edited** title to prove the FTS update trigger. Passed 3× consecutively (definition-of-done flake check). |
| 6.3 Secondary specs | `e2e/create-empty.spec.ts`, `e2e/delete.spec.ts`, `e2e/not-found.spec.ts`, `e2e/validation.spec.ts`, plus `e2e/api.spec.ts` covering the REST contract (create → get → put → delete → 404, and the 400 `VALIDATION` shape) via the `request` fixture. All selectors are role/name queries against the spec's verbatim copy. |
| 6.4 QA sweep | Scripted Playwright walk of the design §9 checklist at 1280/800/375px against the production build — 22 screenshots reviewed (browse, all search dropdown/page states incl. simulated error rows, editor states incl. counters/banner/discard dialog, delete dialog incl. simulated error). §8.4 exclusions confirmed absent by grep; reduced-motion guards confirmed in `globals.css`. **No fixes required.** |
| 6.5 Verification + docs | `docs/verification.md` (commands, results, journey walkthrough, QA table, known gaps); README E2E note clarified (suite reseeds its own DB); backlog §5 gained implementation-time addenda rows 10–12. |
| 6.6 Full quality gate | `npm run check` green (59 unit tests / 7 files), `npm run test:e2e` green (8 tests), `npm run build && npm start` boots and serves the seeded app (home 200 with the 12-article badge; search API 200 with highlighted snippets). |

## Assumptions made

- **"Reuse the iteration-1 seed module"** was satisfied by extracting the article data to `src/lib/seed-data.ts` rather than importing `seed.ts` (which executes on import). The script's CLI behavior and output are unchanged.
- **Create-from-empty-state isolation** uses the iteration note's "delete-all" option (wipe rows, restore after) rather than a second `DATABASE_PATH`/server — one server keeps the suite simple and the specs stay order-independent because each resets its own state.
- The QA sweep was executed as a scripted Playwright pass with individually reviewed screenshots; the iteration calls for a manual walk, and this covers the same states deterministically (logged in `docs/verification.md` §5).

## Issues encountered

- **Windows file locking ruled out the "delete the DB file" reset strategy** while the Playwright `webServer` holds it open; switched to row-level resets over WAL (backlog decision #11). This also makes setup order-independent with respect to when Playwright starts the web server.
- **Playwright strict mode** flagged the dropdown's "No matches" copy because the visually-hidden `aria-live` count node repeats it — QA script disambiguated with `.first()`; the E2E specs were unaffected.
- **Turbopack NFT-trace warning** during `next build` (runtime-resolved `DATABASE_PATH` in `src/lib/db/client.ts`) — benign, pre-existing, build succeeds; logged in verification §5.

## Confirmation

The app runs locally and all flows work: `npm run check`, `npm run test:e2e` (8/8, journey 3×), and a production `npm run build && npm start` probe all passed in this session — details and observed walkthrough notes in [`docs/verification.md`](verification.md).

## Decisions log

| # | Decision | Why |
| --- | --- | --- |
| 1 | Content-level E2E DB reset from the test process instead of file deletion | Windows can't delete a file the server holds open; WAL already makes cross-process row access safe; works regardless of webServer/globalSetup start order. |
| 2 | `workers: 1`, specs reset their own state | One shared server + SQLite file; 8 tests in ~30 s make parallel infrastructure pure complexity. Specs remain order-independent. |
| 3 | Seed data extracted to `src/lib/seed-data.ts` | `seed.ts` runs on import (it's a script); fixtures need the data without the side effects. Single source for script + tests. |
| 4 | HTML reporter set to `open: "never"` + `list` reporter added | Keeps `npm run test:e2e` non-interactive (the default HTML reporter auto-opens a browser on failure); the report still lands in `playwright-report/`. |
| 5 | Delete spec asserts the deleted title is absent from search **results**, not that results are empty | Other seed articles legitimately mention "VPN" in their bodies; asserting emptiness would be wrong and flaky against realistic data. |
| 6 | API contract test compares the GET body to the POST body with `toEqual` | The create→get round-trip equality is the strongest cheap assertion the JSON contract allows, and it pins field names and timestamp types. |

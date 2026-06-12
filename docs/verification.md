# Verification notes — Team KB v1 (iteration 6)

**Date:** 2026-06-12
**Environment:** Windows 11 Pro, Node v24.10.0, npm 11.x, Chromium via Playwright 1.60.0

This is the verification deliverable required by the brief (architecture §8.3): the commands run, their results, walkthrough notes for the critical journey, the QA sweep against the design spec's state checklist, and known gaps.

---

## 1. Commands run and results

| Command | Result |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check` | ✅ Pass — `tsc --noEmit` clean, ESLint clean, Prettier clean, **59 unit tests in 7 files** pass (Vitest 4.1.8, ~20 s) |
| `npm run test:e2e` | ✅ Pass — **8 E2E tests** (1 worker, Chromium, ~33 s incl. build + server start) |
| `npx playwright test journey --repeat-each=3` | ✅ Pass 3/3 — flake check required by the iteration's definition of done |
| `npm run build` | ✅ Pass — production build; all content routes dynamic (`ƒ`), `/_not-found` and `/articles/new` static, as expected |
| `npm start` (production run) | ✅ Boots and serves the seeded app — `/` returns 200 with the "12 articles" badge and seeded titles; `GET /api/search?q=deploy` returns 200 with `<mark>`-highlighted snippets |
| `npm run db:seed` (existing DB) | ✅ Idempotent — "Seed skipped: database already contains 12 article(s)." |

Playwright artifacts: the HTML report lives in `playwright-report/` (open with `npx playwright show-report`); traces/screenshots for failures land in `test-results/`. Both are gitignored.

## 2. E2E coverage

Every run is deterministic: `e2e/global-setup.ts` applies migrations to `data/kb-e2e.sqlite` and resets it to the 12 seed articles; specs that mutate data reset state for themselves via `e2e/fixtures.ts` (row-level reset over WAL — see backlog decisions #11–12). Selectors are role/name queries against the design spec's verbatim copy, so they double as cheap accessible-name checks.

| Spec | Covers |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `e2e/journey.spec.ts` | **Brief-required critical journey:** home shows seeded count + known title → header search → dropdown match → open result → detail renders → Edit → change title + body → Save → detail shows updates → search finds the **new** title (proves the FTS update trigger fires) |
| `e2e/create-empty.spec.ts` | Zero-articles empty state → "Create your first article" → fill → save → detail → home lists it ("1 article") |
| `e2e/delete.spec.ts` | Delete → confirm dialog → Cancel keeps it → Delete → confirm → redirect home, gone from list and from search results (FTS delete trigger) |
| `e2e/not-found.spec.ts` | `/articles/99999` and an unknown route both show "Article not found"; recovery link returns home |
| `e2e/validation.spec.ts` | Empty submit → "Title is required" + "Content is required" visible, focus + `aria-invalid` on the title field; fix → save succeeds |
| `e2e/api.spec.ts` | REST contract once via the `request` fixture: create (201) → get (200, identical body) → put (200, `updatedAt` bumped) → delete (204) → get (404 `NOT_FOUND`); plus 400 `VALIDATION` with `fieldErrors` |

## 3. Critical journey walkthrough (observed)

1. **Home:** 12 seeded cards in a 2-column grid, "12 articles" badge, relative times (<7 days) and absolute dates (older) per design §1.3.
2. **Search "deploy checklist":** dropdown opens with "Deploy checklist" first (title-weighted bm25), `<mark>` highlights in snippets, "See all N results →" footer.
3. **Open result:** detail renders the full Markdown body (headings, lists, code blocks, GFM table styles), "← All articles", Edit/Delete actions, absolute Updated/Created meta line.
4. **Edit → save:** title and body changed; Save returns to the detail page showing the new content.
5. **Search the new title:** dropdown finds it immediately — the FTS index followed the update.

## 4. QA sweep against design §9 (state coverage checklist)

Walked via a scripted Playwright pass at 1280px (desktop), 800px (tablet), and 375px (mobile smoke) against the production server; 22 full-page screenshots reviewed.

| §9 row | States verified | Result |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| Browse | Populated grid 2-col (1280) and 1-col (800/375); card hover state (border-strong + accent title); zero-articles empty state with CTA; 404 page | ✅ |
| Search | Idle with `/` kbd hint; results dropdown + "See all" footer; keyboard `↓` active-option highlight (accent left border); "No matches for …" row; "Search isn't responding —" error row (danger text, route aborted to simulate); full page with count badge + `<mark>` highlights; full-page empty state; blank-`q` instruction state | ✅ |
| Edit/Create | Pristine split pane (desktop) and Write/Preview tabs (tablet); live preview parity through `ArticleBody`; title counter at ≥180 chars ("185/200"); field errors + focus (E2E spec); network-error banner with exact §2.3 copy, inputs intact; discard-changes dialog (opens on dirty Cancel, "Keep editing" returns) | ✅ |
| Delete | Dialog open (title quotes the article, Cancel left / Delete right); error state ("Couldn't delete. Try again." with re-enabled buttons, DELETE aborted to simulate); post-delete redirect (E2E spec) | ✅ |

Additional checks:

- **§8.4 exclusions hold:** grep over `src/` finds no toasts, skeletons, pagination, dark mode, sort/filter controls, or scroll-sync.
- **Reduced motion (§7.6):** both animations (`.pop-in`, `.spinner`) are wrapped in `@media (prefers-reduced-motion: no-preference)`.
- **Mobile smoke (must-not-break bar):** header collapses to glyph + icon-only 44×44 "+" button, 1-column list, detail and editor render intact at 375px.
- **Keyboard:** dropdown combobox arrow-key navigation verified in the sweep; tab order, skip link, and focus-ring checks were verified in iteration 3's pass and are exercised by the role/name selectors throughout the suite.

**Findings requiring fixes: none.** The sweep surfaced no deviations from the design spec.

## 5. Known gaps and deviations

| Item | Rationale |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Turbopack build warning: "Encountered unexpected file in NFT list" (trace through `src/lib/db/client.ts`) | Benign and pre-existing: the DB client resolves `DATABASE_PATH` at runtime, which Turbopack's file tracer flags. The build succeeds and the served app behaves correctly. |
| Transient loading states (search spinner with retained results, "Saving…"/"Deleting…" button labels) not screenshot-captured | Sub-second states; behavior is enforced by component code reviewed against §4.1/§4.3 and exercised indirectly by the E2E flows. |
| `beforeunload` dirty guard verified by code inspection, not E2E | Browser-native dialogs are not reliably scriptable; the in-app discard dialog (same guard intent) is QA-verified. |
| The `/` kbd hint is visible at 375px in screenshots | By design: the spec hides it on `pointer: coarse` devices, not narrow viewports; the QA browser is pointer-fine. |
| QA sweep was scripted (Playwright-driven) rather than hand-walked | Same states, deterministic, and reviewable — screenshots were individually inspected against the §1.3 wireframes and §4–5 state tables. |

## 6. Deliverables status (brief checklist)

All brief deliverables now exist in the repo: working app (features 1–3), seed data (12 articles), local run docs (`README.md`, verified this session end-to-end including the `npx playwright install chromium` prereq), unit tests (iterations 2 & 5), E2E tests (this iteration), verification notes (this file), and the decisions log (`docs/backlog.md` §5 + per-iteration summaries).

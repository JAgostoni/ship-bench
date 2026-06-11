# Iteration 6 — E2E tests, QA pass, verification

**Goal:** prove the finished app: Playwright E2E coverage of the brief's critical journey plus secondary flows, a systematic QA sweep against the design spec's state checklist, and the verification/run documentation the brief requires as deliverables.

**Scope:** the brief's MVP testing scope — "basic E2E/integration testing (e.g., Playwright) for critical user journeys (browse → search → edit)" — plus the required verification-notes deliverable. **Not** in scope (per brief): full accessibility audits, exhaustive E2E edge-case coverage, cross-browser matrix, visual regression.

**References:** architecture §8.2–8.3 (E2E strategy, verification deliverable), design §9 (state coverage checklist); brief Testing Scope and Required deliverables.

---

## Tasks

### 6.1 E2E fixtures and deterministic setup

- `e2e/fixtures.ts` + Playwright global setup: before the run, delete `data/kb-e2e.sqlite` and reseed it (reuse the iteration-1 seed module with `DATABASE_PATH=data/kb-e2e.sqlite`), so every run starts from the same 12 articles.
- Confirm `playwright.config.ts` (from iteration 1) still matches architecture §8.2: `webServer` builds and starts the app on port 3000 with the e2e DB; Chromium only; HTML reporter. Document `npx playwright install chromium` as a one-time prereq in the README.

### 6.2 Critical journey spec (brief-required)

`e2e/journey.spec.ts` — the exact sequence from architecture §8.2:

1. Home shows the seeded articles (count + a known title visible).
2. Type a query in the header search box → dropdown shows the expected match.
3. Open the result → article detail renders.
4. Click Edit → change title and body → Save.
5. Detail shows the updated content.
6. Search for the **new** title → it is found (proves FTS triggers fire on update).

### 6.3 Secondary specs

Per architecture §8.2, one spec (or describe block) each:

- **Create from empty state:** run against a fresh empty DB context (point a test at a temp `DATABASE_PATH` or delete-all via API in the test) → "No articles yet" empty state → "Create your first article" → fill → save → detail; home now lists it.
- **Delete with confirm:** open a seeded article → Delete → dialog appears → Cancel keeps it → Delete → confirm → redirected home, article gone from list and search.
- **404 page:** `/articles/99999` and an unknown route both show "Article not found" with the recovery link working.
- **Validation error display:** submit the new-article form empty → "Title is required" and "Content is required" visible, focus on the title field; fix and save succeeds.

Keep these basic — the brief excludes exhaustive edge-case coverage. Also exercise the API contract once via Playwright's `request` fixture (create → get → put → delete → 404), which is the cheap integration check the REST-over-Server-Actions decision bought us (architecture decision #6).

### 6.4 QA sweep against the design state checklist

Walk the full design §9 table (Browse / Search / Edit-Create / Delete rows) manually at desktop and tablet widths, plus a mobile smoke check (must-not-break bar, design §3). Verify the §8.4 "already decided" list holds (no toasts, skeletons, pagination, etc. crept in). Fix any gaps found; fold fixes into this iteration. Keyboard-only and reduced-motion passes included (design §7 items are in MVP scope; a full audit is not).

### 6.5 Verification notes and final docs

- `docs/verification.md` (architecture §8.3): commands run (`npm run check`, `npm test`, `npm run test:e2e`) with pass/fail output summaries; screenshots or walkthrough notes of the critical journey; note where Playwright traces/reports live (`playwright-report/`); any known gaps or deviations from the specs, each with a one-line rationale.
- README final pass: confirm clean-clone instructions are accurate end-to-end by following them literally (fresh `data/` directory), including the Playwright install step.
- Append any implementation-time tradeoffs discovered during iterations 2–6 to the backlog decisions log (`docs/backlog.md` §5) so the brief's "short decisions log" deliverable is complete and current.

### 6.6 Full quality gate

- `npm run check` (typecheck, lint, prettier, unit) and `npm run test:e2e` both green from a clean clone.
- `npm run build && npm start` production-style run boots and serves the seeded app.

---

## Iteration-specific notes

- **Sequencing within the iteration:** 6.1 → 6.2 → 6.3 → 6.4 (QA may surface fixes; re-run specs after) → 6.5 → 6.6 last, from a clean state.
- Depends on all previous iterations; this run adds **no features** — only specs, fixes for QA findings, and documentation. If QA surfaces a feature-sized gap, log it in the decisions log and scope it consciously rather than absorbing it silently.
- E2E selectors: prefer role/name queries (`getByRole('button', { name: 'Save article' })`) over test ids — the design spec's verbatim copy (§8.3) makes accessible-name selectors stable, and they double as cheap a11y assertions.
- The create-from-empty-state spec must not pollute the shared e2e DB used by other specs — isolate via a separate `DATABASE_PATH` project/worker or order it to restore state.

## Definition of done

- Critical journey spec passes reliably (run it 3× to shake out flake; deterministic reseed makes this realistic).
- All secondary specs and the API-contract check pass.
- Design §9 checklist fully walked with findings fixed or logged.
- `docs/verification.md` complete; README verified against a clean clone; decisions log updated.
- `npm run check` + `npm run test:e2e` + production build all green: **the project is done** — all brief deliverables (1–8) exist in the repo.

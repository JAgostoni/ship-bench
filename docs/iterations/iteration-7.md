# Iteration 7 — E2E suite + CI hardening

**Goal.** The five critical journeys pass on both Playwright projects, and CI runs the identical gate a developer runs locally. This iteration changes no application behaviour — it proves the behaviour built in iterations 1–6.

**Scope.** The E2E fixture, helpers, global setup, the five specs, the Playwright config, the CI workflow, and the PR template.

**Out of scope.** Every application source file. If a spec fails because of a product bug, fix the bug and note it — but do not add features.

**Reference.** `architecture.md` §5.3, §9.7, §11.4, §11.6, §12.7, §13.5.

**Testing scope note.** The brief's MVP is "basic E2E/integration testing (e.g., Playwright) for critical user journeys (browse → search → edit)". It explicitly excludes "exhaustive E2E edge-case coverage". **Write exactly the five specs below.** Do not add specs for category CRUD, theme switching, pagination boundaries, revision diffing, every validation permutation, or any browser beyond Chromium + WebKit — those are named as out of scope in `architecture.md` §11.4.

---

## Tasks

### 7.1 Finalize the deterministic E2E fixture and reset flow

Verify **`e2e/fixtures/seed.json`** (created in iteration 6.8) contains 4 categories and 9 articles (7 published, 2 draft) with fixed titles, slugs, and statuses, and that it matches the seed content from iteration 1.7.

Confirm the three cooperating pieces from `architecture.md` §9.7 are in place:

1. `e2e/fixtures/seed.json` — the fixed dataset
2. `POST /api/test/reset` — truncates, rebuilds the FTS index, re-seeds; guarded by `E2E_TEST_MODE=1`
3. The Playwright `webServer` env (`DATABASE_FILE=./data/kb.e2e.db`, `E2E_TEST_MODE=1`, `LOG_LEVEL=warn`) so E2E never touches `kb.db`

Add the fixture assertions the specs depend on and document them in a comment at the top of `seed.json`:

- Exactly **3** published articles match `deploy` (this is what `search.spec.ts` asserts)
- `Deploying the API` is the **top-ranked** result for `deploy` (title weighting 8×)
- At least one article has a fenced code block, a GFM table, and a task list (for the browse rendering assertion)
- At least one article has `category_id: null` (for the empty-states and category assertions)
- At least one article has 2+ revisions (for the history assertion in `edit.spec.ts`)

**Done when:** `POST /api/test/reset` with `E2E_TEST_MODE=1` returns `{ reset: true, articles: 9, categories: 4 }` and a follow-up `GET /api/search?q=deploy` returns exactly 3 results.

---

### 7.2 Write the Playwright config, global setup, and helpers

Create **`playwright.config.ts`** **verbatim from `architecture.md` §11.4**:

- `testDir: './e2e'`, `globalSetup: './e2e/global-setup.ts'`
- `fullyParallel: true`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 2 : 0`, `workers: process.env.CI ? 1 : 2`
- Reporters: `[['github'], ['html', { open: 'never' }]]` in CI, `[['list']]` locally
- `use`: `baseURL` from `PORT = 3100`, `trace: 'on-first-retry'`, `video: 'retain-on-failure'`, `screenshot: 'only-on-failure'`
- Two projects: `desktop-chromium` (`Desktop Chrome`, viewport 1280×800) and `tablet-webkit` (`iPad (gen 7) landscape`)
- `webServer`: `npm run dev -- --port 3100`, `url: http://127.0.0.1:3100/api/health`, `reuseExistingServer: !process.env.CI`, `timeout: 120_000`, env `{ DATABASE_FILE: './data/kb.e2e.db', E2E_TEST_MODE: '1', LOG_LEVEL: 'warn' }`

Create **`e2e/global-setup.ts`** — wait for `/api/health` to return 200, then call `POST /api/test/reset` once.

Create **`e2e/helpers/reset-db.ts`** — a thin wrapper that calls `POST /api/test/reset` and returns the parsed body, for use in `test.beforeEach` in any mutating spec.

Create **`e2e/helpers/a11y.ts`** — the `expectNoA11yViolations(page)` helper **verbatim from `architecture.md` §11.4**: `@axe-core/playwright` with `.withTags(['wcag2a', 'wcag2aa'])` and `.disableRules(['color-contrast'])` (contrast is covered by the manual check in `design-spec.md` §9.1), asserting `violations` is empty.

> This is a **smoke** check, not the "full accessibility audit" the brief places out of MVP scope. It catches missing labels, landmarks, and ARIA misuse on the three primary routes.

**Done when:** `npx playwright test --list` enumerates the specs without config errors and `global-setup` completes against a running dev server.

---

### 7.3 Write the browse spec

Create **`e2e/browse.spec.ts`** covering the journey in `architecture.md` §11.4:

- `page.goto('/')` renders the seeded published titles; **drafts are absent from the default view**
- Clicking an article navigates to `/articles/[slug]` and shows **rendered Markdown** — assert a real `<h2>` and a real `<table>` exist, and that the literal strings `##` and `|` (as table syntax) do not appear in the body text
- The detail page shows the breadcrumb, the `<h1>` title, and the meta line with `min read`
- Going back returns to `/` with the previous filters and scroll position preserved
- `expectNoA11yViolations(page)` on both `/` and `/articles/[slug]`

**Done when:** the spec passes on both projects.

---

### 7.4 Write the search spec

Create **`e2e/search.spec.ts`**:

- Type `deploy` into the header search input
- Assert the URL becomes `/search?q=deploy`
- Assert **exactly 3 results** render
- Assert `<mark>` elements highlight the term in titles and/or snippets
- Assert the result count is announced in a `role="status"` region with the text `3 results for “deploy”`
- Open the top result and assert the article detail page loads
- Assert a nonsense query (e.g. `zzzzqqq`) renders the 0-results empty state with the exact copy `No results for “zzzzqqq”` and the `Clear search` action
- `expectNoA11yViolations(page)` on `/search`

**Done when:** the spec passes on both projects and the result count of 3 is stable across repeated runs.

---

### 7.5 Write the edit spec

Create **`e2e/edit.spec.ts`** — the most important spec, because it proves persistence:

- Call `resetDb()` in `test.beforeEach`
- Open a seeded article → click `Edit`
- Change the title and the body
- Click `Save changes`
- Assert the redirect to the article detail page
- Assert the new title renders
- Assert the body change is visible
- **Reload the page and assert the change is still there** — this proves it reached SQLite, not just React state
- Expand the History section and assert a new revision is listed
- `expectNoA11yViolations(page)` on the edit route

Add one create-path case: from `/articles/new`, fill a title and body, save, and assert the redirect to a new detail page plus the `Article created.` toast.

**Done when:** the spec passes on both projects, including the post-reload assertion.

---

### 7.6 Write the empty-states and responsive specs

Create **`e2e/empty-states.spec.ts`**:

- Reset to zero articles and assert `No articles yet` with the `New article` action
- Search for a nonsense term and assert `No results for “{q}”` with the `Clear search` action
- Open an empty category and assert `Nothing in {category} yet` with the `New article in {category}` action
- Assert the filter-yields-nothing state renders `No articles match these filters.` — **distinct from `No articles yet`**
- Assert the five states are distinguishable by title (no two render the same copy)

Create **`e2e/responsive.spec.ts`**:

- At **834×1112** and **1280×800**, assert the sidebar collapses to a drawer below 1024px and is present above it
- Assert the drawer opens, traps focus, and closes on `Escape`
- Assert no horizontal overflow at both viewports: `document.scrollingElement.scrollWidth <= window.innerWidth + 1`
- Assert the tablet viewport keeps `+ New article` as a labelled button, not an icon-only control

> **Do not add a phone-width spec.** `design-spec.md` U2 and `architecture.md` §16.2 state that phone is supported but not optimized and is not a target. The 360px no-overflow check belongs to iteration 8's manual sweep.

**Done when:** both specs pass on both projects.

---

### 7.7 Harden CI and the PR template

Update **`.github/workflows/ci.yml`** so it matches `architecture.md` §12.7 exactly and runs the identical gate as `npm run verify`:

```
checkout → setup-node 24.21.0 (cache: npm) → npm ci
→ typecheck → lint → format:check
→ test:run -- --coverage
→ build (DATABASE_FILE=./data/kb.ci.db)
→ db:migrate (DATABASE_FILE=./data/kb.ci.db)
→ playwright install --with-deps chromium webkit
→ test:e2e
→ upload-artifact playwright-report (if: !cancelled(), retention 7 days)
```

Add `npm audit --audit-level=high` as a step (`architecture.md` §13.2 lists dependency vulnerabilities as a threat with this mitigation).

Finalize **`.github/pull_request_template.md`** with the five questions from `architecture.md` §5.3 item 5: does it change the schema? does it need a migration? are empty states handled? are new user-visible strings reachable by keyboard? are unit tests added for new pure logic?

**Done when:** the workflow passes on a pushed branch and the artifact is uploaded when a spec fails.

---

### 7.8 Verify the full suite locally

Run the complete gate from a clean state:

```
npm run db:reset
npm run verify
npm run test:e2e
```

Then run `npx playwright show-report` and confirm both projects are green.

**Done when:** all three commands exit 0 and no spec is skipped or flaky across two consecutive runs.

---

## Iteration notes

**Sequencing.** 7.1 must precede 7.3–7.6 (the specs assert on the fixture). 7.2 must precede 7.3–7.6 (config, helpers, setup). 7.3–7.6 are independent of each other and can be written in any order. 7.7 is independent. 7.8 is last.

**Per-spec isolation.** Any spec that mutates state calls `resetDb()` in `test.beforeEach`. With `fullyParallel: true` and `workers: 2` locally, a spec that mutates without resetting will flake. `workers: 1` in CI serializes writes and removes the SQLite contention at negligible cost (`architecture.md` §9.7).

**E2E never touches `kb.db`.** The `webServer` env points at `./data/kb.e2e.db`. If a spec run changes your local development data, the env wiring is wrong.

**Resist scope creep.** The brief's "not MVP" list explicitly excludes exhaustive edge-case coverage. A larger spec suite is not a better deliverable here; it is a deviation from the stated testing scope.

**Not in this iteration.** No new components, no new routes, no new repository functions. If a spec reveals a bug, fix the bug minimally and record it in the decisions log.

---

## Definition of done

- [ ] `playwright.config.ts` matches `architecture.md` §11.4, including both projects and the `webServer` env.
- [ ] `global-setup.ts` waits for `/api/health` and resets the database once.
- [ ] `browse.spec.ts` passes on both projects and asserts rendered Markdown (a real `<h2>` and `<table>`).
- [ ] `search.spec.ts` passes on both projects and asserts exactly 3 results for `deploy`.
- [ ] `edit.spec.ts` passes on both projects and asserts persistence **after a full page reload**.
- [ ] `empty-states.spec.ts` passes and asserts all five empty states are distinct.
- [ ] `responsive.spec.ts` passes at 834×1112 and 1280×800 with no horizontal overflow.
- [ ] `expectNoA11yViolations` runs clean on `/`, `/search`, and `/articles/[slug]`.
- [ ] CI runs typecheck → lint → format:check → tests with coverage → build → migrate → E2E, and uploads the report.
- [ ] `npm run verify` and `npm run test:e2e` both exit 0 from a clean state, twice in a row.
- [ ] E2E does not modify `./data/kb.db`.

# QA Report — Team Knowledge Base (v1 MVP)

**Role:** Senior QA Engineer / Code Reviewer
**Date:** 2026-09-17
**Reviewer environment:** Windows 11, Node.js 24.21.0, npm 11.19.0, Chromium + WebKit via Playwright 1.63.0
**Reviewed revision:** `53ebbf0` (`I7-8`), branch `evals_sep2026_deepseek-flash-4.1`, working tree clean

**Sources of truth**
[`product-brief.md`](./product-brief.md) · [`architecture.md`](./architecture.md) ·
[`design-spec.md`](./design-spec.md) · [`backlog.md`](./backlog.md) ·
[`decisions-log.md`](./decisions-log.md) · [`verification-notes.md`](./verification-notes.md) ·
[`iterations/`](./iterations) · all eight `docs/iteration-N-summary.md`

---

## 0. Executive summary

The delivered app is a **genuinely working, well-engineered MVP**. I independently
re-ran every quality gate, drove the running application over HTTP and through a real
browser, and exercised the error paths by hand. The three required features — browse +
detail, search, and editing — all work end to end, including the states the brief
demands (empty, validation, error, success). Test, lint, typecheck, format, build, and
E2E results all reproduced on my machine exactly as claimed.

I found **no critical defects**. I found **one major functional defect** (a decided
feature that silently does nothing), **one moderate accessibility defect** (touch targets
that measure smaller than specified), and **three minor issues**. I also found that the
project's own verification scripts contain a stale fixture slug that makes part of its
published responsive evidence fail if re-run unmodified.

**Recommendation: Ship with conditions.** Details in §9.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` (via `verify`) | PASS |
| Lint | `npx eslint .` | PASS — 0 errors, 1 pre-existing warning |
| Format | `npm run format:check` | PASS |
| Unit/integration/component | `npm run test:run` | **492 passed (48 files)** |
| Coverage | `npm run test:coverage` | **95.46% lines** — thresholds met |
| Build | `npm run build` | PASS — 13 routes |
| E2E | `npm run test:e2e` | **28 passed (14 × 2 projects)** |
| DB integrity | `npm run db:check` | `integrity_check: ok`, `foreign_key_check: clean` |
| Dependency audit | `npm audit --audit-level=high` | exit 0 — 0 high/critical, 4 moderate (dev-only) |

---

## 1. MVP flow results

Legend: **Verified** = I ran it myself against a live server. **Covered** = asserted by
the shipped test suite, which I re-ran green, but which I did not independently re-drive.

| # | Flow | Required states | Result | Evidence |
|---|---|---|---|---|
| F1.1 | Browse `/` — list of published articles | success | **PASS** | `GET /` → 200, 89,691 B. `GET /api/articles` → `total=7`, `pageSize=20`. Count line renders "7 published". |
| F1.2 | Category sidebar | success, **zero-count**, **no categories** | **PASS** | 4 categories + `Uncategorized` (1 article) rendered with counts. On an empty DB the sidebar renders the "No categories yet" state with its CTA. |
| F1.3 | Article detail `/articles/[slug]` | success, **missing slug** | **PASS** | 200; real `<h2>` and `<table>` present, 7 `prose h2`, TOC visible at 1280px with 7 headings. Unknown slug renders the segment's own not-found surface + `robots: noindex`. |
| F2.1 | Search `/search?q=deploy` | success + highlighting | **PASS** | 200, exactly **3** results, 6 `<mark>` elements, live `role="status"` count. |
| F2.2 | Search API `GET /api/search?q=deploy` | success + ranking | **PASS** | `total=3`; `Deploying the API to Production` rank −1.268 (title match) outranks `Incident Response Runbook` −0.783 and `Setting Up Your Local Environment` −0.616 (body matches) — bm25 title weighting works. |
| F2.3 | Search, empty `q` | **validation** | **PASS** | `GET /api/search?q=` → **400** problem+json (documented behaviour; differs deliberately from the list contract). |
| F2.4 | Search, no matches | **empty** | **PASS** | `?q=zzzz` renders `0 results for “zzzz”` + "No results for “zzzz”" + "Clear search". |
| F3.1 | Create article | success, validation | **PASS** | `POST /api/articles` → **201** + `Location: /api/articles/11`. E2E `creating an article…` creates, redirects, shows toast, survives reload. Empty/short title → **422** with field-level errors. |
| F3.2 | Edit article | success, **persistence**, validation | **PASS** | E2E asserts edit → save → **full reload** → title + body still present → new revision in History. This is the brief's acceptance criterion. |
| F3.3 | Optimistic concurrency conflict | **error** | **PASS** | `PATCH` with stale `version` → **409** problem+json, `detail: "Someone saved a newer version of this article."`, `errors:[{path:"version"}]`. |
| F3.4 | Archive (soft delete) | success | **PASS** | `DELETE` → **204**; the article then reads back with `status:"archived"` and `version` bumped. Revisions retained. |
| F3.5 | **"Save & create another"** | success | **FAIL** | See **QA-1**. Clicking it creates the article but redirects to `/articles/{slug}` instead of resetting the form at `/articles/new`. |
| F3.6 | Restore / Undo (archive toast) | success | **Covered** | Not re-driven in a browser by me. Asserted by `src/app/actions/articles.test.ts` and `delete-article-button` tests, which pass. |
| F4.1 | Category filter + `/categories/[slug]` | success, empty | **PASS** | `/categories/engineering` → 200. Empty categories render the distinct "Nothing in {category} yet" state (E2E, 6 cases). |
| F4.2 | Create category | success, **duplicate** | **PASS** | `POST /api/categories` → **201**; duplicate name → **409**. |
| F5.1 | Draft/published status | success | **PASS** | Drafts excluded from the default browse (7 of 9 rows) and included with `status=all`; status badge renders as text, not colour-only. |
| NFR.1 | Empty states (the five canonical ones) | **empty** | **PASS** | Verified myself on a genuinely empty database for no-articles, no-results, no-categories; empty-category and filtered-empty are covered by `empty-states.spec.ts` (6 cases) incl. a distinctness assertion. |
| NFR.2 | Route error boundary | **error** | **Covered** | `(shell)/error.tsx` + `global-error.tsx` exist and render digest + retry. Not triggered destructively by me. |
| NFR.3 | Command palette (⌘K) | success | **Covered** | `command-palette.tsx` present and unit-tested; `GET /api/search` (its only backend) verified by me. Not driven via keyboard in a browser. |
| NFR.4 | Dark mode | — | **Covered** | Tokens present and verified by the shipped contrast script + committed screenshots. Not re-driven in a browser by me. |

**Summary:** 16 of 17 directly-driven flows PASS; **one FAIL** (F3.5). No required P0
flow failed.

---

## 2. Local setup result

**Result: PASS**, with one accuracy gap in the README's expected first-run numbers.

I followed the README's "First run" block on this machine.

| Step | Result |
|---|---|
| Node/npm version check | `.nvmrc` = `24.21.0`; machine had `v24.21.0` / `11.19.0`; `package.json` `engines` = `">=24.21.0 <25"` — consistent |
| `npm install` | Already installed (`node_modules/next` present). README documents the `--ignore-scripts` fallback for machines that cannot fetch Playwright browsers. |
| `copy .env.example .env.local` | `.env.local` present and matches `.env.example` (4 vars, all documented in `architecture.md` §12.3) |
| `npm run db:reset` | exit 0 — dropped tables, applied migrations, seeded |
| `npm run db:setup` | Works (same script path as `db:reset` minus `--fresh`) |
| `npm run dev` | Ready in 703 ms, `http://localhost:3000`, `.env.local` loaded |
| `npm run db:check` | `integrity_check: ok`, `foreign_key_check: clean` |
| `npm run build` | PASS, 13 routes |
| `npm run test:e2e` | PASS — **self-manages** a dev server on :3100 against `kb.e2e.db` |

**No undocumented manual intervention was required.** No Docker, no external service, no
global install, no C++ toolchain (better-sqlite3 N-API prebuilds held).

Two operational notes, neither blocking:

1. **The E2E suite refuses to start if a dev server is already running on port 3000.**
   My `npm run dev` on :3000 caused `npm run test:e2e` to abort with
   `"Another next dev server is already running."` The Playwright config starts its
   server with `next dev`, and Next refuses a second instance in the same directory even
   on a different port. The README does not mention this. (Reproduced once; stopping
   :3000 and re-running gave 28/28.) — **Minor, documented as QA-6.**
2. **The README's "Expected first-run result" says `deploy` returns 3 results** — verified
   correct. It also says "4 categories and 7 published articles" — correct for the article
   list, but the sidebar shows **5** category rows because `Uncategorized` is rendered as
   a synthetic row when ≥1 published article has no category (the seed has exactly one).
   The shipped `acceptance-check.cjs` already explains this, but the README does not. Minor
   documentation wart.

---

## 3. Test suite results and coverage

### 3.1 Unit / integration / component — Vitest 5

```
npm run test:run
 Test Files  48 passed (48)
      Tests  492 passed (492)
   Duration  21.39s
```

Reproduced exactly as claimed in `verification-notes.md` §1.1.

### 3.2 Coverage — v8 provider, thresholds enforced

```
npm run test:coverage   →  exit 0 (thresholds would fail the run if missed)

All files          | 95.13 % Stmts | 86.74 % Branch | 91.96 % Funcs | 95.46 % Lines
 lib               | 99.23 %       | 95.45 %        | 95.23 %       | 99.14 %
 server            | 94.59 %       | 90.90 %        | 100.00 %      | 94.11 %
 server/repositories | 92.22 %     | 81.69 %        | 90.74 %       | 93.22 %
```

**Against the testing scope in `backlog.md` §1.3 / `architecture.md` §11.1:**

| Target | Required | Measured | Verdict |
|---|---|---|---|
| `src/lib/**` (unit) | ≥90% | 99.14% lines | PASS |
| `src/server/**` (integration, real SQLite) | ≥85% | 94.11% lines | PASS |
| Component tests | key components | 15 files / 106 cases | PASS |
| E2E critical journeys | the 5 in §11.4 | 14 cases × 2 projects = 28 | PASS |

Repository integration tests run against a **real migrated SQLite temp database**
(`src/test/db.ts` → `createDatabase()` + `migrate()` + `FTS5_DDL`), not mocks — which is
the right call, because the bugs this design can actually have (broken FTS triggers,
transaction ordering, `ON DELETE` behaviour) are invisible to a mock. I confirmed the
harness imports the condition-free `db/create.ts`, not the `server-only` `db/client.ts`.

### 3.3 E2E — Playwright, Chromium + WebKit

```
npm run test:e2e
  28 passed (3.8m)
```

14 cases across `browse` (1), `search` (2), `edit` (2), `empty-states` (6), `responsive` (3),
run twice (1280×800 Chromium, iPad-gen-7-landscape WebKit). Includes the axe smoke
assertion on `/`, `/search`, `/articles/[slug]`, and the load-bearing
**edit → save → full reload → still there** assertion.

### 3.4 Untested critical paths

Coverage is high and well-targeted. The genuinely thin areas, all consistent with the
brief's stated "Not MVP" scope:

- **`server/repositories/categories.ts` is the weakest file** (83.3% lines, 62.5% branches,
  lines 134–150 uncovered). Category rename/delete are explicitly deferred, so this is
  proportionate — but it is the least-verified repository.
- `server/http.ts` lines 32 and 87 uncovered — the malformed-`Origin` branch and part of
  the `ZodError` mapping in `problemResponse`. I exercised 403/415/422 by hand and they
  behave correctly, so the risk is low.
- `lib/toast-messages.ts` at 80% lines / **0% functions** — one uncovered branch, line 41.
- `schema.ts` 80% lines (lines 38, 62–71) — `$defaultFn` closures, not meaningfully testable.
- **No test exercises "Save & create another" end to end.** `article-form.test.tsx` asserts
  only that `intent` is set to `'save'` on the default path (line 125). That gap is exactly
  why QA-1 shipped.

**Boundary note:** the a11y coverage is an axe **smoke** run with `color-contrast`
disabled, on three routes. That matches the brief's "Not MVP: full accessibility audits"
and the project says so plainly. I am not counting it against them.

---

## 4. Responsiveness result

**Result: PASS on layout; FAIL on one touch-target rule.**

I walked all six widths in `design-spec.md` §6.2 with a real browser, measuring
`scrollWidth − innerWidth`, sidebar visibility, hamburger presence, and TOC visibility.
An independent probe of the shipped `responsive-matrix.cjs` corroborated.

| Width | H-overflow | Sidebar | Hamburger | TOC | Verdict |
|---|---|---|---|---|---|
| 360 | 0 px | hidden | present | hidden | PASS |
| 768 | 0 px | hidden | present | hidden | PASS |
| 834 | 0 px | hidden | present | hidden | PASS |
| 1024 | 0 px | **visible** | absent | hidden | PASS |
| 1280 | 0 px | visible | absent | **visible** | PASS |
| 1440 | 0 px | visible | absent | visible | PASS |

- Breakpoints land exactly on spec: sidebar at ≥1024px, TOC at ≥1280px.
- **Zero horizontal overflow at every width**, including the 360px floor.
- Filter chips: 2 rows at 360px, 1 row from 768px up — matches §6.2.

**Touch targets — partial FAIL.** With `pointer: coarse` emulated at 834px, the
`.kb-touch` hit-area expansion works for header buttons (36px box → **48px** effective,
not clipped) but is **clipped to 32px for the filter chips**, because their `::after`
expands vertically into an ancestor with `overflow-x: auto`. See **QA-2**.

**Caveat to the project's own evidence:** re-running `scripts/responsive-matrix.cjs`
unmodified against a fresh dev server prints:
`TOC present=false visible=undefined FAIL` at both 1280px and 1440px, and
`editor not mounted (loading)` at every width. That is not a product failure — the script
navigates to `/articles/deploy-guide-1`, a slug that does not exist in the seed. See
**QA-5**: the responsive TOC evidence in `verification-notes.md` §7 and the editor
side-by-side evidence **cannot be reproduced from the script as committed**.

---

## 5. Error handling result

**Result: PASS.** Every failure path I probed returns a correct status and a useful,
non-leaking message.

| Condition | Expected | Observed | Verdict |
|---|---|---|---|
| Unknown article in the API | 404 problem+json | 404, `type: .../not-found`, `detail: No article with slug "nope".` | PASS |
| Unknown article page | not-found surface | Correct copy + both exits + `robots: noindex` | PASS (status 200 — QA-4) |
| Unknown category page | not-found surface | Same; `robots: noindex` present | PASS (status 200 — QA-4) |
| Unknown top-level route | 404 | **404** | PASS |
| Invalid create payload | 422 + field errors | 422 with per-path messages | PASS |
| Body over 200,000 chars | 422 | 422 with the documented message | PASS |
| Stale `version` on PATCH | 409 | 409 + `Expected version 1, found 2.` | PASS |
| Duplicate category name | 409 | 409 | PASS |
| Missing JSON content type | 415 | 415 problem+json | PASS |
| Cross-origin mutation | 403 | 403 problem+json | PASS |
| Malformed JSON body | 400 | 400, not a 500 | PASS |
| `/api/test/reset` with guard off | bare 404 | 404, empty body | PASS |
| Search `q` empty | 400 | 400 | PASS |
| FTS5 injection `q=" AND` | 200, never 500 | 200 | PASS |

**Notable strengths.** No stack trace leaked in any response (the `INTERNAL` branch
returns a fixed message). `mapArticleWriteError` converts raw `SQLITE_CONSTRAINT_*` codes
into `AppError`s so no driver error escapes the repository. `notFound()` is used for
missing articles rather than a generic 500. The `LIKE` fallback means a broken search
index degrades instead of throwing.

**Gaps.** The two soft-404s (§QA-4) and the absence of any handling for a
**partially-failed `Save & create another`** path (because that path does not exist).

---

## 6. Spec adherence summary

**Overall: strong.** This is one of the more faithful spec-to-implementation deliveries I
have reviewed. The layering, the URL contract, the API surface, the schema, and the
search design all match `architecture.md` closely, and — importantly — the deviations are
**documented in `docs/decisions-log.md` with rationale**, not hidden.

### Conforms

- **Layering (§4, §7.2).** All SQL and the driver are confined to `src/server/**` and
  `scripts/**`; every value flows through Drizzle's parameterized `sql` template. The
  boundary is enforced by an ESLint `no-restricted-imports` rule rather than convention.
- **D25 repository factories.** Verified — repositories take a `Database` handle and
  tests pass a temp-file handle with zero mocking. `lazyRepository()` is the documented
  I3-3 adaptation of the §8.1 snippet.
- **D26 `server-only` split.** `db/create.ts`, `db/search-index-ddl.ts`, and `lib/env.ts`
  are the only condition-free modules, exactly as specified.
- **Search (§8.1).** External-content FTS5 table, three triggers using the mandatory
  `('delete', …)` form, `bm25(article_search, 8.0, 3.0, 1.0)`, `highlight`/`snippet` with
  `char(1)`/`char(2)` sentinels decoded into `{text, match}[]`. `toFtsQuery()` strips
  operators and quotes every token. The `LIKE` fallback is capped at 50.
- **Route map and URL contract (§6.2).** All 7 routes exist with the documented query
  params; `listQuerySchema` uses `.catch()` so a malformed URL degrades to defaults and
  never 400s.
- **API surface (§7.3).** All 8 endpoints present; RFC 9457 problem+json throughout;
  same-origin + JSON content-type on every mutation.
- **Schema (§8.2/8.3).** Matches column-for-column, including the hand-edited `CHECK` in
  `0000_init.sql` (I1-2) and the `lower(name)` case-insensitive unique index.
- **Security posture (§13.2).** No `dangerouslySetInnerHTML`, no `rehype-raw` in code, no
  interpolated `sql.raw`, security headers on every route, guarded test endpoint.
- **Empty states (§6.5).** All five canonical states render distinct copy and a working CTA.
- **Design tokens.** No `tailwind.config.js`; all tokens in `globals.css`; one accent hue;
  the word "delete" appears nowhere in user-facing copy.

### Deviations — all previously documented

| Doc | Deviation | Assessment |
|---|---|---|
| I1-1 | ESLint 9.39.5 instead of 10.10.0 | **Justified.** `eslint-config-next`'s plugin set caps at ESLint 9.7 and the Babel parser returns a scope manager ESLint 10 rejects. The upper alternative was a permanently red lint gate. |
| I1-2, I1-3 | `CHECK` hand-edited; `scripts/**` exempt from the import rule | **Justified** by §8.5 and §14.1 respectively. |
| I3-1 | Revision `#N` = state at version `N`, not §8.7's literal reading | **Correctly identified as unimplementable.** §8.7's literal instruction collides with the `(article_id, revision_number)` unique index. The chosen model is the one the seed and `design-spec.md` §3.4 assume. Good catch by the implementer. |
| I3-3 | `lazyRepository()` instead of `createXRepository(getDb())` | **Justified.** The §8.1 snippet throws under Vitest and races `instrumentation.ts`. Call shape preserved. |
| I6-1 | `rehype-prism-plus` dropped; preview reuses `ArticleBody` | **Better than spec.** The library's default entry renders its preview through `rehype-raw`, which D6 forbids. Reusing `ArticleBody` makes preview/read parity structural. |
| I7-1 | `workers: 1` everywhere instead of `CI ? 1 : 2` | **Justified**, and the failure mode was observed, not theorized. |
| I7-2 | `allowedDevOrigins: ['127.0.0.1']` added | **Necessary.** Without it every client interaction was silently dead under Playwright while SSR still looked correct. |
| I7-5 | `_comment` JSON field instead of a `//` comment | **Forced.** A `//` comment breaks `JSON.parse`. |
| I8-1 … I8-7 | Seven defects found by the verification pass and fixed | **Good practice**, and consistent with the brief. |
| §5.1, §5.2, §5.3 | Two JS budgets missed; no auth; `--ink-subtle` at 4.22:1 | **Accepted with bounds stated.** The JS miss is well-evidenced (a zero-feature 404 page already loads 211.9 KB on this framework version). |

### Deviations that were *not* previously documented

See the **Spec drift log (§8)** — QA-1, QA-2, QA-3 and QA-5 are deviations the project's
own verification did not record.

### Scope

`backlog.md`'s 8-iteration plan was followed in order — the commits are `I1 … I8` and each
iteration has a summary. F4 (categories) and F5 (status) are modelled end-to-end with the
deliberately minimal UI that `architecture.md` §9.6 requires; the schema and API were not
cut. **No scope drift beyond the plan.** The one addition, a fifth empty state, is
`design-spec.md` UX20 — a design-layer decision, not implementer invention.

---

## 7. Code signals checklist

| # | Signal | Verdict | Evidence |
|---|---|---|---|
| 1 | **Linting clean, no obvious warnings** | **Yes** | `npx eslint .` → exit 0, **0 errors**, 1 warning. The warning is pre-existing and unrelated: `postcss.config.mjs` `import/no-anonymous-default-export`. No `TODO`/`FIXME`/`HACK`/`@ts-ignore` in `src/`; exactly one intentional `eslint-disable-next-line react-hooks/exhaustive-deps` (`ui/toast.tsx:72`). `npm run format:check` → clean. |
| 2 | **No obvious security holes** | **Yes**, with the documented no-auth caveat | Verified: 0 `dangerouslySetInnerHTML`, 0 code uses of `rehype-raw`, 0 interpolated `sql.raw`; `assertSameOrigin` + `assertJsonContentType` on all 5 mutating handlers; `/api/test/reset` returns a bare 404 unless `E2E_TEST_MODE=1`; security headers on `/(.*)`; `npm audit --audit-level=high` → 0 high/critical. **The absence of auth is a deliberate, brief-sanctioned, clearly-bounded decision (A1/D19), not a hole** — but it hard-constrains deployment to a trusted network. |
| 3 | **Modular — no god components or monolithic files** | **Yes, with one caveat** | 117 non-test source files across a clean `ui/ → articles|search|filters|layout/ → app/` layering; repositories are factories; longest repository is 557 lines. **Caveat:** `components/articles/article-form.tsx` is **727 lines** and owns the form, the status pill, the slug dialog, the discard dialog, the reload-confirm dialog, and the conflict integration. It is cohesive and heavily commented, but it is the one file that would benefit from extraction. |
| 4 | **Follows the architecture spec** | **Yes** | Layering, route map, API surface, schema, FTS5 design, `server-only` boundary, and repository-factory seam all match. Deviations are recorded (§6). |
| 5 | **Planner's iterations followed without major scope drift** | **Yes** | Commits `I1`–`I8` in dependency order; 8 iteration docs + 8 summaries present; every deviation logged in `decisions-log.md` §4. Iteration 8's restructuring into `(shell)` / `(editor)` route groups is a spec-compatible refinement of §2.2's shell mapping, and it is documented. No feature was invented or silently dropped. |
| 6 | **Dependency versions current** | **Mostly** | Exact pins as §3.2/§3.3 require. **Three drifts:** `eslint` 9.39.5 vs the spec's 10.10.0 (documented I1-1, justified); `next` 16.3.4 vs live latest 16.3.5 (matches spec; one patch behind); `zod` 4.6.2 vs live latest 4.6.4 (matches spec; two patches behind). `typescript` 6.0.3 vs latest 7.0.2 is **deliberate** (D13) — 7.x breaks `typescript-eslint`'s peer range and ships no `tsserver`. `react`, `better-sqlite3`, `drizzle-orm`, `vitest`, `@playwright/test`, `tsx` are all at latest stable. A dependency-refresh pass is optional, not required. |

---

## 8. Defect log

### CRITICAL

**None found.** No defect blocks a required P0 flow, corrupts data, or exposes the system.

---

### MAJOR

#### QA-1 — "Save & create another" navigates away instead of resetting the form

| | |
|---|---|
| **Severity** | Major |
| **Component** | `src/components/articles/article-form.tsx`, `src/app/actions/articles.ts` |
| **Spec** | `design-spec.md` §3.1 (`/articles/new` → *"Save & create another" → reset form at same URL*), **E10**, **UX22** (both `[DECISION]`) |
| **Impact** | The button saves the article correctly but then redirects to `/articles/{slug}`, exactly like the primary Save button. The in-place batch-authoring flow the design spec added — and priced at "3 steps per article" saved — does not exist. Users are bounced to the detail page and must navigate back and re-pick their category. |

**Reproduction**

```powershell
npm run db:reset
npm run dev            # http://localhost:3000
# Browser, any width:
# 1. Go to /articles/new
# 2. Category → "Engineering"
# 3. Title → "QA create-another probe"; Body → "## probe"
# 4. Click "Save & create another"
# Expected: URL stays /articles/new, form is reset, category retained,
#           "Article created." toast, article persisted.
# Actual:   URL becomes /articles/qa-create-another-probe (the detail page).
#           No toast. Form never resets.
```

**Observed output** (Chromium 1280×900, driven via Playwright):

```
url_after_click:        http://localhost:3400/articles/qa-create-another-probe
expected_url:           http://localhost:3400/articles/new
is_still_on_new_form:   false
category_before:        Engineering
title_field_after:      "<no #title>"      # the form is gone
api_matches:            1                  # the article WAS created
created_slugs:          qa-create-another-probe
```

**Root cause.** `ArticleForm.submit()` sets `formData.set('intent', intentRef.current)`,
and `article-form.tsx:642` sets `intentRef.current = 'another'` before submit — but
**`src/app/actions/articles.ts` never reads `intent`**. `createArticle()` ends with an
unconditional `redirect(\`/articles/${slug}?toast=…\`)`. There is no `reset()` call, no
branch on the intent, and no `/articles/new?toast=created` destination. Confirmed by
grep: the only occurrences of `intent` are the two writes in the form, the `FormData.set`,
and a test asserting `intent === 'save'`.

**Test gap that let it through.** `article-form.test.tsx:125` asserts
`expect(formData.get('intent')).toBe('save')` — it verifies the value is *sent*, never that
it is *honoured*. No unit, integration, or E2E test clicks "Save & create another".

**Suggested fix.** In `createArticle()`, read the intent before redirecting:

```ts
const wantsAnother = formData.get('intent') === 'another';
revalidateArticleSurfaces(slug);
redirect(
  wantsAnother
    ? '/articles/new?toast=created'
    : `/articles/${slug}?toast=${parsed.data.status === 'published' ? 'published' : 'created'}`,
);
```

and on the create page, reset the form (and re-seed the category from the URL) when
`?toast=created` is present. Add one E2E case asserting the URL stays `/articles/new`.

---

#### QA-2 — Filter-chip touch targets are clipped to 32px, not the specified 44px

| | |
|---|---|
| **Severity** | Major (accessibility; affects the app's most-tapped filter control on touch devices) |
| **Component** | `src/components/filters/category-chips.tsx` (~line 92) + `src/app/globals.css` `.kb-touch` |
| **Spec** | `design-spec.md` §6.4 — *"Filter chips: 32px visual height, **44px hit area** — `::after { inset: -6px 0; }`"*; §6.6 makes touch sizing a tablet-floor requirement |
| **Impact** | Chips measure a **32px** effective hit height at a coarse pointer — 27% below the floor. This is a WCAG 2.5.8-adjacent miss on the primary navigation affordance for tablet users. |

**Reproduction**

```powershell
node -e "..."   # or any Playwright script with a coarse pointer
```

```js
const ctx = await browser.newContext({ viewport: { width: 834, height: 1112 }, hasTouch: true });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }] });
await page.goto('http://localhost:3000/');
// measure: chip box height, the ::after expansion, and the clipping ancestor
```

**Observed output** (Chromium, `pointer: coarse` emulated, 834×1112):

```
pointer:coarse emulated = true

"Open navigation"  box=40px ::after(top=-6px, content=yes) expanded=52px  clipper=none
"New article"      box=36px ::after(top=-6px, content=yes) expanded=48px  clipper=none
"Change theme"     box=36px ::after(top=-6px, content=yes) expanded=48px  clipper=none
"All"              box=32px ::after(top=-6px, content=yes) expanded=44px  clipper=clips clippedTop=true clippedBottom=true
"Engineering…"     box=32px ::after(top=-6px, content=yes) expanded=44px  clipper=clips clippedTop=true clippedBottom=true
```

Direct measurement of the chip and its clipping ancestor:

```
chip box      = 32px
scroll strip  = 32px          <- ancestor: "overflow-x-auto" flex strip
EFFECTIVE hit = 32px          (design-spec §6.4 requires 44px)
```

Ancestor chain (the clipper is the second entry):

```
BUTTON  kb-touch rounded-control relative flex h-8 shrink-0 items-center px-2.5 …
DIV     flex [scrollbar-width:none] items-center gap-2 overflow-x-auto …   <-- clips
DIV     flex flex-wrap items-center gap-2 md:flex-nowrap mt-4
```

**Root cause.** `.kb-touch::after { inset: -6px 0 }` expands **vertically** by 6px in both
directions, taking a 32px chip to 44px. The chips live inside a horizontally scrolling
strip (`overflow-x: auto`) that is exactly 32px tall, so the overflow — not only in X but
also in Y — is clipped before it becomes hit area. Header buttons are unaffected because
their ancestors have `overflow: visible`.

**Why the project's own evidence misses it.** `scripts/responsive-matrix.cjs` reports
`18 interactive controls checked, 0 under 44px PASS`, because it (a) asserts the rule
*exists* with `inset: -6px 0` and (b) recomputes each control's size **with that arithmetic
applied**, without intersecting against a clipping ancestor. It never models the clip, so
the miss is structurally invisible to it.

**Suggested fix.** Give the scroll strip vertical breathing room so the pseudo-element is
not clipped — e.g. `py-1.5` on the strip (with a matching negative margin if the layout
must not shift), or replace the vertical `inset` with real `min-height: 44px` plus
`items-center` on the chips. Then extend `responsive-matrix.cjs` to compute the
**intersection** of the expanded box with every clipping ancestor, so this class of defect
cannot recur silently.

---

### MINOR

#### QA-3 — `--color-danger-fg` points at the fill token, re-introducing the AA failure I8-1 fixed

| | |
|---|---|
| **Severity** | Minor (latent — no current consumer) |
| **Component** | `src/app/globals.css:300` |
| **Spec** | I8-1 in `decisions-log.md` §4.5; `design-spec.md` UX16's fill-vs-text pattern |

```css
--color-accent-fg: var(--color-accent-ink);   /* line 299 — text token, correct */
--color-danger-fg: var(--color-danger);       /* line 300 — FILL token, not --danger-ink */
```

I8-1 established that `--color-danger` in dark mode is a **fill** token (L=0.55) that
reaches only **3.45:1** on `--surface` and **2.69:1** on `--danger-soft`, and added
`--color-danger-ink` as the text half. The `-fg` alias was not updated, so any component
(or Tailwind `text-danger-fg` utility) that uses the `-fg` name inherits the AA failure the
fix removed. `--color-accent-fg` correctly aliases the *ink* token, so the two families are
now inconsistent.

**Reproduction:** `Select-String -Path src\app\globals.css -Pattern 'fg:'`
→ `--color-danger-fg: var(--color-danger);`

**Current impact: none** — grep confirms no `danger-fg` class is used in `src/`. The risk
is a future contributor reaching for the "obvious" name.

**Suggested fix:** `--color-danger-fg: var(--color-danger-ink);`

---

#### QA-4 — Soft 404s: missing article and category pages answer HTTP 200

| | |
|---|---|
| **Severity** | Minor |
| **Component** | `src/app/(shell)/articles/[slug]/page.tsx`, `src/app/(shell)/categories/[slug]/page.tsx` |
| **Spec** | `architecture.md` §9.1 (*"404 handling… the page calls `notFound()`"*), §6.5 |
| **Already documented?** | **Yes** — the `categories/[slug]/page.tsx` header comment explains it as a deliberate streaming trade-off and cross-references the iteration-5 decisions log. So this is a *known* deviation, logged here for completeness rather than as a new discovery. |

```
GET /articles/does-not-exist   → 200  (correct not-found surface + robots: noindex)
GET /categories/no-such-cat    → 200  (correct not-found surface + robots: noindex)
GET /no-such-page-xyz          → 404  (top-level route is correct)
```

**Cause:** the route group has a `loading.tsx`, so the shell and skeleton flush before
`notFound()` throws; once streaming has begun the status code cannot change. Next.js
emits `<meta name="robots" content="noindex">` to compensate.

**Impact:** crawlers and uptime monitors treat a missing article as a success. Low for an
internal app; would matter if these URLs were ever indexed or monitored.

**Suggested fix (only if it matters to the deployment):** drop `loading.tsx` from these two
segments, or hoist the existence check above the streaming boundary. That trades the
streamed skeleton for a correct status — a real decision, not a free fix, which is why the
implementer's trade-off is defensible.

---

#### QA-5 — Verification scripts target a nonexistent article slug, invalidating part of the published responsive/editor evidence

| | |
|---|---|
| **Severity** | Minor (app defect: none — affects the reproducibility of the deliverables the brief requires) |
| **Components** | `scripts/a11y-structural.cjs` (:13, :14), `scripts/a11y-signals.cjs` (:21, :50, :62), `scripts/perf-bundle.cjs` (:70, :71), `scripts/perf-http.cjs` (:64), `scripts/perf-floor.cjs` (:26), `scripts/perf-measure.ts` (:59), `scripts/responsive-matrix.cjs` (:73, :111) |

Six of the seven verification scripts hardcode `/articles/deploy-guide-1`. That slug is
**not** in `src/server/db/seed.ts` (the seeded deploy article is
`deploying-the-api-to-production`) and **not** in `e2e/fixtures/seed.json`. It only exists
in the ephemeral 2,000-article perf dataset generated by `perf-seed.ts`, which creates
`${topic}-guide-${i + 1}` → `deploy-guide-1`. So the scripts work against the perf DB and
404 against the canonical seed.

**Reproduction**

```powershell
npm run db:reset
npm run dev -- --port 3400
node scripts/responsive-matrix.cjs http://localhost:3400
```

**Observed:**

```
=== 1280px ===
  sidebar visible: true PASS
  horizontal overflow: 0px PASS
  filter chips: 1 row(s), scrolls=false PASS
  editor not mounted (loading)
  TOC present=false visible=undefined FAIL          <-- spurious
=== 1440px ===
  ...
  TOC present=false visible=undefined FAIL          <-- spurious
```

Confirmed by comparing the two routes directly at 1280×900:

```
REAL slug  (deploying-the-api-to-production)  tocPresent=true  tocVisible=true  h1=1  proseH2=7
scripts slug (deploy-guide-1 → 404)           tocPresent=false tocVisible=false h1=0  proseH2=0
```

**Impact.** Two consequences:

1. `responsive-matrix.cjs` prints **FAIL** at 1280px and 1440px and reports
   `editor not mounted` at every width, so `verification-notes.md` §7's TOC and editor
   claims are **not reproducible from the committed script**. The underlying behaviour is
   fine (I confirmed a real `<h1>`, a visible TOC, and 7 `prose h2` on the real slug), so
   this is an evidence defect, not a product defect.
2. The budgeted detail-route and editor JS/TTFB numbers in `verification-notes.md` §4 were
   measured against a **404 page** in the perf database only because `deploy-guide-1`
   happened to resolve there — meaning those numbers describe the perf DB, not the
   canonical seed. They remain directionally valid, but a reader cannot tell which dataset
   a measurement came from.

**Suggested fix.** Parameterize the slug
(`const SLUG = process.env.KB_SAMPLE_SLUG ?? 'deploying-the-api-to-production'`), or derive
it from `db:fixture`, in all seven scripts; document in `verification-notes.md` which
dataset each number came from. Also note `docs/verification-notes.md:297` references the
same stale slug in prose.

---

#### QA-6 — E2E cannot start while a dev server is running; README does not say so

| | |
|---|---|
| **Severity** | Minor (developer ergonomics / setup documentation) |
| **Component** | `README.md` "First run" + "Testing"; `playwright.config.ts` `webServer.command` |

**Reproduction**

```powershell
npm run dev            # terminal 1 — Next reports Ready on :3000
npm run test:e2e       # terminal 2
```

**Observed:**

```
[WebServer] ⨯ Another next dev server is already running.
[WebServer] - Local:        http://localhost:3000
[WebServer] - PID:          20168
[WebServer] - Dir:          C:\projects\evals_sep2026_deepseek-flash-4.1
Error: Process from config.webServer was not able to start. Exit code: 1
```

Next.js refuses a second `next dev` instance for the same directory **regardless of port**,
so `reuseExistingServer: !process.env.CI` cannot help — Playwright's health check targets
`:3100`, which the running `:3000` server is not serving. Stopping the `:3000` server and
re-running produced **28 passed**. The README's testing section does not mention this.

**Suggested fix.** Add one line to the README: *"Stop any running `npm run dev` before
`npm run test:e2e` — Next.js allows only one dev server per project directory."* Optionally
point Playwright's `webServer` at `next start` on a built app to remove the coupling.

---

## 9. Spec drift log

Deviations from `architecture.md`, `design-spec.md`, or `backlog.md`. All previously
recorded ones are cited by ID; the rest are new and map to the defects above.

| # | Spec source | Specified | Delivered | Recorded? | Assessment |
|---|---|---|---|---|---|
| 1 | `design-spec.md` §3.1, E10, UX22 | "Save & create another" resets the form in place at `/articles/new`, category retained | Redirects to the article detail page; form never resets; `intent` is sent but ignored | **No** | **Drift — QA-1.** A decided, priced feature is unimplemented. Fix before release. |
| 2 | `design-spec.md` §6.4, §6.6 | Filter chips have a 44px hit area at touch viewports | 32px effective (pseudo-element clipped by an `overflow-x: auto` ancestor) | **No** | **Drift — QA-2.** The mechanism ships; the outcome does not. |
| 3 | `design-spec.md` UX16 + `decisions-log.md` I8-1 | Danger **text** uses the text token; fills use the fill token | `--color-danger-fg` still aliases the fill token (unused today) | **No** | **Drift — QA-3.** Inconsistent with the fix that resolved the same conflict for the accent. |
| 4 | `architecture.md` §9.1 | Missing article calls `notFound()` → 404 | `notFound()` renders the right surface but the response is 200 | **Yes** (in-code comment + iteration-5 log) | **Accepted trade-off**, correctly documented. Logged for completeness. |
| 5 | `architecture.md` §12.4 / README | First-run expected result | Accurate, except the sidebar shows 5 category rows (4 real + synthetic `Uncategorized`) where the README implies 4 | Partially (`acceptance-check.cjs` explains it) | **Documentation wart.** Clarify the README line. |
| 6 | `architecture.md` §11.3 / `design-spec.md` §11 | E10's create-another flow implied by the editor checklist | No test covers it | **No** | Contributed to QA-1. Add an E2E case. |
| 7 | `architecture.md` §3.3 | `eslint@10.10.0` | `eslint@9.39.5` | **Yes** — I1-1 | **Justified.** Plugin peers cap at 9.7; the alternative was a permanently red gate. |
| 8 | `architecture.md` §8.7 | Revision numbering `= row.version` for the *previous* state | Revision `#N` = state at version `N` | **Yes** — I3-1 | **Justified.** The literal reading is unimplementable against the unique index; the chosen model matches the seed and design spec. |
| 9 | `architecture.md` §8.1 | `export const xRepository = createXRepository(getDb())` | `lazyRepository(createXRepository)` | **Yes** — I3-3 | **Justified.** The snippet throws under Vitest and races `instrumentation.ts`. |
| 10 | `architecture.md` §13.1 | Editor route bundles `rehype-prism-plus` | Dropped; preview reuses `ArticleBody` | **Yes** — I6-1 | **Improvement.** Avoids the library's `rehype-raw` preview, which D6 forbids. |
| 11 | `architecture.md` §11.4 | `workers: CI ? 1 : 2` | `workers: 1` everywhere | **Yes** — I7-1 | **Justified.** The destructive per-spec reset makes parallelism unsafe; failure observed. |
| 12 | `architecture.md` §12.6 | `next.config.ts` as quoted | `+ allowedDevOrigins: ['127.0.0.1']` | **Yes** — I7-2 | **Necessary.** Without it all client interactivity was silently dead under Playwright. |
| 13 | `architecture.md` §13.1 | Browse first-load JS < 150 KB; editor < 320 KB | Browse 232.8 KB; editor 471.9 KB | **Yes** — §5.1 | **Accepted, well-evidenced.** A zero-feature 404 page loads 211.9 KB on this framework version, so the budget is unreachable, and the guarantee it protected (editor absent from the browse bundle) is verified. |
| 14 | `architecture.md` §16.1 A1 | No auth in v1 | No auth | **Yes** — §5.2 | **Brief-sanctioned.** Creates a hard internal-network-only deployment bound. |
| 15 | `design-spec.md` UX15 | `--ink-subtle` 4.22:1 | Ships at 4.22:1 | **Yes** — §5.3 | **Accepted and bounded** to redundant 12px meta text. |

**No unrecorded scope drift.** F4/F5 were correctly kept as schema+API with minimal UI per
`architecture.md` §9.6, and the eight-iteration plan was executed in order. Item 1 is a
decided feature that was built *partially* (the button exists) rather than scope that was
cut — which is why it is a defect, not a scope decision.

---

## 10. Release recommendation

### ✅ **Ship with conditions**

**Rationale, on evidence.**

*For shipping:*

1. **All three required P0 flows work end to end, verified by me, not assumed.**
   Browse renders 7 published articles across 4 categories; detail renders real Markdown
   (`<h2>`, `<table>`, fenced code) rather than literal syntax; search returns exactly 3
   ranked, highlighted results with title matches outranking body matches; and edit
   **persists across a full page reload** — the acceptance criterion in `architecture.md`
   §18, asserted by E2E and reproduced by me.
2. **Every quality gate reproduces on a clean checkout.** 492/492 unit, integration, and
   component tests; 28/28 E2E across Chromium and WebKit; coverage 95.46% overall with both
   layer targets met; typecheck, lint, format, and a 13-route production build all green.
3. **Error handling is genuinely good.** Thirteen distinct failure conditions return
   correct statuses with RFC 9457 problem+json, useful messages, and no leaked internals.
   `SQLITE_CONSTRAINT_*` codes are mapped so no driver error escapes the repository.
4. **The security posture is right for the stated scope.** No `dangerouslySetInnerHTML`,
   no `rehype-raw`, no interpolated raw SQL, same-origin + content-type checks on every
   mutation, a guarded test endpoint, security headers, and 0 high/critical advisories.
   The stored-XSS class is designed out, not mitigated.
5. **Zero horizontal overflow at all six widths**, with breakpoints landing exactly on spec.
6. **No critical defects.** Nothing blocks a required flow or risks data integrity.

*Conditions on the recommendation:*

1. **QA-1 must be fixed before any batch-authoring content owner touches this** — it is a
   decided feature that silently does nothing, and its dead `intent` plumbing is actively
   misleading.
2. **QA-2 should be fixed before tablet reliance** — the filter chips are the app's primary
   navigation control on touch, and they miss the specified touch floor by 27%.
3. **QA-5 should be fixed before these verification artifacts are used as a regression
   baseline**, because as committed they print FAIL for a healthy app.
4. **The no-auth bound must be enforced operationally.** This is not a soft caveat: with no
   authentication, exposing this app beyond a trusted internal network makes every article
   writable by anyone who finds the URL. `README.md` and `decisions-log.md` §5.2 both state
   this, and they are right to.

*Why not "No-Ship":* no critical defect exists, every required flow is verified, and the two
significant defects are narrow — one unexercised secondary button and one touch-target rule —
neither of which degrades the core browse → search → edit loop.

*Why not an unconditional "Ship":* QA-1 is a requested, priced feature that is broken in
production, and QA-2 is a measurable accessibility regression against the project's own
written standard. Shipping with those unacknowledged would set a bad precedent for a
codebase whose main virtue is that its documentation is honest.

---

## 11. Next steps — prioritized

### P0 — before release (blocking the conditions above)

1. **Fix QA-1 `Save & create another`.** Branch on `intent` in `createArticle()`
   (`src/app/actions/articles.ts`), redirect to `/articles/new?toast=created` when it is
   `'another'`, and reset the form with the category retained on the create page. Add an
   E2E case in `e2e/edit.spec.ts` asserting the URL stays `/articles/new`, the form is
   empty, the category persists, and the toast shows. *Effort: small. Risk: low.*

2. **Fix QA-2 filter-chip touch targets.** Give the chip scroll strip vertical room (or use
   `min-height: 44px` on the chips) so the `.kb-touch` pseudo-element is not clipped by
   `overflow-x: auto`. Verify with a coarse-pointer measurement of the **effective**
   intersection, not the raw box. *Effort: small. Risk: low.*

### P1 — before using the verification artifacts as a baseline

3. **Fix QA-5's stale slug** in the six scripts and one prose reference, ideally by deriving
   it from `e2e/fixtures/seed.json`. Record in `verification-notes.md` which dataset each
   measured number came from (canonical seed vs 2,000-article perf DB).

4. **Harden `responsive-matrix.cjs`** so it intersects the expanded hit box with every
   clipping ancestor. This is the check that *should* have caught QA-2 and did not —
   fixing it prevents the whole class of defect from recurring.

### P2 — cheap cleanups

5. **Fix QA-3:** `--color-danger-fg: var(--color-danger-ink);` (`globals.css:300`).
6. **Document QA-6** in the README: stop `npm run dev` before `npm run test:e2e`.
7. **Clarify the README's expected first-run result** — the sidebar shows 4 real categories
   plus a synthetic `Uncategorized` row, so "4 categories" needs the parenthetical the
   `acceptance-check.cjs` comment already has.
8. **Refresh dependency pins:** `next` 16.3.4 → 16.3.5, `zod` 4.6.2 → 4.6.4. Both are
   patch-level and match the spec's intent; `eslint` 9.39.5 stays (documented I1-1), and
   `typescript` stays at 6.0.3 by design (D13).

### P3 — quality improvements, not required for release

9. **Split `article-form.tsx`** (727 lines — the largest file in the codebase). Extract
   `StatusPill`, `SlugDialog`, `DiscardDialog`, and `ReloadConfirmDialog` into their own
   files. The component is cohesive and well-commented, but it is the one place a new
   contributor will struggle to navigate.
10. **Close the category-repository coverage gap** — `categories.ts` is the weakest file at
   83.3% lines / 62.5% branches (lines 134–150). Proportionate given categories are P1, but
    it is the least-verified repository and the natural place for the next bug.
11. **Add a destructive-path E2E case** for archive → Undo, so the 5-second restore window
    is verified in a browser rather than only in unit tests.
12. **Decide QA-4 deliberately.** Either accept the soft-404/200 trade-off formally in the
    decisions log (recommended, since the streaming behaviour is intentional and the trade
    is real), or drop `loading.tsx` from the two `[slug]` segments if correct status codes
    matter to monitoring.

### Explicitly not recommended

- **Do not chase the two missed JS budgets.** The evidence is sound: a zero-feature 404
  page in this app already loads 211.9 KB on the pinned framework version, and the guarantee
  the budgets protected — the editor staying out of the browse route — is verified. Closing
  them requires a framework-version decision or dropping a dependency, both of which the
  brief places outside MVP.
- **Do not add authentication** without a product decision. It is `[ASSUMPTION A1]`, it is
  brief-sanctioned, and `architecture.md` §15.2 already documents the retrofit path.

---

## Appendix — commands run for this review

```powershell
# Setup / gates
npm run db:reset                    # exit 0
npm run test:run                    # 492 passed (48 files)
npm run test:coverage               # 95.46% lines, thresholds met
npx eslint .                        # 0 errors, 1 pre-existing warning
npm run format:check                # clean
npm run build                       # 13 routes
npm run test:e2e                    # 28 passed
npm run db:check                    # integrity ok, FKs clean
npm audit --audit-level=high        # exit 0, 0 high/critical

# Live verification (dev server on :3000, :3300 empty DB, :3400 probes)
GET  /                                    → 200
GET  /articles/deploying-the-api-to-production → 200, real <h2>/<table>
GET  /articles/does-not-exist             → 200 + not-found surface + noindex
GET  /search?q=deploy                     → 200, 6 <mark>
GET  /api/articles                        → total=7
GET  /api/articles/nope                   → 404 problem+json
GET  /api/search?q=deploy                 → total=3, ranked
GET  /api/search?q=                       → 400
GET  /api/categories                      → 4 + counts
POST /api/articles (valid)                → 201 + Location
POST /api/articles (invalid)              → 422 + field errors
POST /api/articles (text/plain)           → 415
POST /api/articles (bad Origin)           → 403
PATCH /api/articles/:slug (stale version) → 409
DELETE /api/articles/:slug                → 204
POST /api/categories (dup)                → 409
POST /api/test/reset (guard off)          → 404, empty body

# Browser probes (Playwright, Chromium + WebKit)
Save & create another (1280x900)          → QA-1
responsive sweep 360/768/834/1024/1280/1440 → 0 px overflow at all six
touch targets at 834px, pointer:coarse    → QA-2
TOC reachability, real slug vs script slug → QA-5
accessibility smoke (/ , /search, detail) → 0 violations
structural a11y (landmarks, h1, tab order) → pass on the real slug

# Shipped verification scripts, re-run
node scripts/a11y-signals.cjs      → 3/3 PASS
node scripts/a11y-structural.cjs   → FAILs traced to QA-5's slug
node scripts/responsive-matrix.cjs → FAILs at 1280/1440 traced to QA-5's slug
```

**Working tree after review:** clean. All scratch databases (`kb.qa.db`, `kb.perf.db`,
`kb.e2e.db`) and probe scripts removed; `data/` holds only the gitignored `kb.db`.

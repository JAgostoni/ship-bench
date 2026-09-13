# Verification notes

**Status:** required deliverable 7 from `product-brief.md` — "Tests and verification notes".
**Date:** 2026-09-13
**Environment:** Windows 11, Node.js 24.21.0, npm 11.19.0, Chrome/WebKit via Playwright 1.63.0.

Every claim in this document is traceable to a command, a test name, or a
screenshot. Where a number is quoted, the command that produced it is quoted with
it. The verification scripts live in `scripts/` and are committed, so each result
can be reproduced rather than taken on trust.

**A note on what this is.** The automated accessibility check is an axe **smoke
run**, not a full audit (see §6). The E2E suite covers exactly the five journeys the
brief scopes in, not an exhaustive edge-case matrix (see §4). Both boundaries are
the brief's, quoted in §9.

---

## 1. Test inventory

### 1.1 Unit / integration / component — 492 cases in 48 files

`npm run test:run` → **492 passed (48 files)**.

Two Vitest projects (`vitest.config.ts`): `node` for pure logic, repositories, and
route handlers; `components` (jsdom) for React component tests.

**`src/lib/**` — 141 cases in 14 files** (pure functions, no I/O)

| File | Cases | File | Cases |
|---|---|---|---|
| `validation/article.test.ts` | 23 | `fts.test.ts` | 10 |
| `markdown.test.ts` | 16 | `slug.test.ts` | 10 |
| `validation/query.test.ts` | 10 | `format.test.ts` | 9 |
| `highlight.test.ts` | 8 | `cn.test.ts` | 7 |
| `errors.test.ts` | 7 | `validation/article-form.test.ts` | 6 |
| `validation/category.test.ts` | 6 | `env.test.ts` | 6 |
| `result.test.ts` | 5 | | |

**`src/server/**` — 157 cases in 11 files** (real migrated SQLite, no mocks)

| File | Cases | File | Cases |
|---|---|---|---|
| `repositories/articles.test.ts` | 53 | `repositories/search.test.ts` | 35 |
| `repositories/categories.test.ts` | 17 | `repositories/revisions.test.ts` | 12 |
| `db/db-runtime.test.ts` | 10 | `db/seed.test.ts` | 9 |
| `serialize.test.ts` | 7 | `http.test.ts` | 7 |
| `repositories/runtime.test.ts` | 4 | `db/current.test.ts` | 3 |
| `test/db.test.ts` (harness) | 8 | | |

**`src/app/**` and `src/components/**` — 194 cases in 23 files**

| Group | Files | Cases | Examples |
|---|---|---|---|
| Route handlers (`src/app/api/**`) | 6 | 44 | `search/route.test.ts` (8), `articles/writes.test.ts` (10), `test/reset/route.test.ts` (5) |
| Server Actions (`src/app/actions/**`) | 2 | 24 | `articles.test.ts` (17), `categories.test.ts` (7) |
| Components (`src/components/**`) | 15 | 106 | `search-input.test.tsx` (12), `article-form.test.tsx` (11), `pagination.test.tsx` (10), `article-body.test.tsx` (9), `search-results.test.tsx` (9), `filter-bar.test.tsx` (9) |

### 1.2 Coverage

`npm run test:coverage` (v8 provider, thresholds enforced in `vitest.config.ts`):

| Scope | Statements | Branches | Functions | Lines | Threshold | Verdict |
|---|---|---|---|---|---|---|
| **All files** | 95.13% | 86.74% | 91.96% | **95.46%** | 80/70/80/80 | PASS |
| **`src/lib/**`** | — | 95.45% | 95.23% | **99.14%** | 90/70/90/90 | PASS |
| **`src/server/**`** | — | 90.90% | 100% | **94.11%** | 85/70/85/85 | PASS |

Both layer targets from `architecture.md` §11.1 are met: ≥90% for `src/lib/**` and
≥85% for `src/server/**`, against real migrated databases rather than mocks.

### 1.3 E2E — 14 cases × 2 projects = 28 runs

`npm run test:e2e` → **28 passed (1.2m)**.

| Spec | Cases |
|---|---|
| `e2e/browse.spec.ts` | 1 |
| `e2e/search.spec.ts` | 2 |
| `e2e/edit.spec.ts` | 2 |
| `e2e/empty-states.spec.ts` | 6 |
| `e2e/responsive.spec.ts` | 3 |

Projects: `desktop-chromium` (1280×800) and `tablet-webkit` (iPad gen 7 landscape).

---

## 2. Commands run and observed exit codes

All run from the repository root on the environment above.

| Command | Observed result | Exit code |
|---|---|---|
| `npm run verify` | typecheck clean; lint clean (1 pre-existing warning in `postcss.config.mjs`); format:check clean; **492 tests passed**; production build succeeded | **0** |
| `npm run test:coverage` | 492 tests passed; coverage thresholds met (§1.2) | **0** |
| `npm run test:e2e` | **28 passed** across both projects | **0** |
| `npm run db:check` | `integrity_check: ok`, `foreign_key_check: clean` | **0** |
| `npm audit --audit-level=high` | 4 moderate advisories (dev-only, `drizzle-kit` → `@esbuild-kit/esm-loader`); **0 high or critical** | **0** |
| `npm run db:fixture` | 4 categories, 9 articles (7 published, 2 draft), 3 matching `deploy` | **0** |

`npm run verify` is the gate CI runs: `typecheck && lint && format:check &&
test:run && build`.

---

## 3. The five E2E journeys

| Journey | desktop-chromium | tablet-webkit |
|---|---|---|
| **1. Browse** → detail → back, with rendered Markdown (real `<h2>`, `<table>`; no literal `##` or `\| ---`) and preserved scroll/filters | ✅ | ✅ |
| **2. Search** `deploy` → exactly 3 results, `<mark>` highlighting, live count, open the top-ranked result | ✅ | ✅ |
| **2b. Search** a nonsense term → the zero-results empty state | ✅ | ✅ |
| **3. Edit** → save → **full page reload persists** → the new revision appears in History | ✅ | ✅ |
| **3b. Create** a new article → success toast | ✅ | ✅ |
| **4. Empty states** — all five render their exact copy and correct CTA target, and no two share a title | ✅ | ✅ |
| **5. Responsive** — drawer below 1024px and sidebar above, no horizontal overflow, `+ New article` labelled at 834px | ✅ | ✅ |

The accessibility smoke assertion (`expectNoA11yViolations`) runs inside the
journeys on `/`, `/search`, and `/articles/[slug]`.

**The per-spec reset does not touch the developer's database.** The Playwright
`webServer` points the app at `./data/kb.e2e.db` with `E2E_TEST_MODE=1`; a process
environment variable wins over `.env.local`, so `./data/kb.db` is out of reach for
the whole run. Verified in iteration 7 by row count after two consecutive runs.

---

## 4. Performance results

Measured against a **2,000-article dataset**, not the 9-article seed
(`docs/backlog.md` B12). Reproduce with:

```bash
DATABASE_FILE=./data/kb.perf.db npx tsx scripts/perf-seed.ts --scale=2000
DATABASE_FILE=./data/kb.perf.db npm run build
DATABASE_FILE=./data/kb.perf.db npx next start --port 3200
node scripts/perf-http.cjs    http://127.0.0.1:3200   # p75 over 30 runs per route
node scripts/perf-browser.cjs http://127.0.0.1:3200   # LCP + filter-chip perceived latency
node scripts/perf-bundle.cjs  http://127.0.0.1:3200   # first-load JS per route
node scripts/perf-floor.cjs   http://127.0.0.1:3200   # the framework baseline on the 404 page
```

The perf database is deleted afterwards; `data/` is gitignored apart from
`.gitkeep`, so no scratch artifact is committed.

### 4.1 Server-side budgets

| Metric | Budget (`§13.1`) | Measured p75 | Verdict |
|---|---|---|---|
| Browse page TTFB @ 2,000 articles | < 150 ms | **19.3 ms** | ✅ PASS |
| Browse page full render | < 250 ms | **18.9 ms** | ✅ PASS |
| Search response (render) | < 100 ms | **18.1 ms** | ✅ PASS |
| Search response (`/api/search` JSON) | < 100 ms | **4.1 ms** | ✅ PASS |
| Article detail render | < 200 ms | **20.3 ms** | ✅ PASS |

### 4.2 Browser-side budgets

| Metric | Budget | Measured p75 | Verdict |
|---|---|---|---|
| LCP, browse route, localhost baseline | < 1.2 s | **60 ms** | ✅ PASS |
| Filter-chip interaction, perceived | < 300 ms | **157 ms** | ✅ PASS |

The chip figure is the click → the chip's `aria-current` moving to the new filter,
which is the moment the refined result set has landed. `useTransition` keeps the old
list visible in the meantime, so this is the perceived latency rather than a blank
gap.

### 4.3 First-load JS — **one budget missed, cause documented**

| Route | Budget | Measured (gzip) | Verdict |
|---|---|---|---|
| Browse `/` | < 150 KB | **232.8 KB** | ❌ FAIL |
| Editor `…/edit` | < 320 KB | **471.9 KB** | ❌ FAIL |

**The browse budget is unreachable on this framework version.** To separate the
application's code from the framework's, the same script was run against the
**built-in 404 page** — a route that renders no application feature at all:

| Page | Chunks | First-load JS (gzip) |
|---|---|---|
| **404 (`/_not-found`)** — framework floor | 11 | **211.9 KB** |
| Browse `/` | 14 | 232.8 KB |
| Editor `…/edit` | 14 | 471.9 KB |

The framework floor alone (211.9 KB) exceeds the 150 KB budget by 41%. `react-dom`
is 71.4 KB gzip in a single chunk and React's scheduler plus the Next.js runtime
another 33.7 KB. The application's own contribution to the browse route is therefore
**~21 KB**, and the budget was set for a smaller React/Next baseline than the pinned
versions ship. No dependency was added or removed to chase it — the brief forbids
exactly that ("Adding a caching layer or a new dependency is a post-MVP decision").

**The guarantee the budget exists to protect still holds.** `architecture.md` §9.3
requires the editor to stay out of the browse route's first-load JS, and it does:
the browse route loads 14 chunks, and the editor adds exactly **two** — a 239.5 KB
gzip `@uiw/react-md-editor` chunk plus a 2.3 KB helper. Nothing in the served `/`
HTML references the editor. This is the `next/dynamic` + `ssr: false` guarantee from
iteration 6.3, re-confirmed here.

**Verdict.** Records as a **documented miss** in `docs/decisions-log.md` §5.1, with
the measured framework floor as the cause. The editor stays out of the browse route,
which was the budget's actual engineering requirement.

---

## 5. Security checklist results

One row per threat in `architecture.md` §13.2. Each has a command or an inspection.

| # | Threat | Verification command / inspection | Result |
|---|---|---|---|
| 1 | **Stored XSS via Markdown** | `grep -rn "dangerouslySetInnerHTML" src/` → **0 matches** (only two comments explaining its absence). `grep -rn "rehype-raw" src/` → **0 code matches** (only comments explaining the exclusion). The `article-body` test asserting `<script>` is not parsed passes. | ✅ PASS |
| 2 | **SQL injection** | `grep -rn "sql.raw" src/` → **1 match**, a comment in `search-index.ts` saying the raw path is *not* used. `FTS5_DDL` is a compile-time constant with no interpolation; every value flows through a parameterized template. | ✅ PASS |
| 3 | **FTS5 query injection / DoS** | The `toFtsQuery` suite (10 cases in `fts.test.ts`) passes. Live: `curl "…/api/search?q=%22+AND"` → **HTTP 200**, not 500. | ✅ PASS |
| 4 | **CSRF** | Every mutating route handler calls `assertSameOrigin`: `articles/route.ts:71` (POST), `articles/[idOrSlug]/route.ts:102` (PATCH) and `:157` (DELETE), `categories/route.ts:43` (POST), `test/reset/route.ts:37` (POST). All also call `assertJsonContentType`. Server Actions rely on Next.js origin validation. | ✅ PASS |
| 5 | **Path traversal / file exposure** | `data/` is outside `public/` and never served. `grep -rn "DATABASE_FILE" src/` → originates only from `lib/env.ts` (Zod-validated `process.env`) and is read in `server/db/client.ts`; **never** from request input. | ✅ PASS |
| 6 | **Sensitive data in logs** | `grep -rn "bodyMd" src/server/logger.ts` → **0 matches**; article bodies are never passed to a logger. Confirmed by the action test from iteration 6.1. | ✅ PASS |
| 7 | **Clickjacking / MIME sniffing** | `curl -I http://127.0.0.1:3000/` returns: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a CSP including `frame-ancestors 'none'`. | ✅ PASS |
| 8 | **Dependency vulnerabilities** | `npm audit --audit-level=high` → exit **0**; 4 moderate dev-only advisories, **0 high/critical**. | ✅ PASS |
| 9 | **Untrusted article size** | Hand-crafted `POST /api/articles` with a 200,001-character body → **HTTP 422** with `errors: [{ path: 'bodyMd', message: 'Article body is too large (200,000 character limit).' }]`. The `articleCreateSchema` limits (200,000 / 200 / 300) are enforced server-side. | ✅ PASS |
| 10 | **Test endpoint exposure** | `curl -X POST http://127.0.0.1:3000/api/test/reset` without `E2E_TEST_MODE=1` → **HTTP 404 with a 0-byte body**. | ✅ PASS |

**All ten rows verified.**

### 5.1 The one accepted gap — no authentication

`curl` can read every article and `PATCH` every article on the running server with
no credential of any kind. This is **not an oversight**: it is `architecture.md`
§16.1 A1 and D19, grounded in the brief's *"Basic security assumptions only; do not
require enterprise auth unless later specified."*

**Stated bound:** this is an **internal-network-only deployment requirement**. Every
article is readable and editable by anyone who can reach the app. Exposing it to the
public internet makes every article writable by anyone who finds the URL.

**Retrofit path:** `architecture.md` §15.2 (add auth, `users`/`sessions` tables,
`created_by`/`updated_by` FKs, a `src/proxy.ts` redirect, and enforcement in the
repository layer). Auth is an added predicate in existing queries — the
browse/search/edit architecture does not change. Recorded in
`docs/decisions-log.md` §5.2.

---

## 6. Accessibility and contrast results

### 6.1 Contrast — re-verified against the shipped CSS in both themes

`node scripts/contrast-check.cjs` parses the `oklch()` tokens from the shipped
`src/app/globals.css` and computes every pair in `design-spec.md` §9.1 from the sRGB
values. The script reproduces the spec's own figures exactly where they are correct
(e.g. white-on-accent = 5.47:1 in both the spec and the computation), which is what
makes its two disagreements meaningful.

**Three findings.**

1. **A real defect, fixed (I8-1).** In dark mode, `--danger` (L=0.55) is lighter than
   every dark surface, so **no** background could bring `text-danger` to 4.5:1 — it
   measured 3.45:1 on `--surface` and 2.69:1 on `--danger-soft`. That is a genuine AA
   failure on every error message, form-validation hint, and destructive-menu item in
   dark mode. The fix applies the design system's own UX16 pattern (a fill token and
   a text token) to the danger family: a new `--danger-ink` gives **7.52:1** on
   `--surface` and **5.85:1** on `--danger-soft`, and all 14 `text-danger` usages were
   switched to it. `bg-danger text-danger-on` still uses `--danger`.
2. **A spec-table error (I8-2).** The light-theme `--danger-on` on `--danger` row
   says 6.08:1; the specified colours give **5.44:1**. Still above 4.5:1, so no colour
   changed.
3. **A spec-table error (I8-3).** The dark-theme `--danger` on `--danger-soft` row
   says 5.85:1; the specified colours give **2.69:1**. Covered by the I8-1 fix.

After the fix, **all pairs verify** in both themes. The one remaining below-AA pair
is the accepted `--ink-subtle` tradeoff below.

| Theme | Pairs checked | Result |
|---|---|---|
| Light | 17 | All pass except `--ink-subtle` on `--surface` (4.22:1 — accepted, UX15) |
| Dark | 16 | All pass |

### 6.2 The `--ink-subtle` tradeoff is confirmed bounded

`--ink-subtle` on `--surface` in light mode measures **4.22:1**, below the 4.5:1
normal-text threshold. `design-spec.md` UX15 accepts this and restricts the token to
**12px meta text that is duplicated elsewhere** — the card meta line's category and
timestamp, both of which also appear on the detail page, with the timestamp carrying
a `title` with the absolute date. No unique information rides on the token.
Verification confirms the shipped value and the restricted usage. Recorded in
`docs/decisions-log.md` §5.3.

### 6.3 axe smoke — clean on the three primary routes

`node scripts/a11y-signals.cjs` runs `@axe-core/playwright` with `wcag2a` +
`wcag2aa` (and `color-contrast` disabled, per `design-spec.md` §9.4 — §6.1 is its
manual companion):

| Route | Violations |
|---|---|
| `/` | **0** |
| `/search?q=deploy` | **0** |
| `/articles/deploy-guide-1` | **0** |

**This is smoke coverage, not a full audit.** It catches a missing label, a missing
landmark, or ARIA misuse on three routes. It does **not** include screen-reader
testing, keyboard-only traversal of every flow, 200% zoom, or reflow at 320px, all of
which the brief places outside MVP scope. See §9.

### 6.4 Structural checks — all four routes

`node scripts/a11y-structural.cjs`. Landmarks are counted by **role**, since a
`<header>` inside `<article>` maps to `generic`, not `banner` (HTML-AAM).

| Check | `/` | `/search` | `/articles/[slug]` | editor |
|---|---|---|---|---|
| Exactly one `banner` | ✅ | ✅ | ✅ | ✅ |
| Exactly one `main` | ✅ | ✅ | ✅ | ✅ |
| Exactly one `contentinfo` | ✅ | ✅ | ✅ | ✅ |
| Every `nav` labelled | ✅ (Main, Pagination) | ✅ (Main, Pagination) | ✅ (Main, Breadcrumb, On this page) | ✅ (none present) |
| Exactly one `h1` | ✅ | ✅ | ✅ | ✅ |
| No heading level skipped | ✅ | ✅ | ✅ | ✅ |
| No `tabIndex` > 0 | ✅ | ✅ | ✅ | ✅ |
| First tab stop is the skip link | ✅ | ✅ | ✅ | ✅ |

**Three defects were found here and fixed (I8-4, I8-5, I8-6).** The browse and search
routes skipped `h1 → h3`; the editor routes had no `h1` and no `contentinfo`. All
three are now conformant. `grep -rn "tabIndex" src/` shows only `-1` values in
component code, plus the one `tabIndex: 0` on a fenced `<pre>` in `ArticleBody` —
which is a *focusable scroll region*, not a positive tab order, and is the remedy axe
requires for `scrollable-region-focusable` (iteration 7, §3.2 of
`docs/iteration-7-summary.md`).

### 6.5 Reduced motion

With `reducedMotion: 'reduce'`, **48 elements with a transition** were inspected and
every computed `transition-duration` was `1e-05s` (0.01 ms). The
`prefers-reduced-motion` block in `globals.css` collapses them as `design-spec.md`
§9.4 requires.

### 6.6 Colour is never the only signal

| Rule | Result |
|---|---|
| Draft/archived carry a **text badge**, never a colour-only dot | ✅ `Draft` badges render as text |
| Search matches use `<mark>` (background **and** native semantics) | ✅ 40 `<mark>` elements on `/search?q=deploy` |
| The active TOC item has a **left border and `aria-current`** | ✅ `aria-current="true"` with a 2px border |
| Errors carry an icon, text, and `aria-invalid` | ✅ (unit-covered; `field.tsx` sets `aria-invalid`, the form renders an `AlertTriangle` with text) |

---

## 7. Responsive matrix results

`node scripts/responsive-matrix.cjs` walks the six widths in `design-spec.md` §6.2
and §13. Playwright's own suite covers 1280×800 and 834×1112 only, so this is the
manual pass `docs/backlog.md` B11 assigns to iteration 8.

| Width | Sidebar | H-overflow | Filter chips | Pager numbers | Editor | Touch ≥44 | TOC |
|---|---|---|---|---|---|---|---|
| **360** | hidden ✅ | 0 ✅ | 2 rows ✅ | collapsed ✅ | tabbed ✅ | — | hidden ✅ |
| **768** | hidden ✅ | 0 ✅ | 1 row ✅ | numbered ✅ | side-by-side ✅ | — | hidden ✅ |
| **834** | hidden ✅ | 0 ✅ | 1 row ✅ | numbered ✅ | side-by-side ✅ | **0/33 under 44px** ✅ | hidden ✅ |
| **1024** | visible ✅ | 0 ✅ | 1 row ✅ | numbered ✅ | side-by-side ✅ | — | hidden ✅ |
| **1280** | visible ✅ | 0 ✅ | 1 row ✅ | numbered ✅ | side-by-side ✅ | — | visible ✅ |
| **1440** | visible ✅ | 0 ✅ | 1 row ✅ | numbered ✅ | side-by-side ✅ | — | visible ✅ |

- **Sidebar** visible only at ≥1024px; **TOC** only at ≥1280px and only with ≥2
  headings (the detail fixture has 6).
- **No horizontal overflow at 360px** (`scrollWidth - innerWidth = 0`).
- **Touch targets:** seven header controls were below the 44px floor at 834px and
  were fixed by applying the `.kb-touch` hit-area expansion systematically
  (`docs/decisions-log.md` I8-7). The script asserts the expansion rule ships with
  the documented `inset: -6px 0` and measures each control with it applied; the
  browse route now reports **0 of 33 controls under 44px**.

### 7.1 Component state matrix — all 20 rows

`design-spec.md` §11's 20 rows, verified in both themes. Evidence is
`docs/screenshots/**` where a visual check is the artefact, and the named unit test
where the state is programmatically asserted.

| # | Component | Verification | Both themes |
|---|---|---|---|
| 1 | Button (5 variants) | `ui/button.test.tsx` (6 cases) + screenshots 01/04/07 | ✅ |
| 2 | Input / Textarea | `article-form.test.tsx`; screenshot 04 | ✅ |
| 3 | Select | `filter-bar.test.tsx`; screenshots 01/04 | ✅ |
| 4 | Field (hint / error / required) | `ui/field.test.tsx` (6 cases); screenshot 05 | ✅ |
| 5 | SearchInput (empty → typing → filled → clear) | `search-input.test.tsx` (12 cases) | ✅ |
| 6 | ArticleCard (draft/archived, truncation, excerpt fallback) | `article-card.test.tsx` (8 cases); screenshot 01 | ✅ |
| 7 | Sidebar row (active/count/zero) | screenshot 01; `app-shell` renders counts | ✅ |
| 8 | Filter chip (selected/disabled) | `filter-bar.test.tsx`; screenshot 01 | ✅ |
| 9 | Pagination (first/middle/last/single/disabled) | `pagination.test.tsx` (10 cases); screenshot 01 | ✅ |
| 10 | TOC (hidden/2/10/active/scrolled) | screenshot 03; §7 matrix | ✅ |
| 11 | Markdown body (h1–h4, lists, task list, table, quote, code, link, hr) | `article-body.test.tsx` (9 cases); screenshot 03 | ✅ |
| 12 | Status pill (saved/dirty/saving/failed) | `article-form.test.tsx`; screenshot 04 | ✅ |
| 13 | Conflict banner (visible/focused/reload-open/copied) | `conflict-banner.test.tsx` (7 cases); screenshot 05 | ✅ |
| 14 | Toast (success/error/undo/dismiss) | `article-form.test.tsx`; screenshot 04 | ✅ |
| 15 | Dialog (open/trap/escape/scroll) | screenshot 07 (archive confirm) | ✅ |
| 16 | Empty states (5) | `empty-states.test.tsx` (8 cases); screenshots 06-* | ✅ |
| 17 | Skeleton (list/detail/editor/TOC) | `loading.tsx` files; screenshot 04 editor loading region | ✅ |
| 18 | Error panel (digest + retry) | `(shell)/error.tsx`; route-level boundary | ✅ |
| 19 | 404 (global + missing article) | screenshot 10 | ✅ |
| 20 | Progress bar (during transition) | `progress-bar.tsx`; visible during chip navigation | ✅ |

Screenshots are captured in both themes wherever the design differs
(`scripts/screenshots.cjs`), which is all rows except the archive dialog (theme-
independent, captured once).

---

## 8. Walkthrough — browse → search → edit → reload

Followable without the app running, referencing the committed screenshots in
`docs/screenshots/`.

1. **Browse.** Start at `/`. [`01-browse-light.png`](./screenshots/01-browse-light.png)
   (and `-dark`) show the three-region shell: the 240px category sidebar on the left
   with per-category counts, the article list in the middle (`7 published`), the
   filter bar with category chips and the Status/Sort selects above the rows, and the
   numbered pager below. Each row carries its title, a two-line summary, and a 12px
   meta line (category · relative timestamp).

2. **Search.** Type `deploy` in the header field and press Enter — the URL becomes
   `/search?q=deploy`. [`02-search-light.png`](./screenshots/02-search-light.png)
   shows `3 results for "deploy"` in the live region, every matching term wrapped in
   a `<mark>` highlight, and the matching body snippet beneath each title. The count
   and the rows arrive together, so a screen reader never hears a number describing
   results it cannot see.

3. **Open and read.** Click the top result. [`03-detail-light.png`](./screenshots/03-detail-light.png)
   shows the breadcrumb, the article `h1`, the meta line with an absolute-date
   `title`, the rendered Markdown body (headings, a fenced bash block, a table, and a
   task list all as real elements), the `On this page` TOC in the right column at
   ≥1280px, and the collapsed `History` block beneath the body.

4. **Edit.** Click `Edit`. [`04-editor-light.png`](./screenshots/04-editor-light.png)
   shows the **focused shell** — no sidebar, no TOC, no header search — with the
   status strip (`← Cancel`, the title, the save-status pill, `Save changes`)
   replacing the standard header, and the Markdown editor beside a **live preview**
   rendered through the same `ArticleBody` pipeline that renders the published page.

5. **Save and confirm persistence.** Change the body and save. The status pill cycles
   `Unsaved changes` → `Saving…` → `Saved`, a success toast appears, and the page
   redirects to the article. **Reload the page** — the change is still there, and the
   new entry appears at the top of `History`. This is the acceptance criterion from
   `architecture.md` §18.

6. **The conflict path.** [`05-conflict-banner-light.png`](./screenshots/05-conflict-banner-light.png)
   shows what happens when the article changed underneath you: the banner replaces the
   top of the form, receives focus, and offers `Copy my text` (so the reload can never
   silently discard work) and `Reload` (which opens a confirm before discarding).

7. **The zero-result paths.** [`06-empty-search-light.png`](./screenshots/06-empty-search-light.png),
   [`06-empty-filter-light.png`](./screenshots/06-empty-filter-light.png),
   [`06-empty-category-light.png`](./screenshots/06-empty-category-light.png),
   [`06-empty-no-articles-light.png`](./screenshots/06-empty-no-articles-light.png),
   and [`06-empty-no-categories-light.png`](./screenshots/06-empty-no-categories-light.png)
   are the five canonical empty states, each with its exact copy and the CTA that
   actually resolves the situation.

8. **The secondary affordances.**
   [`07-archive-confirm-light.png`](./screenshots/07-archive-confirm-light.png) is the
   archive confirmation dialog — reachable only through the `⋯` overflow menu, so the
   destructive action never competes with `Edit`.
   [`08-palette-light.png`](./screenshots/08-palette-light.png) is the ⌘K command
   palette showing ranked results for `deploy` from `/api/search`, with the `See all
   results` row to the full page.

9. **The tablet shell.** [`09-tablet-drawer-light.png`](./screenshots/09-tablet-drawer-light.png)
   is the 834×1112 layout with the off-canvas navigation drawer open — the sidebar
   becomes a Radix dialog below 1024px, trapping focus and closing on `Escape`.

10. **The not-found path.** [`10-not-found-light.png`](./screenshots/10-not-found-light.png)
    is what a missing slug renders — the segment's own `not-found.tsx`, never the
    generic 404.

---

## 9. Known limitations

Drawn from `architecture.md` §15.1 and §9.2. Each is an accepted tradeoff, not a bug.

| Limitation | Bound / consequence |
|---|---|
| **No stemming or typo tolerance** | FTS5 prefix matching finds `deploy*` but not a misspelling. Phase 6 in `docs/future-work.md`. |
| **Offset pagination** | Fine to ~50,000 articles; keyset pagination is the fix beyond that (§15.1). |
| **Single-node ceiling** | SQLite is one file, so the app is one process. Still far above the brief's ~100 concurrent users; Postgres is the path. |
| **No autosave** | Deliberate (UX7): autosave creates revision noise and races optimistic concurrency. A `beforeunload` guard plus revisions covers lost work. |
| **Markdown syntax is visible to non-technical authors** | Deliberate (D5): no lossy HTML↔Markdown conversion, and search/diffs stay clean. Mitigated by the live preview and toolbar. |
| **`script-src 'unsafe-inline'`** | Required by Next.js's inline bootstrap; no third-party scripts exist. Nonce-based CSP via `src/proxy.ts` is Phase 2 in `docs/future-work.md`. |
| **No authentication** | Internal-network-only deployment. `docs/decisions-log.md` §5.2; retrofit path `architecture.md` §15.2. |
| **History is view-only** | No diff or restore UI (a non-goal, §16.2). Revisions make every save recoverable manually. |
| **`--ink-subtle` at 4.22:1 in light mode** | Restricted to redundant 12px meta text; bounded by UX15. `docs/decisions-log.md` §5.3. |
| **First-load JS over the browse budget** | Unreachable on the Next.js 16 floor (211.9 KB on a zero-feature 404 page). `docs/decisions-log.md` §5.1; §4.3 above. |

## 10. What was deliberately not tested

Quoting the brief's testing scope verbatim:

> **MVP**: Unit tests for core logic AND basic E2E/integration testing (e.g.,
> Playwright) for critical user journeys (browse -> search -> edit).
> **Not MVP**: Full accessibility audits or exhaustive E2E edge-case coverage.

Expanded by `docs/backlog.md` §1.3, the following are **out of scope** and are
verified only as smoke coverage or not at all:

- **Full accessibility audits.** No screen-reader testing, no keyboard-only
  traversal of every flow, no 200% zoom or 320px reflow testing, no formal WCAG 2.1
  AA certification. The axe run in §6.3 is smoke coverage on three routes and is
  stated as such.
- **Exhaustive E2E edge-case coverage.** No specs for validation permutations,
  pagination boundaries, revision diffing, category CRUD, theme switching, or
  browsers beyond Chromium and WebKit.
- **Load testing.** The brief's "~100 concurrent users" was not simulated; the
  budgets in §4 were measured as single-request latencies against a realistic
  2,000-article corpus.
- **Production deployment verification.** Every measurement is against a local
  `next start`; no CDN, proxy, or TLS termination was involved.

---

## 11. Summary

| Brief's required deliverable | Where |
|---|---|
| 1. Product summary | `README.md`; `docs/backlog.md` §1 |
| 2. Scope and feature prioritization | `docs/backlog.md` §1 |
| 3. Technical architecture spec | `docs/architecture.md` |
| 4. UX / design direction spec | `docs/design-spec.md` |
| 5. Implementation backlog / execution plan | `docs/backlog.md` + `docs/iterations/*` |
| 6. Working application | this repository |
| 7. **Tests and verification notes** | **this document** |
| 8. Short decisions log | `docs/decisions-log.md` + `docs/backlog.md` §5 |
| *(stretch)* Data model sketch | `docs/backlog.md` §6; `README.md` "Data model" |
| *(stretch)* Deployment / local run notes | `README.md` "Deployment and local run notes" |
| *(stretch)* Screenshots / walkthrough notes | `docs/screenshots/`; §8 above |
| *(stretch)* Future work list | `docs/future-work.md` |

# Decisions log

**Status:** append-only long-form log (`architecture.md` §5.1).
**Date:** 2026-09-13
**Sources of truth:** [`architecture.md`](./architecture.md),
[`design-spec.md`](./design-spec.md), [`backlog.md`](./backlog.md).

This file is **append-only**: entries are added, never rewritten, so the history of
a decision survives the code changing underneath it. It deliberately does **not**
reproduce the two existing decision tables — they are referenced, not duplicated, so
there is one place to edit each decision.

## How to read this log

1. **§1–§3 are pointers.** The architecture decisions (D1–D26), the design
   decisions (UX1–UX22), and the backlog's sequencing decisions (B1–B12) live in
   their own documents. This log records only what those tables do not cover.
2. **§4 is the implementation record.** Every deviation from the architecture or
   design spec that occurred during iterations 1–7 is here, with what was specified,
   what was built, why, and the consequence.
3. **§5 is the accepted gaps.** The two places the shipped system knowingly does
   not meet a nominal target, stated with their bounds.

---

## 1. Architecture decisions — D1–D26

Recorded in [`architecture.md` §17](./architecture.md#17-decisions-log). Reproduced
here by reference only. The set covers framework and runtime (D1, D23), storage and
ORM (D2, D3), the search index (D4, D21), the editor and Markdown pipeline (D5, D6),
the mutation/read split (D7–D9), validation and concurrency (D10–D12), the styling
system (D15, D16), the test toolchain (D17, D18), the absence of auth (D19),
persistence and CI choices (D20, D22, D24), and the two structural decisions that
shape the code layout (D25 repository factories, D26 the `server-only` exemption).

The three that most constrain day-to-day work:

- **D26** — `server-only` is omitted from exactly three modules (`db/create.ts`,
  `db/search-index-ddl.ts`, `lib/env.ts`) so `tsx` scripts and Vitest can import
  them. The boundary is enforced by the production build and the ESLint
  `no-restricted-imports` rule instead.
- **D25** — repositories are factories taking a `Database` handle, which is what
  makes "which database did this query hit?" explicit and lets tests run against a
  temp file with zero mocking.
- **D21** — the FTS5 virtual table and its triggers are applied by an idempotent
  bootstrap function, not a Drizzle migration, because `drizzle-kit` silently skips
  SQL files without a journal entry.

## 2. Design decisions — UX1–UX22

Recorded in [`design-spec.md` §12](./design-spec.md#12-decisions-log). Reproduced
here by reference only. The five that drive the most UI structure:

- **UX2** — row list, not a card grid, for ~40% more content per viewport.
- **UX6** — a focused editor shell with no sidebar, TOC, or header search.
- **UX7** — explicit save with a `beforeunload` guard; no autosave.
- **UX15** — accept `--ink-subtle` at 4.22:1 in light mode, restricted to redundant
  12px meta text (see §5.2 below).
- **UX20** — five empty states, because a filtered-empty list is not the same fact as
  "no articles yet".

## 3. Sequencing decisions — B1–B12

Recorded in [`backlog.md` §5](./backlog.md#5-decisions-log), each with the
alternatives considered and the rationale. Summarised here for completeness:

| # | Decision | Short rationale |
|---|---|---|
| B1 | **8 iterations**, not 4 or 12 | `architecture.md` §18 is a file-level build order; several of its steps leave the app unrunnable. 8 maps to testable milestones. |
| B2 | Data layer **split across iterations 1 and 3** | Iteration 1 proves the toolchain end to end; repositories depend on types and schemas that are themselves unit-testable work. |
| B3 | Unit tests **in the same task as the code** (iterations 2–3) | Pure functions and real-DB repositories; co-locating catches the FTS-trigger and transaction bugs a later pass would miss. |
| B4 | **All E2E in iteration 7** | Playwright specs mutate shared state and need the reset endpoint, the health endpoint, and all three flows present. |
| B5 | **Browse + detail in one iteration** (4) | They share `ArticleCard`, `ArticleHeader`, `ArticleBody`, and the shell; splitting leaves a list linking to pages that 404. |
| B6 | F4/F5 UI **folded into 4, 5, 7, 8** | The category sidebar and status badge are shell/list/detail concerns; a standalone taxonomy screen has no articles to show. |
| B7 | **Iteration 8 is not optional** | The brief lists the verification notes, decisions log, and screenshots as deliverables; "if there's time" is how they get dropped. |
| B8 | `POST /api/test/reset` **in iteration 6** | It is a write endpoint depending on the fixture and the article/category repositories; iteration 5 is read-only. |
| B9 | Component tests **folded into iterations 5 and 6** | The components they cover (`SearchInput`, `ArticleForm`) are authored there. |
| B10 | **Exactly the five E2E journeys** from §11.4 | The brief scopes out exhaustive E2E edge-case coverage; adding journeys would violate the testing scope. |
| B11 | Responsive verification **Playwright *and* a manual matrix walk** | Playwright covers only 1280×800 and 834×1112; 360/768/1024/1440 need the manual pass, which iteration 8 performs. |
| B12 | Perf budgets **measured against a 2,000-article dataset** | Measuring against the 9-article seed would prove nothing. |

---

## 4. Decisions made during implementation

Iterations 1–7 each ended with their own summary, and the deviations they recorded
are consolidated here. **There were deviations** — this is not an empty section.

### 4.1 Iteration 1 — toolchain and database

| ID | Specified | Built | Why | Consequence |
|---|---|---|---|---|
| **I1-1** | ESLint 10, per `architecture.md` §3.3 | **ESLint 9.39.5** | `eslint-config-next@16.3.4`'s plugin set (`eslint-plugin-react`, `-hooks`, `-jsx-a11y`, `-import`) declares a peer ceiling of ESLint 9.7; its bundled Babel parser returns a scope manager ESLint 10 rejects. `eslint-config-next@16.3.5` has an identical dependency set. | Lint runs on the newest version the Next.js config supports. Revisit when `eslint-plugin-react` widens its range. |
| **I1-2** | `drizzle/0000_init.sql` generated then hand-edited to add the `status` `CHECK` | Generated **and** hand-edited; the snapshot regenerated so `drizzle-kit` does not re-emit it | Adding the constraint before the first `db:migrate` avoids a table rebuild later (`architecture.md` §8.5). | The shipped `0000_init.sql` carries `` CHECK (`status` IN ('draft','published','archived')) ``. |
| **I1-3** | `scripts/**` and `src/test/**` are outside the `no-restricted-imports` rule | Exempted | `architecture.md` §14.1 itself requires `db-setup.ts` to import `drizzle-orm` and its migrator; neither path can reach a client bundle. | The rule's stated purpose (D26) is preserved and verified with a failing-import probe. |

### 4.2 Iteration 3 — repository layer

| ID | Specified | Built | Why | Consequence |
|---|---|---|---|---|
| **I3-1** | `architecture.md` §8.7 step 3 numbers the post-update revision `row.version` and calls it the *previous* state | Revision `#N` is the state as of version `N`: `revision_number` always equals `version` | §8.7 read literally is unimplementable — `createArticle` already wrote revision 1 for version 1, so a first save would insert a second row with `revision_number = 1` and trip the `(article_id, revision_number)` unique index. The model built is the one the seed and `design-spec` §3.4 already assume. | The pre-save state stays recoverable as revision `#version`, so §9.4's real requirement holds. |

### 4.3 Iteration 6 — editing

| ID | Specified | Built | Why | Consequence |
|---|---|---|---|---|
| **I6-1** | `rehype-prism-plus` in the editor's dependency list (`architecture.md` §13.1's "editor route" budget comment) | **Not used**; the editor imports `@uiw/react-md-editor/nohighlight` and renders its preview through this app's own `ArticleBody` | The default entry point bundles Prism *and* renders the preview through `rehype-raw`, which parses embedded HTML — flatly forbidden by §6.7 and D6. Reusing `ArticleBody` makes preview/render parity structural rather than a claim about two similar configs. | The editor route carries no Prism (~40 KB gz saved) and no raw-HTML path exists in the preview. |

### 4.4 Iteration 7 — E2E and CI

| ID | Specified | Built | Why | Consequence |
|---|---|---|---|---|
| **I7-1** | `workers: process.env.CI ? 1 : 2` (§11.4) | **`workers: 1` everywhere** | §9.7's per-spec reset is destructive, not merely contended: it truncates the single shared `kb.e2e.db`, so with two workers one spec's reset deletes the row another is asserting on. Observed directly in `edit.spec.ts`. | Parallelism would need one database per worker; serialising costs seconds and removes the failure class. |
| **I7-2** | `next.config.ts` as quoted in §12.6 | Added `allowedDevOrigins: ['127.0.0.1']` | Next.js 16 blocks cross-origin requests to dev-only assets and derives "same origin" from `localhost`; Playwright drives the app at `127.0.0.1:3100`. Without it, SSR looked correct while **every client interaction was silently dead**. | Dev-only; no effect on a production build. |
| **I7-3** | Reset/empty the E2E database through the app | `e2e/helpers/empty-db.ts` shells out to a `scripts/**` `tsx` script | No API can reach "zero articles" (`DELETE` is a soft archive), and a new destructive endpoint is unrequested surface. `scripts/**` is where SQL already lives, so the driver stays behind the ESLint-protected boundary. | The target file is hard-coded to `kb.e2e.db` and never read from the environment; the caller must pass the `E2E_TEST_MODE` sentinel. |
| **I7-4** | — | `e2e/helpers/hydration.ts` waits on React's `__reactFiber$` marker | `goto` resolves before React attaches handlers; filling a controlled input in that window is silently discarded, deterministically so on WebKit. | A fixed sleep would rot; the fiber key is React's own signal that handlers are mounted. |
| **I7-5** | Fixture assertions "documented in a comment at the top of `seed.json`" (task 7.1) | A `_comment` **JSON string field**, first in the object, plus a machine-readable `assertions` object | `//` comments break `JSON.parse`, editors, and every consumer of a `.json` file — it failed immediately when tried. | The specs *read* the assertion values rather than restating them, so a seed change cannot drift silently. |
| **I7-6** | — | Four a11y defects fixed in `ArticleBody` and the editor toolbar | The brief says to fix bugs the suite reveals; all four are genuine WCAG 2.1 AA failures that jsdom cannot see. | Each fix is minimal and now has a unit test. |
| **I7-7** | — | `expectNoA11yViolations` waits for a non-empty `document.title` | Next.js streams the title after the first shell, so analyzing immediately tests a transient document and reports a false `document-title`. | Disabling the rule would have hidden a real failure mode on every route, not just the edit page. |
| **I7-8** | — | `edit` and `empty-states` specs run `mode: 'serial'` | Both do multi-step work on shared mutable state (save-then-reload; empty-the-database). | §9.7's own documented isolation pattern. |

### 4.5 Iteration 8 — hardening and verification

Iteration 8 is a verification pass, and the brief says: *"If a verification pass
finds a defect, fix it minimally and record the fix."* Seven were found.

| ID | Found by | What was wrong | Fix | Consequence |
|---|---|---|---|---|
| **I8-1** | `scripts/contrast-check.cjs` | **Dark-mode danger text could never reach 4.5:1.** `--danger` (L=0.55) is lighter than every dark surface, so `text-danger` on `--surface` was 3.45:1 and on `--danger-soft` 2.69:1. This is a real AA failure on every error message, form-validation hint, and destructive-menu item in dark mode. | Added a `--danger-ink` **text** token (dark: `oklch(0.74 0.15 27)` = 7.52:1 on surface, 5.85:1 on `--danger-soft`; light: identical to `--danger` at 5.36:1) and switched all 14 `text-danger` usages to `text-danger-ink`. `bg-danger text-danger-on` (the fill button) still uses `--danger`. | This applies **UX16's own existing pattern** — one token for fills, one for text — to the danger family, which had been given a single token. It is a product fix, not a test adjustment. |
| **I8-2** | `scripts/contrast-check.cjs` | The §9.1 table's **light-theme `--danger-on` on `--danger` row said 6.08:1**; the specified colours actually give 5.44:1 (still passing). | Recorded the corrected figure in the verification notes. | Spec-table arithmetic error; no colour changed. The pair still passes 4.5:1. |
| **I8-3** | `scripts/contrast-check.cjs` | The §9.1 table's **dark-theme `--danger` on `--danger-soft` row said 5.85:1**; the specified colours give 2.69:1. | Covered by the I8-1 fix; the table figure is corrected in the verification notes. | As above. The pair is only used by the non-text focus ring on the danger *fill*, which uses `--danger-on`. |
| **I8-4** | `scripts/a11y-structural.cjs` | **Heading order was skipped on the browse and search routes**: the page `h1` was followed by card `h3`s with no `h2` between, violating `design-spec.md` §9.4's "never skip a level". | Added the `sr-only` `h2` ("Articles" / "Results") that §9.4 already describes as the implicit section heading, in `browse-list.tsx` and `search-results.tsx`. | The outline is now `h1 → h2 → h3` on every browse-shaped route. §9.4 named this heading; it had simply not been rendered. |
| **I8-5** | `scripts/a11y-structural.cjs` | **The editor routes had no `h1` at all** — the focused shell rendered the title as a `<p>` and the outline began at the form's section headings. | Added the `sr-only` `h1` in the editor **content column** on both editor routes. | `design-spec.md` §2.1 says the `h1` "lives in the content column, never in the header", so it was placed there, not in the status strip. |
| **I8-6** | `scripts/a11y-structural.cjs` | **The editor routes had no `contentinfo` landmark**, so §9.4's "exactly one `contentinfo`" held on every route except the two editor ones. | Rendered the existing `Footer` in `EditorShell`. | The landmark contract is now identical on every route. |
| **I8-7** | `scripts/responsive-matrix.cjs` | **Seven header controls on touch viewports were below the 44px floor** §6.4 sets: the browse "New article" CTA, the mobile menu and search icon buttons, the theme toggle, and both filter `Select` triggers. Only the filter chips, pager, and editor toolbar carried the `.kb-touch` hit-area expansion. | Added `relative kb-touch` to the shared `Button` base in `ui/button.tsx` (fixing every button call site at once), and to `ThemeToggle` and `SelectTrigger`. | `design-spec.md` states the 44px floor as a blanket requirement ("All interactive controls") and the expansion as the mechanism; the fix applies the mechanism systematically. The browse route now reports 0 of 33 controls under 44px. |

**No behaviour changed beyond these seven fixes.** No budget was "fixed" by adding a
cache or a dependency (the brief forbids it); the one missed budget is recorded with
its cause in §5.1 and in `docs/verification-notes.md`.

---

## 5. Accepted gaps

Two places where the shipped system knowingly does not meet a nominal target. Both
are bounded and documented, not oversights.

### 5.1 First-load JS exceeds the browse-route budget on the Next.js 16 floor

**Stated bound.** The browse route's first-load JS is **232.8 KB gzip** against a
**150 KB** budget (`architecture.md` §13.1), and the editor route is **471.9 KB**
against **320 KB**.

**Why it is accepted.** The budget is unreachable on this framework version, not
merely unmet. Fetching every same-origin `<script>` from the **built-in 404 page** —
a route with no application code in it at all — totals **211.9 KB gzip across 11
chunks**. `react-dom` alone is 71.4 KB and React's scheduler/Next runtime another
33.7 KB. The application's own contribution to the browse route is therefore ~21 KB,
and the editor's is a single 239.5 KB `@uiw/react-md-editor` chunk. The budget was
set for a smaller React/Next baseline than the pinned versions ship.

**What the budget actually asks for still holds.** The route-level guarantee behind
the number — that the editor stays out of the browse route's first-load JS — is
verified: the browse route loads 14 chunks and the editor adds exactly two
(`2vh5wr-py1kt7.js`, the 239.5 KB editor bundle, and a 2.3 KB helper). The editor is
absent from `/`, and this remains the `next/dynamic` + `ssr: false` guarantee from
iteration 6.3.

**Consequence.** Reducing this requires either a smaller baseline (a framework
version bump) or an explicit post-MVP decision to drop a dependency; the brief
forbids adding a caching layer or a new dependency to chase a budget, so it is
recorded. Full evidence in `docs/verification-notes.md` §5.

### 5.2 No authentication in v1

**Stated bound.** **Every article is readable and editable by anyone who can reach
the app.** There is no login, no session, and no per-article authorization.

**Why it is accepted.** The brief says *"Basic security assumptions only; do not
require enterprise auth unless later specified."* Adding auth would consume a
significant share of a one-to-two-session budget, and `architecture.md` §16.1 A1
records it as a stated assumption rather than a gap discovered late.

**The deployment bound this creates.** The app **must be deployed on a trusted
internal network only.** This is not a soft recommendation: with no auth, exposing
it to the public internet makes every article writable by anyone who finds the URL.

**Retrofit path.** `architecture.md` §15.2 lists the exact steps (better-auth or
Auth.js, `users`/`sessions` tables, `created_by`/`updated_by` FKs, a `src/proxy.ts`
redirect, and enforcement in the repository layer). Auth is an added predicate in
existing queries — the browse/search/edit architecture does not change.

### 5.3 `--ink-subtle` at 4.22:1 in light mode

**Stated bound.** The light-mode pair `--ink-subtle` on `--surface` is **4.22:1**,
below the 4.5:1 AA threshold for normal text.

**Why it is accepted.** `design-spec.md` UX15 and §9.1 accept it deliberately and
**restrict it to 12px meta text that is duplicated elsewhere** — the card meta
line's category and timestamp also appear on the detail page, and the timestamp
carries a `title` with the absolute date. No unique information is carried by the
token, so no information is lost at 4.22:1. Darkening the token would collapse the
summary/meta hierarchy, which is the primary scannability mechanism.

**Verification.** `scripts/contrast-check.cjs` confirms the shipped value in both
themes and confirms it is used only on the meta line. See
`docs/verification-notes.md` §6.

---

## 6. What this log does not contain

- **D1–D26 and UX1–UX22 in full** — they belong to their source documents (§1, §2).
- **B1–B12 in full** — they belong to `backlog.md` §5 (§3 summarises them).
- **Per-iteration verification detail** — each iteration's `docs/iteration-N-summary.md`
  holds its own evidence; `docs/verification-notes.md` consolidates it.
- **Post-MVP plans** — `docs/future-work.md`, organised by phase.

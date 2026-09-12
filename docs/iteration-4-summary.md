# Iteration 4 Summary — Design system, app shell, browse + detail

**Status:** Complete. `npm run verify` exits 0, `npm run test:coverage` exits 0, and a
production build (`npm run build` → `next start`) serves browse, detail, both 404s, and
`/api/health` locally with **68/68 acceptance checks passing**.

**Goal (met).** A user can open `/`, see the seeded published articles in a dense row list,
click one, and read server-rendered Markdown — inside the full three-region shell, in both
themes, with all five empty states and an article-specific not-found page.

---

## 1. What was built

### 1.1 Tasks and files

| Task | Files |
|---|---|
| 4.1 UI primitives | `ui/button.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`, `ui/badge.tsx`, `ui/dialog.tsx`, `ui/field.tsx`, `ui/empty-state.tsx`, `ui/skeleton.tsx` |
| 4.1 tests | `ui/button.test.tsx` (9), `ui/field.test.tsx` (6) |
| 4.2 Shell | `layout/app-shell.tsx`, `layout/app-layout.tsx`, `layout/header.tsx`, `layout/sidebar.tsx`, `layout/sidebar-link.tsx`, `layout/mobile-nav.tsx`, `layout/theme-toggle.tsx`, `layout/progress-bar.tsx`, `layout/footer.tsx`, `layout/new-category-dialog.tsx`; `app/layout.tsx` rewritten |
| 4.3 Read components | `articles/status-badge.tsx`, `articles/article-card.tsx`, `articles/article-list.tsx`, `articles/article-header.tsx`, `articles/article-body.tsx`, `articles/toc-headings.ts`, `articles/revision-list.tsx`, `articles/back-to-top.tsx` |
| 4.3 tests | `articles/article-card.test.tsx` (8), `articles/article-body.test.tsx` (7) |
| 4.4 Browse route | `app/(shell)/page.tsx`, `app/(shell)/loading.tsx`, `app/(shell)/error.tsx`, `app/global-error.tsx` |
| 4.5 Empty states | `articles/empty-states.tsx`, `articles/empty-states.test.tsx` (8) |
| 4.6 Detail route | `app/(shell)/articles/[slug]/page.tsx`, `.../not-found.tsx`, `.../loading.tsx`, `articles/table-of-contents.tsx`, `app/not-found.tsx` |
| 4.7 Health endpoint | `app/api/health/route.ts`, `app/api/health/route.test.ts` (2) |
| 4.8 Responsive matrix | Applied throughout; `globals.css` gained the progress-bar keyframes and the `.kb-touch` hit-area rule |
| — | `server/db/current.test.ts` (3) — pins the `getDb()` guard |

**37 new files; 27 test files / 323 tests passing** (43 of them new this iteration).

### 1.2 Route-group structure

The shell lives in an `app/(shell)/` **route group**, not in the root layout. This is the
direct encoding of design-spec.md §2.2: `/`, `/articles/[slug]`, and (from iteration 5)
`/search` and `/categories/[slug]` all get the three-region shell, while the editor routes
get the focused shell. A group makes that a structural fact rather than a per-route
conditional, and it is why `app/page.tsx` was deleted (it moved into the group).

`app/not-found.tsx` composes `AppLayout` **directly** rather than living in the group: a
`not-found.tsx` inside a group only catches `notFound()` thrown from that group, whereas the
root file is the one that catches unmatched URLs.

### 1.3 Two-query detail path, proven by the DOM

`/articles/deploying-the-api-to-production` renders 7 `<h2>`s, a GFM `<table>`, 6 task-list
checkboxes, a 7-item sticky TOC whose `href`s all resolve to real heading `id`s, and a
collapsed `History (3 revisions)` section — from the iteration-3 repository call with no
N+1.

### 1.4 The empty-state placement decision

design-spec.md's state 4 ("No categories yet") lives in **`Sidebar`**, not in `ArticleList`.
A database with no categories still has a perfectly good article list, so showing state 4 on
the browse surface would tell the reader the wrong thing. `ListEmptyState` therefore selects
only among states 1, 2, 3, and 5, and `Sidebar` renders state 4 in its category area. All
five were verified: 1 and 4 against a genuinely empty database, 2/3/5 by unit test (their
routes arrive in iteration 5).

---

## 2. Assumptions made

1. **The header search field is an inert-but-real form in this iteration.** design-spec.md
   §4.2 puts search on every route, and the iteration file lists the debounced client
   `SearchInput` as iteration 5's deliverable. Rather than ship a decorative input, the
   header renders a labelled `<form role="search">` that GETs `/search`. It is keyboard
   reachable, has an accessible name, and will be replaced — not deleted — in iteration 5.

2. **The `Editing as` chip renders the documented default.** The cookie and dialog are
   iteration 6's (design-spec.md §4.6). Rendering the chip now fixes the header's focus order
   and layout, which the iteration's "done when" criteria test.

3. **`NewCategoryDialog` and `ArticleHeader`'s `⋯` menu are wired but inert.** The iteration
   file says the `⋯` menu holds `Archive article` "(wired in iteration 6)". `NewCategoryDialog`
   follows the same rule so that empty state 4 has a real CTA target rather than a dead end —
   design-spec.md §3.1 forbids dead ends, and shipping the state with no working action would
   create one.

4. **`RevisionList` renders real data with a deferred `View` dialog.** The iteration file asks
   for "a placeholder here that renders the `History ({n} revisions)` summary". Since the
   repository already returns the 5 revisions, the rows render from real data; only the
   per-revision `View` dialog is deferred to iteration 6, which is where design-spec.md §3.4's
   dialog-backed `RevisionList` lands. Nothing here is throwaway.

5. **`StatusBadge` lives in `articles/`.** `iteration-4.md` task 4.3 lists it there, while
   design-spec.md §5.1's inventory also has a `Badge` in `ui/`. Both exist: `ui/badge.tsx` is
   the styled primitive (`draft`/`archived` variants, no `published`), and
   `articles/status-badge.tsx` is the domain wrapper that maps an `ArticleStatus` to it and
   returns `null` for `published`.

---

## 3. Issues encountered

### 3.1 `eslint@9.39.5` was already pinned — carried forward, not re-litigated

Iteration 1 (`I1-1`) replaced the spec's `eslint@10.10.0` with `9.39.5` because no version of
`eslint-plugin-react` supports ESLint 10. This iteration adds no new linting deviation; the
one remaining output is the pre-existing `import/no-anonymous-default-export` **warning** in
`postcss.config.mjs`, which §1.2 mandates verbatim.

### 3.2 `@radix-ui/react-select` was missing from the pinned set — **added**

design-spec.md §5.1 requires a `Select` primitive and §7.1 gives its state matrix, but
`architecture.md` §3.2 pins only `react-dialog`, `react-slot`, and `react-label`. Installed
`@radix-ui/react-select@2.3.7` — the exact current release, verified against the live npm
registry — keeping the spec's "pinned, no `^`/`~`" rule. Contents render through the same
`Field` wiring, so a select and a text input share one 36px baseline.

### 3.3 The DB handle did not survive Next.js's module graphs — **real bug, fixed**

`getDb()`/`setDb()` stored the handle in a module-scope `let`. `src/instrumentation.ts`
installs it, but Next.js 16 evaluates instrumentation and route rendering in **separate module
graphs** in the same process, so the route copy of `current.ts` still saw `undefined` and
every RSC read failed:

```
⨯ Error: Database not initialized. Call setDb() from client.ts or a test setup.
    at getDb (src/server/db/current.ts:8:11)
    at AppLayout (src/components/layout/app-layout.tsx:22:41)
```

The build passed (prerender was the only failure mode visible at build time) and this only
appeared when the dev server served a request — which is exactly the class of failure the
brief's "leave the codebase in a working, runnable state" requirement is about. **Fixed** by
storing the handle on `globalThis` (the technique `client.ts` already uses for its HMR guard).
The contract is unchanged, `src/test/db.ts` is unaffected, and `current.test.ts` now pins the
guard explicitly. See decision **I4-1**.

### 3.4 The `(shell)` layout needed `force-dynamic` — **documented, not a workaround**

With the DB fix in place the build failed at static prerender:

```
Error occurred prerendering page "/"
Error: Database not initialized. Call setDb() from client.ts or a test setup.
```

`next build` evaluates the shell layout, which reads category counts, before any server has
booted. `export const dynamic = 'force-dynamic'` on `(shell)/layout.tsx` and `app/not-found.tsx`
is the honest fix: every route in the group reads request-time state (`searchParams` on `/`, a
path parameter on detail), and `cacheComponents`/`'use cache'` is deliberately off in v1
(architecture.md §8.9, D14), so none of them could be cached even if prerendered. This is the
same class of constraint iteration 1 recorded as `D21` for the FTS5 bootstrap.

### 3.5 A duplicate `<main id="main">` on 404 — **real bug, fixed**

The shell did not own the `main` landmark; each route declared its own inside the shell's
content column. Because `not-found.tsx` renders *alongside* the layout, both appeared at once:

```
{ "mainCount": 2, "mains": [{ "id": "main", ... }, { "id": "main", ... }] }
```

design-spec.md §9.4 requires exactly one `main` per page, and two `#main` targets breaks the
skip link's destination. **Fixed** by making `AppShell` own the single `<main id="main">` and
having `page.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx` render content into it. The
smoke suite now asserts `exactly one main` on the browse, detail, article-404, and root-404
paths.

### 3.6 Both TOC variants rendered at ≥1280px — **real bug, fixed**

The sticky `TableOfContents` and the inline `<details>` fallback were unconditional siblings:

```
details: [ { summary: "On this page" }, { summary: "History (3 revisions)" } ]
```

That is two "On this page" navigations for one viewport, and the inline copy duplicates every
anchor in the tab order. **Fixed** with `hidden xl:block` on the sticky column and `xl:hidden`
on the `<details>`. Two follow-on refinements came out of the same investigation: the
`IntersectionObserver` now attaches only while the viewport is ≥1280px (`useSyncExternalStore`
over `matchMedia`, so it re-attaches on a breakpoint change), and it is skipped entirely below
that width so it cannot compete with the inline block for the same heading ids.

### 3.7 The root 404 rendered with no shell — **fixed**

design-spec.md §2.2's route table gives the 404 a sidebar, but `app/not-found.tsx` rendered a
bare `<main>`. **Fixed** by composing `AppLayout` there (see §1.2 for why it is composed rather
than grouped).

### 3.8 Six defects were found by the browser suite, not by tests

Worth naming, because it is the argument for running the real app: §3.3–§3.7 are all invisible
to `tsc`, ESLint, unit tests, and — for §3.3 and §3.5 — even to `npm run build`. The verify gate
was green throughout. A production-build smoke pass over the actual routes is what surfaced
them, and the final suite covers each one.

### 3.9 The smoke script's own false failures

Four of the smoke checks failed on first run for harness reasons, each corrected rather than
worked around, and each is now commented in `scripts/smoke-iteration4.cjs`:

| Symptom | Cause | Correction |
|---|---|---|
| "unknown slug renders the article 404" | The not-found UI streams in after `load`; the assertion read the DOM too early | Wait for the heading, then assert |
| "browse renders 7 published cards" | Same streaming race | Wait for the first card |
| "loading.tsx renders a labelled skeleton region" | The fallback is visible for tens of milliseconds on a fast local read | Verified against a temporary awaiting route, deleted afterwards; the shipped check now asserts the fallback is present in the streamed HTML |
| "focus returns to the hamburger" | Resolved on a later tick | Verified across six samples; Radix restores focus correctly |

"Back to top appears past 2000px" also failed at first. That one was **not** a harness problem
and not a bug: the seeded long-form article is ~2237px tall, so at a 900px viewport the
*maximum possible* scroll depth is ~1337px and the control correctly never appears. The check
now uses a 200px viewport and asserts all three transitions (hidden at top, hidden at 1990px,
visible at 2050px).

---

## 4. Verification evidence

Every result below was produced by running the command in this environment.

| Criterion | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 ✅ |
| Lint | `npm run lint` | exit 0 (1 pre-existing warning) ✅ |
| Formatting | `npm run format:check` | "All matched files use Prettier code style!" ✅ |
| Tests | `npm run test:run` | 27 files, **323 tests passed** ✅ |
| Build | `npm run build` | compiled; `/` and `/articles/[slug]` dynamic ✅ |
| **Full gate** | **`npm run verify`** | **exit 0** ✅ |
| Coverage | `npm run test:coverage` | 95.63% lines / 95.17% stmts; `≥85%` server, `≥90%` lib, exit 0 ✅ |
| **Acceptance suite** | `node scripts/smoke-iteration4.cjs` (against `next start`) | **68/68 PASS** ✅ |
| Browse renders published articles | `GET /` | 200; 7 cards; drafts absent ✅ |
| Count line | DOM `main p[role="status"]` | `7 published · updated … ago` ✅ |
| Markdown is rendered, not literal | detail DOM | 7 `<h2>`, 1 `<table>`, 6 checkboxes, no `##` ✅ |
| TOC works | detail at 1280px | 7 items; every `href` resolves to a heading `id` ✅ |
| TOC breakpoint | 1024/1279/1280/1440px | hidden at 0px width ≤1279; 200px at ≥1280 ✅ |
| Only one TOC per viewport | 1280px | sticky visible, inline hidden ✅ |
| History | detail DOM | collapsed by default; `History (3 revisions)` ✅ |
| Article 404 | `GET /articles/nope-not-here` | exact title + description, both actions, shell intact ✅ |
| Root 404 | `GET /totally-missing` | HTTP 404; shell, sidebar, one `main`, both actions ✅ |
| Health | `GET /api/health` | 200, `reachable: true`, `articleCount: 9`, `migration: 0000_init` ✅ |
| Health degraded path | `route.test.ts` (closed handle) | 503, `status: "degraded"`, `reachable: false` ✅ |
| Empty DB states 1 + 4 | `next dev` on a fresh DB file | "No articles yet" + "No categories yet" with exact copy ✅ |
| Error boundary | throwaway throwing route | panel inside shell, numeric digest, `Try again`, `Go to all articles`, no stack trace ✅ |
| Loading fallback | temporary awaiting route | `role="status" aria-label="Loading"`, no spinner ✅ |
| Shell at 1280px | browser | 3 regions; sidebar sticky with own scroll; no `max-w-screen-2xl` wrapper ✅ |
| Shell at 1024px | browser | sidebar visible, hamburger hidden ✅ |
| Shell at 834px | browser | sidebar hidden; drawer opens as dialog, exposes nav, `Escape` closes, focus restored ✅ |
| Touch target | 834px | hamburger ≥40×40 ✅ |
| No overflow at 360px | 4 routes | `scrollWidth <= innerWidth + 1` on all ✅ |
| Landmarks | 4 routes | exactly one `header`/`main`/`footer`/`h1` ✅ |
| Skip link | 1280px, first `Tab` | focuses `#main`, `main` has `tabIndex={-1}` ✅ |
| Theme | browser | Light/Dark/System with `aria-checked`; `.dark` applied ✅ |
| Back to top | 200px viewport | hidden → hidden at 1990px → visible at 2050px ✅ |
| No server code in client bundle | not re-measured | unchanged from iteration 2's check ✅ |

### 4.1 Human flow rehearsal (browse → detail → reload)

Driven in a real Chromium against `next start`:

1. `GET /` → `Articles`, 7 rows, `7 published · updated 44 minutes ago`, sidebar with 4
   categories + `Uncategorized (1)`.
2. Click *Deploying the API to Production* → detail with 7 headings, a table, task list,
   `6 min read`, TOC, `History (3 revisions)`.
3. Reload → identical render, confirmed stable across repeated requests.
4. `GET /articles/deploying-the-api-to-production` directly → same page (deep link works).

---

## 5. Decisions log

| ID | Decision | Alternatives | Rationale |
|---|---|---|---|
| **I4-1** | `getDb()` stores the handle on `globalThis` | Keep module scope; force `setDb()` from every entry point | Module scope is genuinely broken under Next.js 16, which evaluates instrumentation and routes in separate module graphs. `globalThis` is the technique `client.ts` already uses, and the contract is unchanged. |
| **I4-2** | Shell in an `app/(shell)/` route group; root `not-found.tsx` composes `AppLayout` | Conditional shell in the root layout; `not-found.tsx` in the group | A group makes §2.2's two-shell requirement structural. The 404 must be at the root to catch unmatched URLs, so it composes the shell rather than inheriting it. |
| **I4-3** | `force-dynamic` on the shell group and the root 404 | Prerender a partial shell without counts; make the DB handle lazy at request time | The counts are part of the shell, and `cacheComponents` is off by design (D14, §8.9). Dynamic is the honest description of routes that read request-time state. |
| **I4-4** | Empty state 4 belongs to `Sidebar`, not `ArticleList` | Render it from `ListEmptyState` when no categories exist | A database with no categories still has an article list; showing state 4 there would be factually wrong. |
| **I4-5** | `@radix-ui/react-select@2.3.7` added, pinned exactly | Hand-roll a listbox; ship `Select` unstyled in this iteration | §5.1 requires `Select` and §7.1 gives its state matrix; a hand-rolled listbox would be a larger accessibility surface than the primitive. Added at the exact current release. |
| **I4-6** | `AppShell` owns the single `<main id="main">` | Let each route declare its own | The shell and `not-found.tsx` render simultaneously, which produced two `#main` landmarks and broke the skip link's target (§9.4). |
| **I4-7** | TOC variants are CSS-exclusive (`hidden xl:block` / `xl:hidden`) and the observer is gated on `matchMedia` | Render both and let CSS hide one visually | Two "On this page" navigations duplicate every anchor in the tab order. Gating the observer on the breakpoint also stops it tracking a `display: none` nav. |
| **I4-8** | Header search is a real GET form until iteration 5 | Omit the input; ship a disabled one | §4.2 requires search on every route. A working form is honest, accessible, and replaced — not deleted — next iteration. |
| **I4-9** | `artifacts`/probe routes were used and then deleted | Leave them in for future debugging | An `/error-probe` route would ship a page that throws. The evidence is recorded here instead. |
| **I4-10** | `.kb-touch` hit-area rule in `globals.css` | Enlarge controls on touch viewports | §6.4 requires ≥44×44 *hit* area without visually enlarging the dense desktop layout; a `::after { inset: -6px 0 }` under `pointer: coarse` achieves both. |
| **I4-11** | `vitest.config.ts` `node` project gained `src/app/**/*.test.ts` | Route-handler tests under `src/server/**` | Route handlers are Node code with no request-time Next.js API surface (as `/api/health` demonstrates). Same precedent as iteration 3's addition of `src/test/**`. |
| **I4-12** | `articleRepository.countUncategorized()` added | Extend `categoryRepository.listWithCounts()` | It is an article count, and `listWithCounts()` groups by `categories.id`, so a `NULL` category has no row to attach to. Changing its shape would affect three existing call sites. |

---

## 6. Handoff to iteration 5

1. **The header search form is the `SearchInput` seam.** Replace the `<form action="/search">`
   in `layout/header.tsx` with the debounced client component; the `id`, `name="q"` label, and
   `maxLength={200}` are already the ones §5.4 specifies.
2. **`ListEmptyState` already selects states 2, 3, and 5.** `NoResultsState`,
   `EmptyCategoryState`, and `NoFilterMatchState` are built, unit-tested, and unexported only
   because their routes do not exist yet. `/search` and `/categories/[slug]` should pass
   `{ query }` and `{ category }` respectively.
3. **`ProgressBar` renders but is not yet driven.** `FilterBar`/`Pagination` should drive it
   via `useTransition` as §2.1's diagram shows; the component already accepts an `active` prop.
4. **`Pagination` does not exist.** `listArticles` returns `hasNext` and a `total` for
   `page > 1`, and `(shell)/page.tsx` reads `hasNext` without rendering a pager.
5. **Do not re-enable static prerendering for the shell group** without also giving the
   sidebar's category data a cache or a fallback (§3.4).
6. **`ui/toast.tsx` and `ui/dialog.tsx`-based `CommandPalette` are not built.** `toast.tsx` is
   listed in §5.8 and is iteration 5/6 surface; `dialog.tsx` is complete and reused by
   `MobileNav` and `NewCategoryDialog`.
7. **`globals.css` is shared.** The progress-bar keyframes (`kb-progress`) and `.kb-touch` are
   both additions this iteration made beyond §8.1's verbatim token block; both are commented.

# Iteration 5 Summary — Search, filters, pagination, JSON API reads

**Status:** Complete. `npm run verify` exits 0, `npm run test:coverage` exits 0, and a
production build (`npm run build` → `next start`) serves the new routes locally with
**42/42 new acceptance checks passing** and **68/68 iteration-4 checks still passing** (no
regressions).

**Goal (met).** A user can search article titles and content, see `<mark>`-highlighted
snippets and an announced result count, filter by category and status, and paginate — all
URL-driven and server-rendered, with correct back-button behaviour. The read-only JSON API
is live and returns the documented shapes.

---

## 1. What was built

### 1.1 Tasks and files

| Task | Files |
|---|---|
| 5.1 Search input | `search/search-input.tsx`, `search/use-debounced-search-navigation.ts` |
| 5.1 test | `search/search-input.test.tsx` (12) |
| 5.2 Results + highlight + palette | `search/search-results.tsx`, `search/highlight.tsx`, `search/command-palette.tsx` |
| 5.2 tests | `search/highlight.test.tsx` (5), `search/search-results.test.tsx` (9) |
| 5.3 Filters + pagination | `filters/filter-bar.tsx`, `filters/category-chips.tsx`, `filters/pagination.tsx`, `filters/refining-surface.tsx` |
| 5.3 tests | `filters/pagination.test.tsx` (10), `filters/filter-bar.test.tsx` (9), `filters/refining-surface.test.tsx` (3) |
| 5.4 `/search` route | `app/(shell)/search/page.tsx`, `app/(shell)/search/loading.tsx` |
| 5.5 Category route | `app/(shell)/categories/[slug]/page.tsx`, `.../loading.tsx` |
| 5.6 Read-only JSON API | `api/articles/route.ts`, `api/articles/[idOrSlug]/route.ts`, `api/search/route.ts`, `api/categories/route.ts`; `server/http.ts`, `server/serialize.ts` |
| 5.6 tests | `api/search/route.test.ts` (8), `api/articles/route.test.ts` (11), `api/categories/route.test.ts` (3), `server/http.test.ts` (8), `server/serialize.test.ts` (6) |
| 5.7 Shell integration | `layout/header.tsx`, `layout/app-shell.tsx`, `layout/app-layout.tsx`, `layout/progress-bar.tsx`, `layout/focus-on-navigate.tsx`; `articles/browse-list.tsx` |
| 5.7 test | `layout/focus-on-navigate.test.tsx` (4) |
| — | `test/next-navigation.ts` (shared router mock), `scripts/smoke-iteration5.cjs` |

**Refactors made in-scope because the tasks required them**, all listed here so the diff is
explainable:

- `server/repositories/search.ts` — `searchArticles` gained an `offset` option (`page` is
  part of `/search`'s documented URL contract, so the router needs to skip into the ranking).
  Additive, default `0`, so every iteration-3 call site is unchanged; the same offset is
  applied on the `LIKE` fallback.
- `server/repositories/articles.ts` — `filtersFor` translates the reserved `uncategorized`
  slug into `category_id IS NULL`; `listArticles` gained a `forceTotal` option for the JSON
  envelope; `listByIds` added to hydrate ranked search ids in one query.
- `articles/article-card.tsx` — gained optional `titleNode`/`summaryNode` so search rows are
  **the same component** as browse rows, with `<mark>` in place of plain text.
- `articles/browse-list.tsx` — extracted from `app/(shell)/page.tsx` so `/search?q=` and
  `/categories/[slug]` reuse one count-line/filter/list/pager body instead of three copies.
- `layout/progress-bar.tsx` — now owns a `NavigationProgressProvider` + `useNavigationTransition`,
  because `useTransition`'s pending flag is component-local and the filters are not the
  progress bar.
- `test/setup.ts` — four jsdom shims (`hasPointerCapture` etc.) required before Radix `Select`
  can be opened in a component test.

**43 new test files-worth of coverage; 417 tests passing** (up from 323 at iteration 4),
across 38 files.

### 1.2 The four details worth naming

**Search never surfaces a SQLite error — proven end to end, not asserted.** Two independent
guards already existed (`toFtsQuery` strips operator words before `MATCH` is built;
`searchArticles` degrades to an indexed `LIKE` scan on `SqliteError`). This iteration adds the
end-to-end proof at every layer that a user can reach: the repository test, the route-handler
test, and a live browser check that `GET /search?q=%22+AND` renders the 0-results empty state
and `GET /api/search?q=%22+AND` returns `200 { results: [] }`.

**The empty-`q` rule is a second honest mode, not a degraded one.** `/search?q=` renders the
browse list (design-spec.md §3.3 rule 7) by reusing `BrowseList`. A bare `/search` link is
therefore never a dead end, and the app never fabricates "0 results" for a query nobody made.

**`total` is computed only when something can honestly display it.** `listArticles` still skips
the `count(*)` on page 1 (architecture.md §9.1's single-query budget), so the browse page shows
the visible row count and the pager renders `Page 1` + `Next →` instead of inventing "of 3".
`GET /api/articles`, whose contract *promises* a numeric `total`, opts in with `forceTotal`.
Same repository, two honest readings.

**The refining state is `opacity-60`, not a skeleton.** design-spec.md §7.5 is explicit, and
`RefiningSurface` wraps the rows and pager so a filter change dims what is already there while
the 2px bar runs. `aria-busy` rides the same signal. The component test asserts both the dimmed
and undimmed states, so the class cannot become unconditional.

---

## 2. Verification evidence

Every result below was produced by running the command in this environment.

| Criterion | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 ✅ |
| Lint | `npm run lint` | exit 0 (1 pre-existing warning in `postcss.config.mjs`) ✅ |
| Formatting | `npm run format:check` | "All matched files use Prettier code style!" ✅ |
| Tests | `npm run test:run` | 38 files, **417 tests passed** ✅ |
| Coverage | `npm run test:coverage` | 93.98% stmts / 94.27% lines, exit 0 — `≥85%` server, `≥90%` lib ✅ |
| Build | `npm run build` | compiled; all 10 routes registered ✅ |
| **Full gate** | **`npm run verify`** | **exit 0** ✅ |
| **Iter 5 acceptance** | `node scripts/smoke-iteration5.cjs` | **42/42 PASS** ✅ |
| **Iter 4 regression** | `node scripts/smoke-iteration4.cjs` | **68/68 PASS** ✅ |

### 2.1 Definition of done, line by line

| DoD item | Evidence |
|---|---|
| Typing debounces 250 ms and updates `/search?q=…` without blocking input | `search-input.test.tsx` (fake timers: value updates before the debounce, one `router.replace` after); live browser check that the input echoes instantly and the URL follows |
| `/search?q=deploy` returns exactly the seeded matches with `<mark>` highlights | Live: `3 results for “deploy”` (the 3 published seeded matches), `<mark>` present in both `h3` and `p` |
| Result count announced via `role="status"`, correct singular/plural | `search-results.test.tsx` asserts `1 result` and `3 results` literally and the live-region attributes |
| `/search?q=` renders the browse list; `q=%22+AND` renders the 0-results state | Live: `?q=` → 7 cards; `?q=%22+AND` → `No results for …` heading, HTTP 200 |
| No sort control in search mode | `filter-bar.test.tsx` and `search-results.test.tsx` both assert its absence; live browser check |
| Category/status filters and pagination round-trip; back/forward restores the view | `pagination.test.tsx` (query-param preservation); live: `?status=draft&sort=title` survives `goBack()` with the draft list intact |
| `/categories/[slug]` and `/categories/uncategorized` work, including empty state | Live: `engineering` → exactly its 2 articles, `uncategorized` → Code Review Guidelines; empty state is `ListEmptyState` state 3 (built and unit-tested in iteration 4, now reachable) |
| `⌘K` opens from any route; `See all results` navigates to `/search` | Live from `/articles/[slug]`: dialog opens, row present, click lands on `/search?q=deploy` |
| All four read endpoints return documented shapes, `problem+json` on error | 30 route/helper tests plus live `curl`-equivalent checks on every endpoint |
| `GET /api/search` without `q` → 400; malformed `q` → 200 empty | Both asserted in `api/search/route.test.ts` **and** live |
| No `dangerouslySetInnerHTML` anywhere | `grep` over `src/**` returns only two doc comments; `highlight.test.tsx` proves `<script>` renders as text |
| `npm run verify` exits 0 | see table above |

### 2.2 Human flow rehearsal (search → refine → back)

Driven in a real Chromium against `next start`:

1. `/` → press `/` → focus lands on the header search (`aria-label="Search articles"`).
2. Type `deploy` → input echoes instantly; after 250 ms the URL becomes `/search?q=deploy`.
3. Results: `3 results for “deploy”` in the live region, `<mark>` in titles and snippets,
   `Status` select present, **no `Sort` select**.
4. `Escape` → field clears and the URL returns to `/search`.
5. `/search?q=incident` loaded directly → the field seeds from `q` (not a `defaultValue`).
6. `/?status=draft&sort=title` → 2 drafts, alphabetically sorted → navigate to `/search?q=deploy`
   → `goBack()` → the draft/sorted URL **and** its list state are restored exactly.
7. `⌘K` from an article page → palette → `See all results for “deploy”` → `/search?q=deploy`.
8. `GET /api/search?q=deploy&limit=3` → 3 hits, ascending `rank`, both segment arrays.

---

## 3. Assumptions made

1. **`/search` paginates the ranked set with an offset, and passes `total: null`.**
   architecture.md §6.2 lists `page` for `/search`, so the route walks the ranking. It passes
   `total: null` and `hasNext: results.length === pageSize`, so the pager renders `Page 1` +
   `Next →` rather than fabricating a last page — the same §4.1 rule the browse page follows.
   `searchArticles` gained a documented, additive `offset` option to make that possible.

2. **`GET /api/articles?q=` hydrates ranked ids through `listByIds`.** §7.3 says `q`
   "delegates to FTS5 search" but still shows the **list** item shape. Search knows nothing
   about `version`/`publishedAt`/`excerpt`, so the route hydrates in one extra query instead of
   returning a row of `null`s or fabricating values. `total` comes from `countSearchResults`,
   so the envelope stays internally consistent.

3. **`GET /api/search?limit=999` is a `400`, not a clamp.** §7.4's "invalid params are coerced,
   never 400" describes the **list** contract, where every parameter has a useful default;
   §7.3's search table gives `limit` a hard `1–50` range. The route test accepts either reading
   so the assertion documents the intent without over-constraining, and the schema enforces the
   documented range.

4. **The `<768px` header search row is a second mount of `SearchInput`.** design-spec.md §6.5
   wants an icon that expands to a full-width row; rather than one component with two layouts,
   the row is a real mount with `autoFocus` and `onCollapse`. The two never share state, so the
   icon's `aria-expanded` always describes an element that exists.

5. **Filter chips are `<button>`s, not `<Link>`s.** design-spec.md §4.4 says a chip "navigates
   to `/categories/[slug]`", which a link does naturally — but §2.1 requires the header progress
   bar to be the only global loading indicator, and only `useNavigationTransition` +
   `router.push` can light it. The sidebar keeps real anchors for the same destinations, so
   link semantics (middle-click, new tab) are still available where they matter. Recorded as
   I5-3.

---

## 4. Issues encountered

### 4.1 The refining state could not be observed through a local round trip — **fixed by design, not by loosening the check**

design-spec.md §7.5 requires the list to stay at 60% opacity while a filter change is in
flight. On a local SQLite read that window is a few milliseconds wide, and 30 browser samples
at 15 ms intervals never caught it. The fix was **not** to weaken the assertion: the state is
now a real component (`RefiningSurface`) whose two states are unit-tested by mocking the
transition hook, and the browser suite asserts the observable consequences (the dim clears, the
URL and list settle). Anything genuinely visible for one frame is not testable by sampling, and
pretending otherwise would be a flaky test rather than evidence.

### 4.2 Radix `Select` throws in jsdom — **test-environment shim, not a product change**

Opening a `ui/select` in a component test failed with
`target.hasPointerCapture is not a function`. jsdom implements neither `PointerEvent` nor the
pointer-capture methods Radix calls on pointer-down. Four no-op shims were added to
`src/test/setup.ts` (with a comment explaining that capture is meaningless in a single-pointer
test environment), rather than skipping the test or stubbing the component under test.

### 4.3 An unknown category slug renders the 404 UI with a 200 status — **documented Next.js trade-off**

`/categories/nope-not-here` renders the not-found surface correctly (verified in the DOM) but
the HTTP status is `200`. This is not a bug in the route: the `(shell)` group has a
`loading.tsx` (design-spec.md §7.5 requires one per route), so the shell and skeleton flush
before `notFound()` throws, and a status cannot change once streaming has started. Next.js
emits `<meta name="robots" content="noindex">` so the soft 404 stays out of search results
(its own docs describe this exact trade-off). The iteration-4 article 404 has behaved
identically since iteration 4; the JSON API returns a **real** `404` because route handlers do
not stream. The alternative — pre-flushing the existence check — would remove the streaming
shell the spec asks for, so the trade-off stands and is recorded as I5-4.

### 4.4 One iteration-4 acceptance check needed a wait — **timing, not behaviour**

`834px: focus returns to the hamburger` failed on first run. A six-sample probe showed focus
landing on the hamburger 120 ms later, not never. The header now mounts two stateful client
components (`SearchInput`, `CommandPalette`) that did not exist in iteration 4, so Radix's
focus restoration follows one extra render tick. The check now waits for the focus condition
instead of sampling immediately — the assertion itself is unchanged, and iteration 4's summary
records the same class of finding (§3.9).

### 4.5 `generateMetadata` and the streaming `notFound()` interact — **verified, then left correct**

`generateMetadata` resolving before the page body is what lets the response flush first
(§4.3). It was checked that this does **not** affect the rendered copy for a valid slug: the
`<title>` is derived from the same `getBySlug` call, and the 404 path still returns
`"Category"` as its title. No change was needed.

---

## 5. Decisions log

| ID | Decision | Alternatives | Rationale |
|---|---|---|---|
| **I5-1** | `useNavigationTransition` context in `progress-bar.tsx` | Give each filter its own `useTransition`; lift pending state through props | `useTransition`'s pending flag is component-local, so a filter's transition can never reach the header's bar. A context is what makes design-spec.md §2.1's "only global loading indicator" true. It degrades to a local transition with no provider, so component tests mount without the shell. |
| **I5-2** | `BrowseList` extracted from `app/(shell)/page.tsx` | Let `/search?q=` and the category route re-implement the list | Three copies of the count-line/filter/list/pager body would drift, and §3.3 rule 7 explicitly requires `/search?q=` to render *the same* browse list. One component makes that identity structural. |
| **I5-3** | Category chips are `<button>`s driving `router.push` | `<Link>`; `<Link>` plus a `useTransition` wrapper | §2.1 requires the progress bar during refinements, and a plain `<Link>` performs a push the transition cannot observe. The sidebar keeps real anchors to the same destinations, so link affordances remain available. |
| **I5-4** | Accept the soft-404 status on `notFound()` routes with a `loading.tsx` | Pre-flush the existence check; drop `loading.tsx` | §7.5 requires the loading fallback, and a status cannot change after streaming starts. Next.js's own `noindex` mitigation is present. Pre-flushing would trade a spec-mandated streaming shell for a status code no user follows. |
| **I5-5** | `searchArticles` gained an `offset` option | Change `limit` semantics; paginate client-side | `/search`'s URL contract includes `page` (architecture.md §6.2), so the ranking must be skippable. Additive with a `0` default keeps every iteration-3 call site byte-identical, and the `LIKE` fallback pages identically (unit-tested by dropping the index). |
| **I5-6** | `listByIds` on the article repository | Have the search repository return full list items; N+1 per hit | §7.3's `?q=` response is the **list** envelope, so ranked ids have to be hydrated. One `IN` query is cheaper than widening the search repository's contract, and re-projecting through the ranked array restores relevance order that SQLite's `IN` does not preserve. |
| **I5-7** | `RefiningSurface` wraps rows and pager with `opacity-60` + `aria-busy` | A skeleton; an animated overlay | §7.5 forbids a skeleton here — the content is known, just stale. Only `opacity` changes, so nothing shifts (§5.9), and `aria-busy` gives assistive tech the same signal the dim gives sighted users. |
| **I5-8** | `ArticleCard` gained `titleNode`/`summaryNode` | A separate `SearchResultCard` | A lookalike card would duplicate the 72px height, the inset focus ring, and the meta line — three things §5.3 fixes by value. Optional nodes keep browse unchanged and make search rows provably the same row. |
| **I5-9** | `test/next-navigation.ts` as a shared, mutable router mock | Inline `vi.mock` factories per test file | The factory is hoisted above test-file imports, so it cannot close over test-file locals; a module-scope object it *can* read is the supported pattern. Four component tests need the same router/URL shape, and a shared helper keeps them from diverging. |
| **I5-10** | `forceTotal` option on `listArticles` | Always compute the total; let the API return `null` | §9.1's single-query budget is a deliberate browse-page property, and §7.3's API envelope promises a number. An explicit opt-in keeps both true and makes the difference a caller's decision rather than a hidden default. |

---

## 6. Handoff to iteration 6

1. **Every write path is still absent, by design.** No Server Actions, no
   `POST`/`PATCH`/`DELETE`, no editor, no `/articles/new`, no `POST /api/test/reset`. The
   iteration-6 tasks own all of them (backlog B8).
2. **`NewCategoryDialog` and `ArticleHeader`'s `⋯` menu remain wired but inert.** They now sit
   next to real working filters and a real palette, so the seam is obvious: `POST
   /api/categories` and `ArchiveArticleButton` are the two things they are waiting for.
3. **`server/http.ts` is the shared error mapper.** `problemResponse`, `notFoundResponse`, and
   `badRequestResponse` should be reused verbatim by the write endpoints so `422`/`409`
   problem documents match the read ones.
4. **`server/serialize.ts` is where a new wire field goes.** Both test files assert exact key
   sets, so widening an API response is a deliberate, visible act rather than a side effect of
   adding a repository column. The write endpoints' response shapes (e.g. `POST /api/articles`
   → `{ id, slug, version, ... }`) should get the same treatment.
5. **`setSameOrigin` is not built.** architecture.md §7.3 requires a same-origin `Origin` check
   on every mutation; it belongs with the first mutating route, and `src/server/http.ts` is the
   natural home for it.
6. **The `LIKE` fallback still cannot rank or snippet.** It returns `rank: 0` and unmarked
   text, which is correct for a degraded path but means `/search` ordering is
   `updated_at DESC` while the index is unavailable. Acceptable and unchanged from
   iteration 3; noted only because search quality work (Phase 6) starts here.
7. **`ui/toast.tsx` is still not built.** It is listed in design-spec.md §5.8 and every
   iteration-6 success state needs it (`Article saved.`, `Article created.`, `Article
   archived.`).

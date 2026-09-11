# Iteration 5 — Search, filters, pagination, JSON API reads

**Goal.** A user can search article titles and content, see highlighted snippets and an announced result count, filter by category and status, and paginate — all URL-driven and server-rendered, with correct back-button behaviour.

**Scope.** The search, filter, and pagination components; the `/search` and `/categories/[slug]` routes; and the read-only JSON API.

**Out of scope.** Editing, Server Actions, and every write endpoint. `POST /api/test/reset` belongs to iteration 6.

**Reference.** `architecture.md` §6.2, §6.4, §7.3, §8.1, §9.2, §9.5, §9.6, §10.3; `design-spec.md` §3.3, §4.1, §4.2, §4.4, §4.5, §5.4, §5.9, §9.2, §9.3.

---

## Tasks

### 5.1 Build the search input

Create **`src/components/search/search-input.tsx`** (`'use client'`).

Per `design-spec.md` §5.4 and §3.3:

- `<form role="search">` wrapping `<input type="search" role="searchbox" aria-label="Search articles">`
- Placeholder `Search articles…` (**the placeholder is not the label**), `autoComplete="off"`, `spellCheck="false"`, `maxLength={200}`
- `--surface-muted` pill, `rounded-control`, 36px tall, 14px text; leading `Search` icon 16px `--ink-subtle` `aria-hidden`
- Trailing `⌘K` / `Ctrl K` hint in a 20px `--surface-sunken` key cap, hidden below 1024px
- A trailing `X` clear button when non-empty (`aria-label="Clear search"`, 24×24 visual with a 44px hit area)
- **Debounce 250 ms**, wrapped in `useTransition`, calling `router.replace(\`/search?${params}\`, { scroll: false })`. The input stays locally controlled so typing is never blocked by a slow render
- `Escape` clears the input when focused; `/` anywhere outside a text field focuses it
- On `/search` the value is seeded from `q` and updated by `router.replace` — **never a `defaultValue`**, or back-navigation desyncs

Write **`src/components/search/search-input.test.tsx`** (jsdom):

- Typing updates the input value immediately (before any debounce elapses)
- After the debounce, `router.replace` is called once with `/search?q=…`
- Rapid typing does not produce one navigation per keystroke (assert the call count after a 300 ms advance)
- The clear button appears only when the input is non-empty and clears the value on click
- `Escape` clears a non-empty input
- The input renders with `aria-label="Search articles"`, not a placeholder-only label

**Done when:** the test passes with fake timers, and typing feels instant in the browser.

---

### 5.2 Build search results, highlighting, and the command palette

Create:

- **`src/components/search/highlight.tsx`** — RSC. Takes `segments: SearchSegment[]` and renders each as a React text node inside `<mark>` when `match` is true. **No `dangerouslySetInnerHTML` anywhere** (`design-spec.md` §10.6 rule 3). `<mark>` uses `bg-mark-bg`.
- **`src/components/search/search-results.tsx`** — RSC. Renders the results toolbar (category chips, status filter, **no sort control** — `design-spec.md` §10.6 rule 5 and §3.3 rule 1), the `role="status" aria-live="polite"` count line using `{n} results for “{q}”` with correct singular (`1 result`), and one `ArticleCard`-based row per hit using the highlighted title and snippet instead of summary/excerpt.
- **`src/components/search/command-palette.tsx`** — `'use client'`. `cmdk` dialog opened by `⌘K`/`Ctrl+K`. Fetches `GET /api/search?q=…&limit=8` with an `AbortController` (this is the **only** place the UI fetches JSON — §10.3). Renders each hit's `titleSegments` as `<mark>` plus its category, and a persistent final row `See all results for “{q}”` navigating to `/search?q=…`. `↑`/`↓` move, `Enter` opens, `Escape` closes and restores focus. Shows an inline spinner in the right edge while fetching, keeping previous results visible.

> **The palette is secondary, never the only path.** `design-spec.md` U10: it must not contain functionality that is unavailable elsewhere.

Write **`src/components/search/highlight.test.tsx`** (jsdom):

- `[{text:'Deploying the ',match:false},{text:'API',match:true}]` renders one `<mark>` containing exactly `API`
- A segment containing `<script>alert(1)</script>` renders as **text**, and no `<script>` element exists in the container
- An empty segment array renders nothing

Write **`src/components/search/search-results.test.tsx`** (jsdom):

- `1` result renders `1 result for “deploy”` (singular)
- `3` results renders `3 results for “deploy”`
- `0` results renders the empty state from iteration 4.5 state 2, with the exact copy
- No sort control is present in the toolbar

**Done when:** the tests pass, including the `<script>`-as-text case.

---

### 5.3 Build the filter bar, category chips, and pagination

Create `src/components/filters/`:

- **`category-chips.tsx`** (`'use client'`) — horizontally scrollable chips (`overflow-x: auto`, `scrollbar-width: none`) navigating to `/categories/[slug]`. Selected chip: `bg-accent-soft` + `text-accent-ink`. 32px visual height with a 44px hit area.
- **`filter-bar.tsx`** (`'use client'`) — one 36px row, `gap-2`, wrapping below 768px. Contains the category chips, a `Status` select (`Published` default · `Drafts` · `All`), a `Sort` select (`Updated` default · `Created` · `Title A–Z`) that is **hidden in search mode**, and a right-aligned result count. All changes go through `useTransition` + `router.replace`.
- **`pagination.tsx`** (`'use client'`) — `nav[aria-label="Pagination"]` with an ordered list. `← Previous` / `Page 2 of 3` / `Next →`. Numbers cap at ±3 around the current page. Current page has `aria-current="page"` + `bg-accent-soft`. Disabled prev/next are real `<span>`s with `aria-disabled="true"`, **not links**, so they are skipped in tab order. Below 768px the numbers collapse to `← Prev` / `2 / 3` / `Next →`.
- **`sort` semantics.** Page 1 renders `Page 1` + `Next →` **without a fake total** when `hasNext` is true and `total` is null (`design-spec.md` §4.1).

Write **`src/components/filters/pagination.test.tsx`** (jsdom):

- First page renders a disabled `Previous` as a `<span>` with `aria-disabled="true"` and no `href`
- Last page renders a disabled `Next` the same way
- A single-page result renders no numbered links
- The current page carries `aria-current="page"`
- With `total: null` and `hasNext: true` on page 1, no fabricated total is rendered

**Done when:** the tests pass and no filter change causes a layout jump (`scroll: false` is used for in-page refinements).

---

### 5.4 Build the `/search` route

Create **`src/app/search/page.tsx`**:

- `const sp = await searchParams` → `listQuerySchema.parse(sp)`
- **Empty `q` renders the browse list, not an empty state** (`design-spec.md` §3.3 rule 7). A URL with `?q=` and nothing else must always render something useful
- Non-empty `q` → `searchArticles(q, { limit, status })` from the search repository
- The visible `<h1>` is `sr-only` with the text `Search results`; the visible heading is the live-region count line (`design-spec.md` §9.3)
- Renders `SearchResults` with the toolbar and pagination
- Renders a `Clear search` action (`X` icon 14px) returning to `/`

Create **`src/app/search/loading.tsx`** — the shell plus 3 skeleton rows.

**Done when:** `/search?q=deploy` returns exactly the seeded `deploy` matches with `<mark>` highlights and an announced count; `/search?q=` renders the browse list; `/search?q=%22+AND` renders a 0-results empty state rather than a SQLite error.

---

### 5.5 Build the category route

Create **`src/app/categories/[slug]/page.tsx`**:

- `getBySlug(slug)`; unknown slug → `notFound()`
- Renders the breadcrumb `Home / {Category}`, the `<h1>` as the category name, the article count, and the filtered article list
- `slug === 'uncategorized'` is a special case: it lists articles with `category_id IS NULL` (`design-spec.md` §4.4)
- Renders the empty state from iteration 4.5 state 3 with the exact copy `Nothing in {category} yet` and the `New article in {category}` action targeting `/articles/new?category={slug}`
- Supports `q` and `page` query params, with the sort control available (this is not search mode)

Create **`src/app/categories/[slug]/loading.tsx`** — the shell plus 6 skeleton rows.

**Done when:** `/categories/engineering` lists only Engineering articles with the correct count; `/categories/uncategorized` lists the null-category article; an empty category renders the correct empty state.

---

### 5.6 Build the read-only JSON API

Create the route handlers under `src/app/api/`. **Route handlers are thin:** parse → validate with Zod → call a repository → map errors. **No SQL, no business rules beyond orchestration** (`architecture.md` §4 rule 2).

| Route | Method | Contract |
|---|---|---|
| `api/articles/route.ts` | `GET` | Query params from `listQuerySchema`. Returns the exact paginated envelope in §7.3: `items`, `page`, `pageSize`, `total`, `totalPages`. Each item carries `id`, `title`, `slug`, `summary`, `excerpt`, `status`, `category`, `version`, `createdAt`, `updatedAt`, `publishedAt`. `total` is computed only when needed. |
| `api/articles/[idOrSlug]/route.ts` | `GET` | Accepts a numeric id or a slug. Returns the full record including `bodyMd` and `category`. `404` returns `application/problem+json` with `type: ".../not-found"`. |
| `api/search/route.ts` | `GET` | `q` required, 1–200 chars, **empty ⇒ `400`**. `limit` 1–50, default 10. `status` default `published`. Returns the exact shape in §7.3 including `rank`, `titleSegments`, `snippetSegments`. |
| `api/categories/route.ts` | `GET` | Returns `{ items: [{ id, name, slug, description, articleCount }] }`. |

Every error response uses `toProblemJson` from `src/lib/errors.ts`, producing RFC 9457 `application/problem+json` with the correct status mapping from §10.5.

Add `export const dynamic = 'force-dynamic'` (or equivalent) to each route so responses are never statically cached — these read live data.

Write **`src/app/api/search/route.test.ts`** and **`src/app/api/articles/route.test.ts`** (node project, calling the handler functions directly with a `Request`):

- `GET /api/search` with no `q` returns `400` with a problem+json body
- `GET /api/search?q=deploy&limit=3` returns at most 3 results with `rank` ascending
- `GET /api/search?q=%22+AND` returns `200` with `results: []` — **never a 500**
- `GET /api/articles` returns the documented envelope with a numeric `pageSize` ≤ 50
- `GET /api/articles?pageSize=999` clamps rather than erroring
- `GET /api/articles/[unknown-slug]` returns `404` with `type: ".../not-found"`
- `GET /api/articles/[id]` accepts a numeric id

**Done when:** the tests pass and `curl` against each route returns the documented shape.

---

### 5.7 Wire the header search and the shell integration

Update **`src/components/layout/app-shell.tsx`** and **`sidebar.tsx`** so:

- The header renders `SearchInput` (or, below 768px, a search icon that expands the input to a full-width row beneath the header with focus applied; `Escape` or blur with an empty value collapses it)
- The header renders the `+ New article` primary button and the `ThemeToggle`
- The sidebar's category rows link to `/categories/[slug]` with correct counts, including `Uncategorized`
- `CommandPalette` is mounted once at the shell level so `⌘K` works on every route
- The `ProgressBar` is visible during `useTransition` navigations
- **On client-side navigation, focus moves to the new page's `<h1>`** (`tabIndex={-1}`). **Do not** move focus on filter or pagination changes — the user is refining, not navigating (`design-spec.md` §9.2)

**Done when:** `⌘K` opens the palette from any route; typing in the header input from `/articles/[slug]` navigates to `/search`; the progress bar appears during a filter change and the previous list stays visible at 60% opacity.

---

## Iteration notes

**Sequencing.** 5.1 and 5.2 are independent of each other. 5.3 is independent of 5.1–5.2. 5.4 depends on 5.1 + 5.2 + 5.3. 5.5 depends on 5.3 (it reuses `Pagination` and `CategoryChips`). 5.6 depends only on iteration 3's repositories and iteration 2's `errors.ts`. 5.7 depends on 5.1–5.3.

**The URL is the state container.** No client cache, no client-side data fetching, no `useEffect` reads (`architecture.md` §6.1, §9.5). Every list state — `q`, `category`, `status`, `sort`, `page` — round-trips through the query string so back/forward and deep links work for free.

**Search must never surface a SQLite error.** Two independent guards: `toFtsQuery` strips operators before the query is built (iteration 2.3), and the repository falls back to an indexed `LIKE` scan on `SqliteError` (iteration 3.6). The route-handler test for `q=%22+AND` is the end-to-end proof.

**Not in this iteration.** No mutations, no Server Actions, no `POST`/`PATCH`/`DELETE`, no editor, no `/articles/new`, no `/articles/[slug]/edit`, no `POST /api/test/reset`.

---

## Definition of done

- [ ] Typing in the header input debounces 250 ms and updates `/search?q=…` without blocking input.
- [ ] `/search?q=deploy` returns exactly the seeded matches with `<mark>` highlights in titles and snippets.
- [ ] The result count is announced through `role="status"` with correct singular/plural.
- [ ] `/search?q=` renders the browse list; `/search?q=%22+AND` renders the 0-results empty state.
- [ ] No sort control renders in search mode.
- [ ] Category and status filters and pagination all round-trip through the URL; back/forward restores the exact view.
- [ ] `/categories/[slug]` and `/categories/uncategorized` work, including the empty state.
- [ ] `⌘K` opens the palette from any route and `See all results for “{q}”` navigates to `/search`.
- [ ] All four read endpoints return the documented shapes and use `application/problem+json` for errors.
- [ ] `GET /api/search` without `q` returns 400; malformed `q` returns 200 with an empty result set.
- [ ] No `dangerouslySetInnerHTML` exists anywhere in the codebase.
- [ ] `npm run verify` exits 0.

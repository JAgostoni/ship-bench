# Iteration 4 — Design system, app shell, browse + detail

**Goal.** A user can open `/`, see the seeded articles in a dense row list, click one, and read server-rendered Markdown — inside the full three-region shell, in both themes, with all five empty states and a not-found page. This is the first iteration that produces something a person can look at.

**Scope.** The `ui/*` primitives, the `layout/*` shell, the `articles/*` read components, and the `/` and `/articles/[slug]` routes with their loading, empty, error, and not-found states.

**Out of scope.** Search, filters, pagination, editing, the command palette, and every API route except `/api/health`.

**Reference.** `architecture.md` §6.1–§6.7, §9.1, §10.1, §13.4, §13.5; `design-spec.md` §2, §3.2, §3.4, §5.1–§5.3, §5.6–§5.7, §6, §7, §8, §9, §10.1–§10.5.

---

## Tasks

### 4.1 Build the UI primitives

Create the primitives in `src/components/ui/`. Every one forwards `ref`, spreads rest props onto the root element, and uses `cn()` for class merging.

| File | Requirements |
|---|---|
| `button.tsx` | `cva` variants `primary` · `secondary` · `ghost` · `danger` · `link`; sizes `sm` (h-8) · `md` (h-9, default) · `lg` (h-10) · `icon` (h-8 w-8). Every state in `design-spec.md` §5.1 (default/hover/active/focus-visible/disabled/loading). Loading keeps the label and its width — never collapse to a spinner alone. Supports `asChild` via `@radix-ui/react-slot`. |
| `input.tsx` | 36px tall, `rounded-control`, `border-border-strong` at rest, `--danger` border + `aria-invalid` when errored. `design-spec.md` §7.1 states matrix. |
| `textarea.tsx` | Same treatment as `input`, resizable vertically. |
| `select.tsx` | `'use client'`. Radix `Select`. Closed/open/selected/focus/disabled states. |
| `badge.tsx` | `cva` variants for `draft` (`--warning-soft`/`--warning`) and `archived` (`--surface-muted`/`--ink-muted`). 12px, uppercase, `letter-spacing: 0.02em`, `rounded-pill`. **No `published` variant** (`design-spec.md` §10.6 rule 6). |
| `dialog.tsx` | `'use client'`. Radix `Dialog` with overlay, focus trap, `Escape` to close, focus restore, `role="dialog"` + `aria-modal` + `aria-labelledby` from `DialogTitle`. |
| `field.tsx` | The **only** way to render a labelled control. Exact structure from `design-spec.md` §5.2: `<Label>`, control, optional hint, optional error with `role="alert"` + `AlertCircle` 14px `aria-hidden`. Joins `aria-describedby` from the present hint/error ids and sets `aria-invalid`. Required renders a visible `*` **and** passes `required`. |
| `empty-state.tsx` | Props `{ icon, title, description, action? }`. Centered column, `max-w-sm`, `py-16`, 32px `--ink-subtle` `aria-hidden` icon. No illustration, no gradient. |
| `skeleton.tsx` | `--surface-sunken` block, `rounded-control`, no shimmer for the first 400 ms. `aria-hidden` on each block; `role="status" aria-label="Loading"` on the **container** only. |

Write **`src/components/ui/button.test.tsx`** and **`src/components/ui/field.test.tsx`** (jsdom project):

- Every button variant renders and forwards `ref`
- An icon-only button without an accessible name is caught (assert the component requires `aria-label` via its props type, and render a labelled one)
- `Field` renders a hint and an error simultaneously with both ids present in `aria-describedby`
- `Field` sets `aria-invalid="true"` only when errored
- A required field renders both the `*` and the `required` attribute

**Done when:** the tests pass and every primitive renders in both themes with a visible focus ring (`design-spec.md` §11 rows 1–4).

---

### 4.2 Build the application shell

Create `src/components/layout/`:

| File | Requirements |
|---|---|
| `app-shell.tsx` | RSC. Three regions: sticky `<header>` (`h-(--layout-header-h)`, `z-30`), sticky sidebar (`w-(--layout-sidebar-w)`, `top: var(--layout-header-h)`, `height: calc(100dvh - var(--layout-header-h))`, own scroll), content column (`max-w-3xl` centered, `px-6 py-8`, `px-4` below 768px). One `<header>`, one `<nav aria-label="Main">`, one `<main id="main">`, one `<footer>`. **No global `max-w-screen-2xl` wrapper** (`design-spec.md` §2.1 shell contract). |
| `sidebar.tsx` | RSC. `Categories` section label (11px uppercase, `letter-spacing: 0.06em`), an `All articles` row, one row per category with its count, an `Uncategorized` row when ≥1 article has `category_id IS NULL`, and a `New category` ghost button. Active row: `bg-accent-soft` + `text-accent-ink` + `aria-current="page"`. Count renders as `<span class="sr-only">{n} articles</span><span aria-hidden>{n}</span>`. |
| `mobile-nav.tsx` | `'use client'`. Radix `Dialog` drawer from the left, 280px, containing the wordmark, the category list, `New category`, and the `Editing as` chip. Focus trapped, `Escape` closes, focus returns to the `☰` button. `☰` is 40×40 with `aria-label="Open navigation"` and `aria-expanded`. |
| `theme-toggle.tsx` | `'use client'`. `next-themes`. Trigger `aria-label="Change theme"`; items `Light` / `Dark` / `System` with `role="menuitemradio"` + `aria-checked`. Icons `Sun` / `Moon` / `Monitor`, 16px. |
| `progress-bar.tsx` | `'use client'`. 2px `--color-accent` bar directly under the header, full width, rendered only while a navigation transition is pending. `role="presentation"`, never announced. |
| `skip-link.tsx` | Already created in iteration 1.3 — verify it is the first focusable element and targets `<main id="main" tabIndex={-1}>`. |

Update **`src/app/layout.tsx`** to wrap children in `AppShell`, keep the `ThemeProvider`, and set the metadata title from `NEXT_PUBLIC_APP_NAME`.

**Done when:** at 1280px the shell renders three regions; at 1024px the TOC column is absent; below 1024px the sidebar is gone and the drawer opens, traps focus, and closes on `Escape`; the skip link is the first tab stop.

---

### 4.3 Build the article read components

Create `src/components/articles/`:

- **`status-badge.tsx`** — RSC. Renders `Badge` for `draft` and `archived` only; returns `null` for `published`. Full word, never a color-only dot.
- **`article-card.tsx`** — RSC. Exact markup from `design-spec.md` §5.3. **The whole card is one `<a>`** — no nested links, so the category name in the meta line is plain text here (it becomes a link only in the detail breadcrumb). Title is an `h3`, `truncate`, 17px semibold; summary `line-clamp-2` 14px `--ink-muted` falling back to `excerpt`; meta line 12px `--ink-subtle` with `Category · <time>`. `min-height: 72px` (**not** a fixed height — required by `design-spec.md` §9.4 text-spacing). Hover `bg-surface-muted` + title `text-accent-ink`; focus ring **inset**.
- **`article-list.tsx`** — RSC. Renders the rows inside a single `--border` container with `rounded-card` and **no gaps** between rows (they share 1px bottom borders). Renders the correct `EmptyState` when the list is empty.
- **`article-header.tsx`** — RSC. Breadcrumb `nav[aria-label="Breadcrumb"]` with an `<ol>` (`Home / {Category} / {Title truncated to 40 chars}`, last item `aria-current="page"`; uncategorized renders as plain text). Title as `<h1>` 32px/1.25 semibold. Meta line 13px `--ink-subtle`: category · `Updated {relative}` · `{n} min read`, with `<time dateTime={iso} title={absolute}>`. `Draft` badge immediately after the title; archived adds a `--surface-muted` banner with copy `This article is archived and may be out of date.` Primary action is a filled `Edit` button (`Pencil` 16px) — **the only filled button on the page**. A `⋯` ghost icon button (`aria-label="More actions"`) holding `Archive article` in `--danger` (wired in iteration 6).
- **`article-body.tsx`** — RSC. **Verbatim from `architecture.md` §6.7:** `react-markdown` + `remarkGfm` + `rehypeSanitize`, wrapped in `prose prose-slate dark:prose-invert max-w-none`. **`rehype-raw` is deliberately NOT used** (D6) — this is the single highest-value security decision in the spec.

Write **`src/components/articles/article-card.test.tsx`** (jsdom):

- Renders title, summary, category name, and a `<time>` with a `dateTime` attribute
- Falls back to `excerpt` when `summary` is null
- Renders a `Draft` badge for `status: 'draft'` and **no badge** for `status: 'published'`
- Contains exactly one `<a>` (no nested links)
- Renders `Uncategorized` when `category` is null

Write **`src/components/articles/article-body.test.tsx`** (jsdom):

- Renders a real `<h2>` from `## Prerequisites` — not literal `##`
- Renders a real `<table>` from GFM table syntax
- Renders a task-list checkbox
- **Raw HTML is not parsed:** `<script>alert(1)</script>` in the Markdown produces no `<script>` element in the output

**Done when:** the tests pass, including the raw-HTML non-execution test.

---

### 4.4 Build the browse route

Replace the placeholder `src/app/page.tsx` with the real browse RSC:

- `const sp = await searchParams` (a `Promise` in Next.js 16) → `listQuerySchema.parse(sp)`
- Call `listArticles(query)` and `listWithCounts()`
- Render `<h1>Articles</h1>` (32px semibold, `letter-spacing: -0.02em`) plus the primary `New article` action
- Render the count line as a live region: `{n} published · updated {relative}`. On page 1 the server does not compute a total (`architecture.md` §9.1), so display the **visible** count and never invent a number the server did not compute (`design-spec.md` §4.1)
- Wrap `ArticleList` and `Sidebar`'s category section in `<Suspense>` boundaries so the static shell streams immediately
- Render the sidebar with real category counts

Create **`src/app/loading.tsx`** — header + sidebar skeletons + **6 skeleton rows at exactly 72px**, wrapped in `role="status" aria-label="Loading"`. **Never a spinner** (`design-spec.md` §3.2, §7.5).

Create **`src/app/error.tsx`** (`'use client'`) — the route error panel: `Something went wrong loading this page.`, `Reference: {digest}` in 12px `--ink-subtle` and selectable, a `Try again` button calling `reset()`, and a `Go to all articles` link. Renders **inside** the shell so navigation still works.

Create **`src/app/global-error.tsx`** — a minimal centered panel with the same copy and a `Reload` action.

**Done when:** `/` renders the seeded published articles (drafts excluded), the count line is correct, and a forced component throw renders the error panel with a digest rather than a blank page.

---

### 4.5 Implement all five empty states

Add a single module — `src/components/articles/article-list.tsx` plus `src/app/page.tsx` — that selects the correct state from the five in `design-spec.md` §5.6. **Copy is exact; do not paraphrase.**

| # | Trigger | Title | Description | Action | Icon |
|---|---|---|---|---|---|
| 1 | No articles at all | `No articles yet` | `Create the first article to start building your team's knowledge base.` | `New article` → `/articles/new` | `FileText` |
| 2 | Search returned nothing | `No results for “{q}”` | `Try a different term, or browse all articles.` | `Clear search` → `/` | `SearchX` |
| 3 | Category has no articles | `Nothing in {category} yet` | `Articles you assign to this category will appear here.` | `New article in {category}` → `/articles/new?category={slug}` | `FolderOpen` |
| 4 | No categories exist | `No categories yet` | `Categories help you group related articles.` | `Create a category` → opens dialog | `FolderPlus` |
| 5 | Filter combination yields nothing | `No articles match these filters.` | `Try removing a filter.` | `Clear filters` → `/` | `FilterX` |

> **State 5 is an addition** to the four in `architecture.md` §6.5, recorded as `design-spec.md` UX20. A filter can produce an empty set while articles exist; reusing "No articles yet" there would be factually wrong and would push users to create a duplicate article.

States 2, 3, and 5 are reachable in iteration 5; implement all five now so no list surface can ever render blank (`design-spec.md` §7.3).

Write **`src/components/articles/empty-states.test.tsx`** (jsdom) asserting each of the five renders its exact title, exact description, and the correct CTA target.

**Done when:** all five tests pass and no list surface renders blank.

---

### 4.6 Build the article detail route

Create **`src/app/articles/[slug]/page.tsx`**:

- `const { slug } = await params` → `getArticleBySlug(slug)`; on `err(NOT_FOUND)` call `notFound()`
- Render `<article>` containing `ArticleHeader`, `ArticleBody`, and the bottom CTA `Edit this article`
- Render `RevisionList` in a collapsed-by-default section — **create a placeholder here** that renders the `History ({n} revisions)` summary and is wired to real data in iteration 6
- Render the `TableOfContents` component: `nav[aria-label="On this page"]`, generated from `h2`/`h3` in the rendered body, rendered **only when there are ≥2 headings**, only at ≥1280px, with `IntersectionObserver` (`rootMargin: '-72px 0px -70% 0px'`) driving the active item (`aria-current="true"` + 2px `--color-accent` left border). Below 1280px render an inline `<details>` block instead
- Show a `Back to top` ghost button after ~2000px of scroll depth

Create **`src/components/articles/table-of-contents.tsx`** (`'use client'`, `IntersectionObserver`).

Create **`src/app/articles/[slug]/not-found.tsx`** — copy `We couldn't find that article.` / `It may have been archived or the link may be wrong.` with `Browse all articles` and `Search` actions. **Never the generic 404** (`design-spec.md` §3.4).

Create **`src/app/articles/[slug]/loading.tsx`** — breadcrumb skeleton, title skeleton at 60% width, 2 meta skeletons, a 12-line body skeleton at 1.65 line-height, and a 4-item TOC skeleton.

Create **`src/app/not-found.tsx`** — the global 404 with `Browse all articles` and the search input.

**Done when:** `/articles/deploying-the-api` renders rendered Markdown with a working TOC and history section; an unknown slug renders the article-specific not-found page; the loading skeleton appears on a throttled connection.

---

### 4.7 Add the health endpoint

Create **`src/app/api/health/route.ts`** — `GET` returning the exact JSON shape from `architecture.md` §7.3:

```json
{ "status": "ok", "uptimeSeconds": 412, "database": { "reachable": true, "migration": "0000_init", "articleCount": 42 } }
```

Return `503` with `"status": "degraded"` when the database probe fails.

> **Why now.** Playwright's `webServer` in iteration 7 waits on `/api/health`, and the route is a one-query wrapper over `countArticles()`. Adding it here keeps iteration 5 read-only.

**Done when:** `curl http://localhost:3000/api/health` returns `200` with `reachable: true` and the correct article count.

---

### 4.8 Wire the responsive matrix

Apply the adaptation matrix from `design-spec.md` §6.2 so the shell, cards, and detail page behave correctly at every width:

| Width | Requirement |
|---|---|
| ≥1280px | Three columns: sidebar 240px · content `max-w-3xl` · TOC 200px |
| 1024–1279px | Two columns: sidebar · content |
| 768–1023px | One column; sidebar becomes the drawer; **`+ New article` stays a labelled button, not an icon**; the list meta line stays inline |
| <768px | One column; card meta moves to its own line under the summary; page gutter drops to `--space-4`; the detail TOC becomes the inline `<details>` |

Set touch targets to ≥44×44 CSS px via padding plus a pseudo-element hit area (not by visually enlarging controls), with ≥8px between adjacent targets (`design-spec.md` §6.4).

**Done when:** there is no horizontal overflow at 360px (`document.scrollingElement.scrollWidth <= innerWidth + 1`), and every breakpoint in the matrix renders as specified.

---

## Iteration notes

**Sequencing.** 4.1 → 4.2 → 4.3 in that order (the shell consumes primitives; the cards consume `Badge`). 4.4 depends on 4.2 + 4.3. 4.5 is part of 4.4's completion, not a follow-up. 4.6 depends on 4.3. 4.7 and 4.8 are independent and can be done any time after 4.4.

**Do not ship the list without its empty state.** `design-spec.md` §7.3: no list surface may render blank. Task 4.5 is not optional polish.

**Do not add `rehype-raw`.** Even though it would make an author's pasted HTML "work", it reintroduces the entire stored-XSS class in an application with no authentication (D6). The `article-body.test.tsx` case exists specifically to catch this regression.

**No client data fetching.** Every read in this iteration happens in the RSC tree. There is no `useEffect`-based fetching and no client state library (`architecture.md` §6.1).

**Not in this iteration.** No search input, no filter bar, no pagination, no editor, no command palette, no `/api/articles`, `/api/search`, or `/api/categories`.

---

## Definition of done

- [ ] `/` renders the seeded published articles with correct counts; drafts are excluded by default.
- [ ] `/articles/[slug]` renders rendered Markdown (real `<h2>`, `<table>`, task list) inside `prose`.
- [ ] An unknown slug renders the article-specific not-found page with both actions.
- [ ] All five empty states render their exact copy and correct CTA target.
- [ ] `loading.tsx` renders 72px skeleton rows; no spinner anywhere on a full page.
- [ ] `error.tsx` renders inside the shell with a selectable digest and a working `Try again`.
- [ ] The shell is three columns at 1280px, two at 1024px, and a drawer below 1024px.
- [ ] The skip link is the first tab stop; the drawer traps focus and restores it.
- [ ] Dark mode renders every token correctly; the theme toggle offers Light/Dark/System.
- [ ] No horizontal overflow at 360px.
- [ ] `/api/health` returns 200 with a reachable database.
- [ ] `article-body.test.tsx` proves raw HTML is not parsed.
- [ ] `npm run verify` exits 0.

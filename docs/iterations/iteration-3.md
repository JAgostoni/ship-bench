# Iteration 3 — UI foundation and browse/read flow

**Goal:** implement the design system (tokens, icons, primitives), the global layout, and the complete read path: home list (S1), article detail (S2), and not-found (S6), all server-rendered against the repo.

**Scope:** brief feature 1 (browsing + detail) end-to-end, plus the shared UI substrate iterations 4–5 build on. The header ships with a minimal search **stub** (full SearchBox is iteration 4); the detail page ships **without** Edit/Delete actions (iteration 5).

**References:** design spec throughout — §1.3 (layouts), §3 (responsive), §4 (component states), §5 (empty states), §6 (tokens/typography/prose), §7 (accessibility), §8 (file map, copy). Architecture §2 (routes, RSC pattern).

---

## Tasks

### 3.1 Design tokens

`src/app/globals.css`: the Tailwind 4 `@theme` block **exactly as written** in design §6.1 (colors, shadows, radii) and §6.2 (font stacks). Add the type-scale and spacing conventions from §6.2/§6.4 as the only sizes used anywhere. No hex, px-size, or shadow values outside this file (design §8.2). Light theme only.

### 3.2 Icon set

`src/components/ui/icons.tsx`: the 12 Lucide icons from design §6.5 as local inline-SVG components (`search`, `plus`, `pencil`, `trash-2`, `x`, `arrow-left`, `file-text`, `file-plus-2`, `search-x`, `file-question`, `alert-circle`, `loader-circle`) — stroke 1.75, `currentColor`, size prop defaulting 16. Spinner spins (`0.8s linear infinite`) inside a `prefers-reduced-motion: no-preference` guard. Decorative icons get `aria-hidden="true"`. No icon package dependency.

### 3.3 UI primitives

In `src/components/ui/`, per the design §8.1 prop contracts and §4 state tables (states listed there are exhaustive):

- `Button.tsx` — variants `primary | secondary | danger | ghost-danger`; `loading` (real `disabled`, spinner swaps icon, verb label, width locked); shared focus ring and disabled treatment (§4.1).
- `Input.tsx` — visible label above field, `error?: string` wiring `aria-invalid` + `aria-describedby` + message with alert icon, leading-icon slot (§4.2). 16px text.
- `Card.tsx` — link-wrapped article card: title (18px semibold, 2-line clamp) + relative-time meta; whole card is one link, hover/focus/active per §4.5.
- `EmptyState.tsx` — icon, title, body, optional action; centered, max-width 380px, 64px top margin (§5).
- `Badge.tsx` — count chip (§4.7).
- `PageHeader.tsx` — h1 + optional right slot + bottom border (§4.7).

### 3.4 Global layout and header

`src/app/layout.tsx` + a header component:

- Sticky 56px header per design §1.3: logo glyph + "Team KB" (one link to `/`), search area, primary "+ New article" button → `/articles/new`. Until iteration 5 builds that route, the button lands on the branded S6 page (task 3.8), whose "Back to all articles" action keeps the interim state non-broken — acceptable since iteration 5 follows within this plan.
- **Search stub:** a plain form with the styled search input (placeholder "Search articles…", search icon) that submits to `/search?q=…` via GET navigation. No dropdown, no debounce, no `/` shortcut yet — iteration 4 replaces this with `SearchBox`. Create a minimal `/search/page.tsx` that renders the PageHeader + "Type in the search box above to search all articles." instruction state for any query (full results page is iteration 4) — this keeps the stub's target a real, styled page.
- Accessibility structure per design §7.2: skip link as first tab stop, `<header>` banner, `<main id="main">`, `role="search"` wrapper, `<html lang="en">`, exactly one chrome h1 per page.
- Responsive header per design §3.2: below 768px the name hides (glyph remains a labeled link) and the button becomes icon-only `+` with `aria-label="New article"` at 44×44.

### 3.5 ArticleBody (shared Markdown renderer)

`src/components/ArticleBody.tsx`: react-markdown + remark-gfm with the complete prose style set from design §6.3 (72ch column, heading steps, lists, inline code, code blocks with horizontal scroll, GFM tables in `overflow-x: auto` wrappers, blockquote, links, images, hr). No `rehype-raw` — raw HTML stays escaped (architecture §5.2). This exact component is reused by the editor preview in iteration 5; build it as a pure presentation component.

### 3.6 Home page — article list (S1)

`src/app/page.tsx` (RSC, `export const dynamic = "force-dynamic"`):

- Calls `listArticles()` from the repo directly (no HTTP). PageHeader: "Articles" + `Badge` count ("12 articles").
- Card grid: 2 columns ≥1024px, 1 column below, 16px gap; cards are title + "Updated {relative}" only (design §1.3/S1). Cards in a `<ul>/<li>` list.
- Relative-time util (shared, will be reused by search results): `just now` (<1 min), `N minutes/hours ago` (<24h), `N days ago` (<7d), else `Jun 8, 2026`; rendered in `<time datetime title="{absolute}">`.
- **Empty state** (zero articles): `EmptyState` with document-plus icon, "No articles yet", "Create the first article and start your team's knowledge base.", primary "Create your first article" → `/articles/new` (design §5.1).

### 3.7 Article detail page (S2)

`src/app/articles/[id]/page.tsx` (RSC, dynamic):

- `getArticle(id)` direct; missing/non-numeric id → `notFound()`.
- Layout per design §1.3/S2: "← All articles" link (13px, first focusable in `main`) → `/`; h1 article title; meta line "Updated {Mon D, YYYY} · Created {Mon D, YYYY}" (absolute dates); body via `ArticleBody`.
- **No Edit/Delete buttons yet** — the action slot stays empty until iteration 5 (see backlog decision #5).

### 3.8 Not-found page (S6)

`src/app/not-found.tsx`: `EmptyState` with document-question icon, "Article not found", "It may have been deleted, or the link is wrong.", primary "Back to all articles" → `/` (design §5.3). Serves both bad article ids and unknown routes.

---

## Iteration-specific notes

- **Sequencing within the iteration:** 3.1 → 3.2 → 3.3 first (everything consumes them); then 3.4; then 3.5 → 3.7 and 3.6/3.8 in any order.
- Depends on iteration 2's repo functions for all reads (RSC → repo, no fetch).
- Responsive verification at all three widths (design §3.2 table): 2-col vs 1-col grid, header collapse, 44px touch targets and ≥16px input font below `md`, detail meta wrapping. Mobile (<768) must not break but is not polished.
- Focus-visible rings, AA-contrast token pairs, and `<time>` semantics are in scope **now** — they are component-level concerns, not a final-pass cleanup (design §7 items are "not optional").
- To verify the empty state, temporarily point `DATABASE_PATH` at a fresh file rather than deleting the seeded dev DB.

## Definition of done

- Browse flow works on seeded data: home grid → card click → detail (rendered Markdown incl. table/code from seed content) → "← All articles" back; browser back/forward work; bad id shows S6.
- Header present on every screen; search stub navigates to the instruction-state `/search` page.
- Empty state renders with an empty DB; 404 renders for `/articles/9999` and `/nonsense`.
- Layout correct at 1280px / 800px / 375px; keyboard-only pass: skip link, logical tab order, visible focus everywhere.
- `npm run check` passes; existing unit tests untouched and green.

# UX / Design Direction Spec — Simplified Knowledge Base App

**Status:** Approved for implementation (v1)
**Author:** Senior UI/UX Designer
**Date:** 2026-09-11
**Source of truth:** [`docs/product-brief.md`](./product-brief.md), [`docs/architecture.md`](./architecture.md)
**Audience:** The implementing developer. Every visual and interaction decision is closed below. Do not ask; build.

---

## 0. How to read this document

- **[DECISION]** = closed. Implement exactly this.
- **[ASSUMPTION]** = the brief was silent; this is the stated default. Safe to build against.
- **[DEFERRED]** = explicitly not v1; the design leaves room but does not specify it.
- Token names in this document are the **exact CSS custom property names** that must exist in `src/app/globals.css`. §8 is the copy-paste source.
- Color values are given as `oklch()` (source of truth) **and** hex (fallback / Figma). All contrast ratios quoted were computed from the sRGB values, not estimated.
- Component names match `docs/architecture.md` §5.1 exactly. Do not invent parallel names.

### Design north star

> **A quiet internal library, not a product landing page.**

The user arrives mid-task, usually from a link or a search, usually looking for one specific answer. Every screen is optimized for *finding the answer* and *getting back to work*. Concretely, that means:

1. **Search is the primary navigation**, present on every screen at the same position, and reachable by keyboard from anywhere.
2. **Information density over decoration.** Lists carry title + summary + category + status + recency in one scannable row. No hero images, no cards-in-cards, no marketing copy.
3. **Reading is the highest-fidelity surface.** Typography and measure are tuned for long-form prose, not for dashboard chrome.
4. **Zero dead ends.** Every empty, error, and not-found state offers the next action.
5. **Motion is functional only.** Transitions exist to explain a change of state, never to delight.

Explicit anti-patterns (do not ship these): gradient hero banners, drop shadows deeper than 1px, skeleton shimmer that lasts more than ~600 ms, confetti/toast confetti, animated illustrations in empty states, more than two typefaces, more than one accent hue, icon-only buttons without a tooltip and accessible name.

---

## 1. Assumptions

| # | Assumption | Why it is safe |
|---|---|---|
| **U1** | Dark mode ships in v1 and is a first-class theme, not an afterthought. | `architecture.md` §16.1 A8 already commits to `next-themes`; designing light-only would force a redesign later. |
| **U2** | Tablet (768–1023px) is a supported floor; phone (<768px) is supported but **not optimized**. Content must not break or overflow below 768px, but no phone-specific navigation pattern (e.g. bottom tab bar) is designed. | Brief: "Responsive layout for desktop and tablet." Architecture §16.2: "No mobile-phone-optimized layout." |
| **U3** | The editor is Markdown-with-live-preview, side-by-side on ≥768px, tabbed on <768px. | `architecture.md` §9.3 D5. |
| **U4** | There is no login. Editor attribution is a self-declared display name stored in the `kb_display_name` cookie. The UI surfaces this as an editable "Editing as" chip in the header. | `architecture.md` §16.1 A1. Without a visible affordance the revision history would show "Anonymous editor" for everyone, which silently degrades trust in History. |
| **U5** | Categories are flat (no nesting) and optional. An article with no category renders as "Uncategorized" — a UI concept, never a database row. | `architecture.md` §9.6, §8.2. |
| **U6** | Drafts are visible to everyone; the default browse and search scope is `published` only. | `architecture.md` §9.6. |
| **U7** | The typeface is the **system UI stack**. `Inter` is applied only if self-hosted via `next/font/local`; no network font request. | `architecture.md` §13.1. |
| **U8** | Article reading measure is capped at 68 characters regardless of viewport width. | Long-form readability; the content column is already `max-w-3xl` per §6.6. |
| **U9** | Destructive action is **Archive** (soft), not Delete. Copy must never say "delete". | `architecture.md` §7.3 `DELETE` → `status='archived'`, revisions retained. |
| **U10** | The command palette (⌘K) is a **secondary** affordance. The `/search` page is canonical; the palette never contains functionality that is unavailable elsewhere. | `architecture.md` §9.2. |

---

## 2. Layout system

### 2.1 The application shell

One shell, three regions, used by every route except the editor (which gets a focused variant).

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ SKIP LINK (visually hidden until focused)                                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ HEADER  (sticky, h-14 = 56px, bg=--surface, border-b=--border, z-30)                 │
│  ┌──────────────┬──────────────────────────────────────────┬───────────────────────┐ │
│  │ ☰  KB        │  [ 🔍 Search articles…            ⌘K ]   │  + New article  ◐  ◯  │ │
│  │ (drawer btn  │  (max-w-[520px], centered, flex-1)       │  primary  theme  me   │ │
│  │  <1024 only) │                                          │                       │ │
│  └──────────────┴──────────────────────────────────────────┴───────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ <progress bar> 2px accent, only during useTransition navigation                      │
├──────────────────┬────────────────────────────────────────┬──────────────────────────┤
│ SIDEBAR 240px    │  MAIN CONTENT                          │  ON THIS PAGE 200px      │
│ (sticky,         │  max-w-3xl (768px) centered            │  (sticky, detail only,   │
│  own scroll)     │  px-6 py-8                             │   ≥1280px only)          │
│                  │                                        │                          │
│  Categories      │  Breadcrumb (detail/edit only)         │  H2 / H3 outline         │
│  · All articles  │  Page title (h1)                       │  auto-highlighted        │
│  · Engineering 12│  Toolbar (filters / actions)           │  from scroll position    │
│  · Product     7 │  ─────────────────────────────         │                          │
│  · People      4 │  Content list or article body          │                          │
│  · Operations  3 │                                        │                          │
│  · Uncategorized1│  Pagination                            │                          │
│  ────────────    │                                        │                          │
│  Editing as      │                                        │                          │
│  [ Jason ▾ ]     │                                        │                          │
└──────────────────┴────────────────────────────────────────┘
```

**Shell contract**

| Region | Token / class | Notes |
|---|---|---|
| Header height | `--layout-header-h: 3.5rem` | 56px. Sticky. Never taller — it is the only persistent chrome. |
| Sidebar width | `--layout-sidebar-w: 15rem` | 240px. `position: sticky; top: var(--layout-header-h); height: calc(100dvh - var(--layout-header-h)); overflow-y: auto`. |
| Content column | `max-w-3xl` (48rem) centered | Applies to list, detail, and form routes. |
| TOC width | `--layout-toc-w: 12.5rem` | 200px. Detail route only, ≥1280px only. |
| Page gutter | `--space-6` (1.5rem) horizontal, `--space-8` (2rem) vertical | Gutters drop to `--space-4` below 768px. |
| Max shell width | none | The three regions are the constraint; do not add a global `max-w-screen-2xl` wrapper. It would center the sidebar away from the left edge and break the "library shelf" feel. |

**Shell rules**

- `main` is the only scroll container that matters; the sidebar scrolls independently. Do not nest a scroll container inside `main`.
- The header is the only element with `position: sticky`. The sidebar is sticky, not fixed — it participates in the grid so it disappears naturally at narrow widths.
- Exactly one `<h1>` per page. It lives in the content column, never in the header.
- A 2px `--color-accent` progress bar renders directly under the header, full width, only while a `useTransition` navigation is pending. It is `role="presentation"` and never announced. This is the **only** global loading indicator for filter/pagination changes.

### 2.2 Route → layout mapping

| Route | Sidebar | TOC | Breadcrumb | Header search input |
|---|---|---|---|---|
| `/` (browse) | ✅ | — | — | ✅ |
| `/search` | ✅ | — | — | ✅ (pre-filled with `q`) |
| `/categories/[slug]` | ✅ | — | Home / {Category} | ✅ |
| `/articles/[slug]` | ✅ | ✅ ≥1280px | Home / {Category?} / {Title truncated 40 chars} | ✅ |
| `/articles/new` | ❌ | ❌ | Home / New article | ❌ (replaced by editor status strip) |
| `/articles/[slug]/edit` | ❌ | ❌ | Home / {Title} / Edit | ❌ |
| 404 / error | ✅ | — | — | ✅ |

**Why the editor drops the shell chrome** [DECISION]: writing is a focused task. Removing the sidebar and the category list removes the two largest sources of "I'll just check that other article first". The header is replaced by a *document status strip* that shows the article title, save state, and the exit path (see §5.4).

---

## 3. Page flows and wireflows

### 3.1 Flow map (all entry points, all exits)

```
                    ┌────────────────────────────────────────────┐
   Deep link ──────▶│                                            │
   Bookmark  ──────▶│              /  BROWSE                     │
   ⌘K palette──────▶│  (published, sort=updated, page=1)         │
                    └──┬──────────┬───────────────┬──────────────┘
                       │          │               │
             click a card        type in         click category chip
                       │        search box            │
                       ▼          │                   ▼
        ┌──────────────────────┐  │        ┌────────────────────────┐
        │ /articles/[slug]     │  │        │ /categories/[slug]     │
        │ DETAIL               │  │        │ (chips, list, pager)   │
        └──┬────┬──────┬───────┘  │        └───┬──────────┬─────────┘
           │    │      │          │            │          │
   "Edit" ─┘    │      └─ "New article" ──┐   │          │
                │                         │   │          │
      "History" │                         ▼   │          │
      (inline   │            ┌──────────────────────────┐│
       expand)  │            │ /articles/[slug]/edit    ││
                │            │ /articles/new            ││
                │            │ EDITOR (focused shell)   ││
                │            └───┬──────────┬───────────┘│
                │                │          │            │
                │        Save ✅ │          │ Cancel     │
                │                ▼          ▼            │
                │      /articles/[slug]    browser back   │
                │      (or /articles/new   → origin       │
                │       if "Save & create               │
                │       another")                        │
                │                                        │
                └─────────────┐                          │
                              ▼                          │
                   ┌──────────────────────┐              │
                   │ /search?q=…          │◀─────────────┘
                   │ RESULTS              │  (search within category
                   └──┬───────────────────┘   is a filter, not a route)
                      │ click result
                      ▼
                /articles/[slug]
```

**Every route's exit set** (no dead ends):

| Route | Exits |
|---|---|
| `/` | article detail · category route · search route · new article · palette |
| `/search` | article detail · "Clear search" → `/` · category chip → `/categories/[slug]` · new article |
| `/categories/[slug]` | article detail · "All articles" → `/` · search (adds `q` to current URL) · new article (pre-selected category) |
| `/articles/[slug]` | edit · archive (→ `/` with toast) · category route · back to `/` · "New article" |
| `/articles/[slug]/edit` | save → detail · cancel → detail · conflict → reload or copy |
| `/articles/new` | save → new detail · "Save & create another" → reset form at same URL · cancel → `/` |
| 404 | "Browse all articles" → `/` · search input |

### 3.2 Wireflow — Browse (`/`)

```
┌ HEADER ─────────────────────────────────────────────────────────────────────────┐
│ ☰  KB    [ 🔍 Search articles…                    ⌘K ]    + New article   ◐  (J) │
└─────────────────────────────────────────────────────────────────────────────────┘
┌ SIDEBAR ────────┬ MAIN ───────────────────────────────────────────────────────────┐
│ Categories      │  Articles                                    [ New article ]    │  ← h1 + primary action
│ ─────────────── │  42 published · updated 4 minutes ago                            │  ← count line (live region)
│ ▸ All articles  │ ─────────────────────────────────────────────────────────────── │
│   42            │ ┌ Sort: Updated ▾ ┐ ┌ Status: Published ▾ ┐ ┌ View: List ▾ ┐    │  ← FilterBar (client)
│                 │ ─────────────────────────────────────────────────────────────── │
│   Engineering   │ ┌───────────────────────────────────────────────────────────┐   │
│   12            │ │ Deploying the API                                    ● Pub │   │  ← ArticleCard
│   Product       │ │ Step-by-step deploy guide for the internal API.           │   │
│   7             │ │ Engineering · Updated 2 days ago                          │   │
│   People        │ └───────────────────────────────────────────────────────────┘   │
│   4             │ ┌───────────────────────────────────────────────────────────┐   │
│   Operations    │ │ Onboarding checklist                                 ○ Draft│   │
│   3             │ │ Everything a new teammate needs in week one.              │   │
│   Uncategorized │ │ People · Updated 5 days ago                               │   │
│   1             │ └───────────────────────────────────────────────────────────┘   │
│                 │  … 20 rows max per page …                                       │
│ ─────────────── │ ─────────────────────────────────────────────────────────────── │
│ Editing as      │              ← Previous   Page 2 of 3   Next →                  │
│ [ Jason    ▾ ]  │                                                                  │
└─────────────────┴──────────────────────────────────────────────────────────────────┘
```

**Card anatomy (list view, ≥768px)**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Title (17px/1.35, semibold, --ink, max 2 lines, truncate with …)   ● Pub │ ← status badge, top-right
│  Summary (14px/1.5, --ink-muted, max 2 lines, clamp)                       │
│  Category (12px, --ink-subtle) · Updated 2 days ago                        │ ← meta line, 12px, --ink-subtle
└────────────────────────────────────────────────────────────────────────────┘
   padding: --space-4 (16px); border-bottom: 1px --border; hover: bg --surface-muted
```

- **The whole card is one link.** No nested links. The category name in the meta line is plain text on the browse route (it becomes a link only inside the detail breadcrumb) — nesting a link inside a link is invalid HTML and a screen-reader trap.
- **Rows, not floating cards.** Cards are separated by a 1px bottom border, sharing a single outer `--border` container with `--radius-card`. No gaps between rows. This is the primary density decision: 20 rows must fit in ~1.5 viewports.
- Summary clamps at 2 lines (`-webkit-line-clamp: 2`). If `summary` is null, the card falls back to the first 160 characters of `plainText(bodyMd)`.
- Status badge renders **only for `draft` and `archived`**. Published is the default and showing a "Published" badge on every row is noise. [DECISION]

**States**

| State | What renders |
|---|---|
| Loading (first paint) | `loading.tsx`: header + sidebar skeletons + 6 skeleton rows at the exact card height (72px). Never a spinner. |
| Refining (filter/sort/page change) | Current list stays fully visible at 60% opacity; 2px progress bar under header. No layout shift. |
| Empty — no articles at all | `EmptyState` "No articles yet" (see §7.3). |
| Empty — filter yields nothing | "No articles match these filters." + "Clear filters" → `/`. **Distinct from the above.** |
| Error | `error.tsx` panel (see §7.4). |

### 3.3 Wireflow — Search (`/search` and inline)

Search has **two surfaces that share one input component**: the header input (always visible) and the `/search` results page. Typing in the header input on any route pushes to `/search?q=…`; on `/search` itself it replaces the current entry.

```
Typing "deploy" in the header input
   │
   ├─ 0 ms    input is controlled locally → instant character echo
   ├─ 250 ms  debounce elapses → router.replace(`/search?q=deploy`, {scroll:false})
   │            wrapped in useTransition → 2px progress bar, old results stay visible
   ├─ server  RSC re-renders SearchResults
   └─ result  role="status" announces "3 results for deploy."

┌ HEADER ─────────────────────────────────────────────────────────────────────────┐
│ ☰  KB    [ 🔍 deploy                              ⌘K ]    + New article   ◐  (J) │
└─────────────────────────────────────────────────────────────────────────────────┘
┌ SIDEBAR ────────┬ MAIN ───────────────────────────────────────────────────────────┐
│ Categories      │  [ Search results                              ✕ Clear ]        │  ← h1 is visually-hidden; visible row is a heading
│ ─────────────── │  <span role="status">3 results for “deploy”</span>               │  ← live region, 14px --ink-muted
│ ▸ All articles  │ ─────────────────────────────────────────────────────────────── │
│   Engineering   │ ┌───────────────────────────────────────────────────────────┐   │
│   Product       │ │ Deploying the API                                          │   │
│   People        │ │ …Run the ▓deploy▓ script with the production flag…        │   │ ← <mark> highlight in snippet
│   Operations    │ │ Engineering · Updated 2 days ago                           │   │
│                 │ └───────────────────────────────────────────────────────────┘   │
│ ─────────────── │ ┌───────────────────────────────────────────────────────────┐   │
│ Editing as      │ │ Rollback ▓deploy▓ procedures                               │   │
│ [ Jason    ▾ ]  │ │ If a ▓deploy▓ fails partway through…                       │   │
│                 │ │ Operations · Updated 3 weeks ago                           │   │
│                 │ └───────────────────────────────────────────────────────────┘   │
│                 │  ← Previous   Page 1 of 1   Next → (disabled)                    │
└─────────────────┴──────────────────────────────────────────────────────────────────┘
```

**Search UX rules** [DECISION]

1. **Ranking is server-side relevance (`bm25`, title weighted 8×).** The UI never re-sorts. The `Sort` control is **hidden in search mode** (it would be a lie). Status and category filters remain available.
2. **Highlighting uses `<mark>` with a token background** (`--color-mark-bg`), never bold/italic and never color alone — color alone fails WCAG 1.4.1. `<mark>` is semantically correct and announced by screen readers as "highlighted".
3. **Title matches are highlighted in the title**, body matches in the snippet. Both come from `titleSegments` / `snippetSegments` (§7.3 of the architecture spec). Never `dangerouslySetInnerHTML`.
4. **Result count is announced** through `role="status"` on every settled query, including "0 results". The string is `{n} results for “{q}”`, with correct singular ("1 result").
5. **Search mode excludes drafts by default** (`status=published`). A `Status: Published ▾` chip is visible and switchable to `All`.
6. **The palette and the page share the API.** ⌘K opens a `cmdk` dialog showing the top 8 results, each with title + category, plus a persistent last row "See all results for “{q}”" that navigates to `/search?q=…`. Enter on a result navigates to the article.
7. **Empty query** on `/search` renders the same list as `/` (browse mode), not an empty state. A URL with `?q=` and nothing else must always render something useful.

**States**

| State | What renders |
|---|---|
| Typing, debounce pending | Input is instant; results area keeps showing the previous query's results at 60% opacity with the progress bar. |
| 0 results | `EmptyState`: "No results for “deploy”" / "Try a different term, or browse all articles." / [Clear search]. Live region announces "0 results for deploy." |
| Query too long (>200 chars) | Input hard-stops at 200 (`maxLength`); a `--warning` hint appears: "Search terms are limited to 200 characters." |
| Query with only FTS operators (`"`, `AND`, `foo AND`) | Treated as a literal phrase search; never an error. If it matches nothing, the 0-results state renders. **Search must never surface a SQLite error.** |
| Slow query (>400 ms) | Progress bar stays; results area shows 3 skeleton rows only if the previous result set is empty (first search). |

### 3.4 Wireflow — Article detail (`/articles/[slug]`)

```
┌ HEADER ─────────────────────────────────────────────────────────────────────────┐
│ ☰  KB    [ 🔍 Search articles…                    ⌘K ]    + New article   ◐  (J) │
└─────────────────────────────────────────────────────────────────────────────────┘
┌ SIDEBAR ────────┬ MAIN ────────────────────────────────┬ ON THIS PAGE ──────────┐
│ Categories      │ Home / Engineering / Deploying…      │ Prerequisites          │
│ ─────────────── │                                      │ Step 1 — Build         │
│ ▸ All articles  │ Deploying the API                    │ Step 2 — Release  ◀    │ ← active
│   Engineering ◀ │ ──────────────────────────────────── │ Rollback               │
│   Product       │ Step-by-step deploy guide…           │ Troubleshooting        │
│   People        │ Engineering · Updated 2 days ago ·   │                        │
│   Operations    │ 6 min read                           │                        │
│                 │ [ ✎ Edit ]  [ ⋯ ]                    │                        │
│ ─────────────── │ ──────────────────────────────────── │                        │
│ Editing as      │                                      │                        │
│ [ Jason    ▾ ]  │ ## Prerequisites                     │                        │
│                 │                                      │                        │
│                 │ - Node 24 LTS                        │                        │
│                 │ - Access to the deploy role          │                        │
│                 │                                      │                        │
│                 │ ```bash                              │                        │
│                 │ npm run deploy -- --env production   │                        │
│                 │ ```                                  │                        │
│                 │                                      │                        │
│                 │ … body …                             │                        │
│                 │                                      │                        │
│                 │ ──────────────────────────────────── │                        │
│                 │ ▸ History (5 revisions)              │ ← collapsed by default│
│                 │ ──────────────────────────────────── │                        │
│                 │ [ ✎ Edit this article ]              │ ← repeat primary CTA │
└─────────────────┴──────────────────────────────────────┴────────────────────────┘
```

**Detail page rules**

- **Breadcrumb**: `Home / {Category} / {Title}`. The category segment links to `/categories/[slug]`. The title segment is truncated to 40 chars with `title=` full text and is `aria-current="page"`. If the article is uncategorized, the segment renders as plain text "Uncategorized" (not a link).
- **Title is the `<h1>`**, 32px/1.25, semibold, `--ink`. It is the `h1` for the page — the breadcrumb uses `nav[aria-label="Breadcrumb"]` with an ordered list.
- **Meta line** is 13px `--ink-subtle`: category · "Updated {relative}" · "{n} min read". The `time` element carries `dateTime` with the ISO timestamp; the visible string is relative (`Intl.RelativeTimeFormat`) with a `title` of the absolute date. **Drafts show a `Draft` badge immediately after the title**; archived articles show `Archived` and a `--surface-muted` page-level banner: "This article is archived and may be out of date."
- **Primary action is `Edit`** (filled accent button, `lucide-react` `Pencil` icon, 16px). It is the only filled button on the page. Rationale: the brief's core loop is read → fix. Making Edit prominent is the single highest-leverage friction reduction.
- **Overflow menu `⋯`** (ghost icon button, `aria-label="More actions"`) contains exactly one item: `Archive article` in `--danger`. Archive is *not* a filled button on the page — it is destructive and rare. [DECISION]
- **Archive confirm dialog** copy is explicit about reversibility:
  > **Archive “Deploying the API”?**
  > It will be hidden from browse and search. The article and its history are kept, and it stays reachable by direct link.
  > [Cancel] [Archive article]
- **TOC** (`On this page`) is generated from `h2`/`h3` in the rendered body. It renders only if the body has ≥2 headings. Active item is determined by `IntersectionObserver` with `rootMargin: '-72px 0px -70% 0px'`, and the active item gets `aria-current="true"` plus a 2px `--color-accent` left border. Clicking scrolls smoothly (`scroll-behavior: smooth`, disabled under `prefers-reduced-motion`).
- **History** is a collapsible `<details>`-style section, **collapsed by default**. Header reads `History ({n} revisions)`. Expanding lists the 5 most recent: `#12 · Jason · 2 days ago · "Clarified the rollback steps"` with a `View` button opening a Radix dialog showing that revision's Markdown rendered read-only. **View-only — no restore.** [DECISION, matches §16.2]
- **Bottom CTA** repeats `Edit this article` after the body, because a reader who reached the bottom is the person most likely to have spotted something wrong.
- **Archived/404** distinction: an archived article renders normally with a badge and banner. A **missing slug** renders `articles/[slug]/not-found.tsx`: "We couldn't find that article." / "It may have been archived or the link may be wrong." / [Browse all articles] [Search]. Never the generic 404.

**States**

| State | What renders |
|---|---|
| Loading | `loading.tsx`: breadcrumb skeleton, title skeleton (60% width), 2 meta skeletons, body skeleton of 12 lines at 1.65 line-height, TOC skeleton of 4 items. |
| Not found | `articles/[slug]/not-found.tsx` as above. |
| Archived | Page renders + `Archived` badge + muted banner. |
| Draft | `Draft` badge next to the title. |
| Very long article | TOC sticky; a "Back to top" ghost button appears in the bottom-right at ≥2000px scroll depth. |
| Body renders no headings | TOC column collapses; content column stays centered (do not left-align). |

### 3.5 Wireflow — Editor (`/articles/new` and `/articles/[slug]/edit`)

Focused shell: no sidebar, no TOC, no search input.

```
┌ EDITOR HEADER (sticky, h-14, bg --surface, border-b) ────────────────────────────┐
│ ← Cancel    Edit article                      ● Unsaved changes    [ Save ]      │
│  (ghost)    (breadcrumb title, truncated)      (status pill)       (primary)     │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ MAIN (max-w-[1100px] centered, px-6 py-6) ───────────────────────────────────────┐
│ Title *                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Deploying the API                                                            │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│ Slug: deploying-the-api  [ Regenerate from title ]                               │
│                                                                                  │
│ Summary   (0 / 300)                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Step-by-step deploy guide for the internal API.                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ Category                            Status                                       │
│ ┌ Engineering ▾ ┐                   ┌ Draft ▾ ┐                                  │
│                                                                                  │
│ Body *                                            [ Write | Preview ]  ← <768px  │
│ ┌ Toolbar: B I H1 H2 🔗 • 1. ` </> ❝ ──────────────────────────────────────────┐ │
│ │ # Prerequisites                                                              │ │
│ │                                                                              │ │
│ │ - Node 24 LTS                                                                │ │
│ ├──────────────────────────┬───────────────────────────────────────────────────┤ │
│ │  MARKDOWN (left, 50%)    │  PREVIEW (right, 50%, live)                       │ │
│ │                          │                                                   │ │
│ │  ## Prerequisites        │  Prerequisites                                    │ │
│ │                          │                                                   │ │
│ │  - Node 24 LTS           │  • Node 24 LTS                                    │ │
│ │  - Access to deploy role │  • Access to deploy role                          │ │
│ │                          │                                                   │ │
│ └──────────────────────────┴───────────────────────────────────────────────────┘ │
│ Markdown supported — the preview updates as you type.                            │
│                                                                                  │
│ Change note (optional)  — shown in history                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ Clarified the rollback steps                                                 │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│                                          [ Cancel ]  [ Save article ]            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Editor rules**

| # | Rule |
|---|---|
| E1 | **Field order is fixed**: Title → Slug → Summary → Category/Status (2-up row) → Body → Change note → Actions. Title first because it is the one field every article must have. |
| E2 | **Slug is read-only text, not an input.** It renders inline under the title as `Slug: deploying-the-api` in 13px `--ink-subtle` with a `Regenerate from title` ghost button. Clicking it opens a confirm dialog: "Changing the slug will break existing links to this article." [Cancel] [Regenerate]. Slug regeneration is disabled for published articles unless the user confirms. |
| E3 | **Change note** appears only on the **edit** route (a create has no prior state to describe). Placeholder: "What changed? (optional)". |
| E4 | **Toolbar** is sticky to the top of the editor pane, 8 buttons, each with `aria-label` and a tooltip: Bold (`Ctrl/⌘+B`), Italic (`Ctrl/⌘+I`), H2, H3, Link (`Ctrl/⌘+K`), Bulleted list, Numbered list, Inline code, Code block, Quote. Buttons are 32×32px with a 4px gap. Active state uses `--surface-sunken` background. |
| E5 | **Preview parity is guaranteed** by reusing `react-markdown` + `remark-gfm` + `rehype-sanitize` with the same `prose` classes as `ArticleBody`. The preview pane scrolls independently and is **not** synchronized to the editor scroll (sync scrolling is a common source of jank and is not worth it). |
| E6 | **Save is explicit. There is no autosave.** A `beforeunload` guard fires when the form is dirty. In-app navigation away while dirty opens a confirm dialog. [DECISION, matches §9.3] |
| E7 | **Dirty tracking is optimistic**: any change to any field marks dirty. The status pill cycles `Saved` → `Unsaved changes` → `Saving…` → `Saved` / `Save failed`. |
| E8 | **The status pill is a `role="status"` live region.** Text: `Saved` (neutral), `Unsaved changes` (warning), `Saving…` (neutral + 12px spinner), `Save failed` (danger). |
| E9 | **Save button** is disabled when the form is invalid or a save is in flight. Label: `Save article` / `Save changes` (edit) / `Saving…` (pending, with spinner). |
| E10 | **"Save & create another"** is a secondary button on the **create** route only. It saves, shows a success toast, and resets the form in place at `/articles/new` with the category retained. [DECISION] Rationale: creating several articles in one sitting is the realistic content-owner behavior; the alternative (bounce to the detail page and back) adds 3 steps per article. |
| E11 | **Conflict banner** (see §5.5) replaces the form's top position and receives focus. |
| E12 | **Validation is `mode: 'onBlur'` then re-validate on change once a field has errored.** Errors never appear while the user is typing the first time through a field. |
| E13 | **`prefers-reduced-motion`** disables the toolbar/preview transitions and the toast slide. |

**Responsive editor**

| Width | Behavior |
|---|---|
| ≥1280px | Preview pane 50% width; editor 50%. Both scroll independently, both `min-h-[520px]`. |
| 768–1279px | Same side-by-side, 50/50. |
| <768px | **Tabbed**: `[ Write | Preview ]` segmented control above a single pane. The Markdown pane is full width. Toolbar wraps to two rows if needed. |
| Any width | Toolbar horizontally scrollable rather than wrapped below 480px. |

**States**

| State | What renders |
|---|---|
| Idle / saved | Pill `Saved`, `--ink-subtle` text, no dot. |
| Dirty | Pill `Unsaved changes`, `--warning` dot, `--warning` text on `--warning-soft`. |
| Saving | Pill `Saving…`, spinner, `aria-busy="true"` on the form. Save + Cancel disabled. |
| Save failed (validation) | Field errors inline; form-level `role="alert"` banner above the actions: "Please fix the highlighted fields." Focus moves to the first invalid field. |
| Save failed (server/network) | `role="alert"` banner: "We couldn't save your changes. Your text is still here." [Try again]. Pill `Save failed`. |
| Conflict (409) | Banner with focus (see §5.5). |
| Editor bundle loading | Skeleton block matching the editor's height (520px) with a centered "Loading editor…" `--ink-subtle` label. Never a bare spinner. |
| Body over limit | Character counter appears at 190,000 (`--warning`) and turns `--danger` at 200,000; Save disables and the hint reads "Article body is too large (200,000 character limit)." |
| Create, empty | Title empty, body empty, status `Draft`, category `Uncategorized`. **No pre-filled placeholder body** — an empty editor is less confusing than placeholder text the user must delete. |

---

## 4. Feature UX decisions

### 4.1 F1 — Browsing and article detail

| Decision | Resolution | Why |
|---|---|---|
| List density | **Row list, 20 rows/page, 72px row height.** | Information density is the brief's explicit tone. Card grids waste 40% of vertical space and force more scrolling for the same information. |
| Pagination | **Numbered pager** with `← Previous`, `Page 2 of 3`, `Next →`. Numbers cap at ±3 around the current page. | The URL is the state container (§9.5); page numbers are linkable and back-button-correct. Infinite scroll breaks the back button and makes the footer unreachable. |
| Page 1 total | Show `42 published · updated 4 minutes ago`. On page 1 the server does not compute a total (§9.1), so the count is the *visible* count and the pager reads `Page 1 of 3` only when a next page exists. | Honest UI: never display a number the server did not compute. When `hasNext` is true and `page === 1`, the pager renders `Page 1` + `Next →` without a fake total. |
| Sorting | `Updated` (default) · `Created` · `Title A–Z`. Hidden in search mode. | Relevance wins in search; offering a sort there would be misleading. |
| Status filter | Segmented select `Published` (default) · `Drafts` · `All`. | Drafts must be reachable, but they must not dilute the default view. |
| Return-from-detail | Browser back restores the exact list state (URL-driven) **and scroll position** (`scroll: false` on replace, native restoration on push). | The #1 browsing frustration is losing your place. |
| Reading time | `{n} min read` at 200 wpm, computed from `plainText(bodyMd)`. | Cheap, useful, and signals article length before reading. |

### 4.2 F2 — Search

| Decision | Resolution | Why |
|---|---|---|
| Primary surface | The **header input**, present on every route. | Search-first navigation is the brief's explicit guidance. A search box only on `/` means the user must first navigate home to search. |
| Secondary surface | **⌘K / Ctrl+K palette** (`cmdk`), plus a visible `⌘K` hint inside the input's right edge. | Power-user speed. The hint makes it discoverable. On Windows the hint renders `Ctrl K`. |
| Debounce | 250 ms, `router.replace` with `scroll: false`. | Balances request volume against perceived instantness. |
| Highlight | `<mark>` with `--color-mark-bg`; never color-only. | WCAG 1.4.1. |
| Result count | `role="status"`, `"{n} results for “{q}”"`. | §6.4 of the architecture spec requires announcement. |
| Category scoping | Chips in the results toolbar, not a route change. Searching inside a category keeps the user on `/search`. | One mental model for search. |
| Palette content | Top 8 results + "See all results for “{q}”". | The palette must never be a dead end. |

### 4.3 F3 — Editing

| Decision | Resolution | Why |
|---|---|---|
| Editor | **Markdown with live preview** (§9.3 D5), formatting toolbar for non-technical authors. | Locked by the architecture spec. |
| Save model | **Explicit save, no autosave**, `beforeunload` guard. | Autosave would generate revision noise and interact badly with optimistic concurrency (§9.3). |
| Exit path | `Cancel` and the `←` arrow both return to the article detail. If dirty, a confirm dialog intervenes: "Discard your unsaved changes?" [Keep editing] [Discard]. | Cancel must never silently destroy work. |
| Post-save | Redirect to `/articles/[slug]` with a success toast: "Article saved." (edit) / "Article created." (create). | Confirms persistence and returns the user to the reading context. |
| Change note | Optional, edit route only, shown in history. | Cheap provenance. Making it required would add friction to typo fixes. |
| Publish transition | Changing status `Draft → Published` on save sets `published_at` on first publish and shows a toast "Article published." | The state change is invisible otherwise (the user is redirected away). |

### 4.4 F4 — Categories (P1, modeled; minimal UI)

| Decision | Resolution | Why |
|---|---|---|
| Placement | **Sidebar**, always visible on browse/search/category/detail routes. | Persistent structure without a dedicated taxonomy screen. |
| Shape | Flat list of name + count. No nesting, no drag-reorder. | §16.2 non-goals. |
| Filter behavior | Clicking a category navigates to `/categories/[slug]`. The active row is highlighted with `--accent-soft` background + `--accent-ink` text and `aria-current="page"`. | Clear location signal. |
| Uncategorized | Renders as a real sidebar row with a count when ≥1 article has `category_id IS NULL`, navigating to `/categories/uncategorized`. | A null category must be navigable, otherwise articles become unreachable from the sidebar. |
| Creation | `New category` ghost button at the bottom of the sidebar list → Radix dialog: `Name` (required, 1–60), `Description` (optional, ≤200). | No dedicated admin screen. |
| Rename/delete | **[DEFERRED]** — not in v1. The sidebar list has no per-row menu. | The brief marks feature 4 as non-required; UI is cut before schema (§9.6). |
| Empty | When no categories exist, the sidebar list is replaced by "No categories yet" + `Create a category`. | One of the four canonical empty states. |

### 4.5 F5 — Status (P1, modeled; minimal UI)

| Decision | Resolution | Why |
|---|---|---|
| Control | A `Select` in the editor (Draft / Published). `Archived` is never selectable in the editor — archive is an action, not a state you type. | Prevents accidental archiving while editing. |
| Badge | `Draft` (`--warning-soft` / `--warning`) and `Archived` (`--surface-muted` / `--ink-muted`) render on cards, detail, and search results. **`Published` renders no badge.** | Default state; a badge on every row is noise. |
| Default scope | Browse and search default to `published`. | Matches the primary user's mental model. |
| Draft discoverability | The status filter exposes `Drafts`; the editor's "Save" on a draft redirects to the detail page where the `Draft` badge is visible. | Drafts must be findable without being in the way. |

### 4.6 Cross-cutting: the "Editing as" affordance

Because there is no auth (U4), revision history would read "Anonymous editor" for everyone. That silently degrades trust in History, so the design adds one small control:

- Sidebar footer chip: `Editing as  [ Jason ▾ ]`.
- Clicking opens a Radix dialog with a single field: `Display name` (1–40 chars, required). Save writes the `kb_display_name` cookie (1 year, `SameSite=Lax`).
- Default when unset: `Anonymous editor`. The chip renders it in `--ink-subtle` with a subtle `--warning` dot to signal "you should set this".
- Copy: "Your name appears in an article's history when you save. It is not a login."
- This is **one dialog and one cookie**. It is not authentication and must never be described as such in the UI.

---

## 5. Component specifications

Every component below lives at the path shown, matching `architecture.md` §5.1. Sizes are in rem at a 16px root.

### 5.1 `ui/button.tsx` — Button

`cva` variants: `primary` · `secondary` · `ghost` · `danger` · `link`. Sizes: `sm` (h-8, 13px) · `md` (h-9, 14px, **default**) · `lg` (h-10, 15px) · `icon` (h-8 w-8).

| Variant | Default | Hover | Active | Focus-visible | Disabled |
|---|---|---|---|---|---|
| primary | bg `--color-accent`, text `--color-accent-on` | bg `--color-accent-hover` | `translateY(0.5px)` | 2px `--color-ring` + 2px offset | bg `--color-disabled-bg`, text `--color-disabled-ink`, `cursor: not-allowed` |
| secondary | bg `--color-surface`, border 1px `--color-border-strong`, text `--color-ink` | bg `--color-surface-muted`, border `--color-border-strong` | bg `--color-surface-sunken` | as primary | as primary |
| ghost | transparent, text `--color-ink-muted` | bg `--color-surface-muted`, text `--color-ink` | bg `--color-surface-sunken` | as primary | as primary |
| danger | bg `--color-danger`, text `--color-danger-on` | bg `--color-danger-hover` | as primary | as primary | as primary |
| link | transparent, text `--color-accent-ink`, underline on hover | underline, text `--color-accent-ink-hover` | — | as primary | as primary |

All buttons: `border-radius: --radius-control` (6px), `font-weight: 500`, `transition: background-color 120ms, color 120ms, border-color 120ms`, `white-space: nowrap`. Never `outline: none`. Every icon-only button requires an `aria-label`; decorative icons inside a labelled button get `aria-hidden="true"`.

**Loading state**: the button keeps its width (the spinner replaces the icon slot, or a leading spinner is prepended while the label stays). Never collapse the label to a spinner alone — it causes layout shift and removes the accessible name.

### 5.2 `ui/field.tsx` — Field

The only way to render a labelled control. Structure:

```
<div class="grid gap-1.5">
  <label for={id} class="text-[13px] font-medium text-ink">
    {label} {required && <span aria-hidden="true" class="text-danger">*</span>}
  </label>
  {control}
  {hint && <p id={`${id}-hint`} class="text-[12px] text-ink-subtle">{hint}</p>}
  {error && <p id={`${id}-error`} role="alert" class="text-[12px] text-danger">{error}</p>}
</div>
```

- The control receives `aria-describedby` = joined ids of hint + error (only present ones), and `aria-invalid="true"` when errored.
- Required is indicated by a visible `*` **and** the `required` attribute on the control — never by color alone.
- Error text is 12px `--color-danger` (5.36:1 on `--surface`), prefixed by `AlertCircle` 14px `aria-hidden`.
- Field error transition: none. Errors appear instantly (motion on an error message delays comprehension).

### 5.3 `articles/article-card.tsx` — ArticleCard

Props: `{ title, slug, summary, excerpt, status, category, updatedAt }`.

```
<a href="/articles/{slug}"
   class="group flex items-start gap-4 px-4 py-3.5 border-b border-border
          hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
  <div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-2">
      <h3 class="truncate text-[17px] font-semibold leading-snug text-ink
                 group-hover:text-accent-ink">{title}</h3>
      {status !== 'published' && <StatusBadge status={status} />}
    </div>
    <p class="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink-muted">{summary ?? excerpt}</p>
    <p class="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-subtle">
      <span>{category?.name ?? 'Uncategorized'}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={iso} title={absolute}>{relative}</time>
    </p>
  </div>
</a>
```

Row height with a 2-line summary: **72px**. The whole row is the target (`min-height: 72px`) — no small sub-targets.

### 5.4 `search/search-input.tsx` — SearchInput

- `<input type="search" role="searchbox">` inside a `--surface-muted` pill, `--radius-control`, height 36px, 14px text.
- Leading `Search` icon (16px, `--ink-subtle`, `aria-hidden`). Trailing `⌘K` / `Ctrl K` hint in a 20px `--surface-sunken` key cap, hidden below 1024px.
- When non-empty, a trailing `X` clear button (`aria-label="Clear search"`, 24×24px target, `--ink-subtle` → `--ink` on hover).
- `aria-label="Search articles"`, `autoComplete="off"`, `spellCheck="false"`, `maxLength={200}`.
- Escape clears the input when focused. `/` anywhere on the page (when not in a text field) focuses the input. `⌘K`/`Ctrl+K` opens the palette.
- **`role="search"` on the wrapping `<form>`** so screen readers announce the landmark.
- On `/search`, the input value is seeded from `q` and updated by `router.replace` — it is never a `defaultValue`, or back-navigation would desync.

### 5.5 Conflict banner

Rendered by `article-form.tsx` when the Server Action returns `conflict: true`. It is the highest-priority message in the app, so it gets the strongest treatment.

```
<div role="alert" tabIndex={-1} ref={focusRef}
     class="rounded-card border border-warning/40 bg-warning-soft p-4">
  <div class="flex gap-3">
    <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
    <div class="flex-1">
      <p class="text-[15px] font-semibold text-ink">This article was updated by someone else.</p>
      <p class="mt-1 text-[13px] text-ink-muted">
        Reload the latest version to see their changes, or copy your text first so nothing is lost.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" size="sm">Reload latest version</Button>
        <Button variant="secondary" size="sm">Copy my text</Button>
      </div>
    </div>
  </div>
</div>
```

- On mount: `focusRef.current?.focus()` so a screen-reader user is told immediately.
- **`Copy my text` is placed before any destructive path and never hidden.** It is the escape hatch that makes "reload discards my edits" acceptable.
- `Reload latest version` opens a confirm dialog: "Your unsaved edits will be discarded. Copy them first if you want to keep them." [Keep editing] [Discard and reload].
- `Copy my text` writes `title + "\n\n" + summary + "\n\n" + bodyMd` to the clipboard and swaps its label to `Copied` for 2 s with a `role="status"` announcement.

### 5.6 `ui/empty-state.tsx` — EmptyState

Props: `{ icon, title, description, action? }`. Layout: centered column, `max-w-sm`, `py-16`, icon 32px `--ink-subtle` `aria-hidden`, title 18px semibold `--ink`, description 14px `--ink-muted`, action `Button variant="primary" size="md"`. Never an illustration, never a gradient.

**The four canonical states (copy is exact — do not paraphrase):**

| # | Trigger | Title | Description | Action |
|---|---|---|---|---|
| 1 | No articles at all | `No articles yet` | `Create the first article to start building your team's knowledge base.` | `New article` → `/articles/new` |
| 2 | Search returned nothing | `No results for “{q}”` | `Try a different term, or browse all articles.` | `Clear search` → `/` |
| 3 | Category has no articles | `Nothing in {category} yet` | `Articles you assign to this category will appear here.` | `New article in {category}` → `/articles/new?category={slug}` |
| 4 | No categories exist | `No categories yet` | `Categories help you group related articles.` | `Create a category` → opens dialog |
| 5 | Filter combination yields nothing | `No articles match these filters.` | `Try removing a filter.` | `Clear filters` → `/` |

(State 5 is an addition to the four in §6.5 of the architecture spec: the filter bar can produce an empty set even when articles exist, and that must not be confused with state 1.)

Icons per state: 1 `FileText`, 2 `SearchX`, 3 `FolderOpen`, 4 `FolderPlus`, 5 `FilterX`. All `lucide-react`.

### 5.7 `ui/skeleton.tsx` — Skeleton

`--surface-sunken` block with `--radius-control`, no shimmer below 400 ms. Above 400 ms, a 1.6 s linear `background-position` shimmer at 6% opacity difference. `aria-hidden="true"` and wrapped in a container with `role="status"` + `aria-label="Loading"` on the *section*, not each block — otherwise screen readers announce dozens of meaningless nodes.

### 5.8 `ui/toast.tsx` — Toast

- Bottom-right, `max-w-sm`, `--surface`, 1px `--border`, `--shadow-overlay`, `--radius-card`, 12px padding.
- Slide-up 180 ms; auto-dismiss 4 s for success, 8 s for errors, **never for errors that require action** (those get a banner, not a toast).
- `role="status"` for success, `role="alert"` for errors. Close button with `aria-label="Dismiss"`.
- Only three toasts exist in v1: `Article saved.`, `Article created.`, `Article archived.` plus their error counterparts.

### 5.9 `filters/filter-bar.tsx` and `filters/pagination.tsx`

- **FilterBar** is a single row, 36px tall, `gap-2`, wrapping below 768px. It contains: category chips (scrollable horizontally with `overflow-x: auto` and `scrollbar-width: none`), a status `Select`, a sort `Select` (hidden in search mode), and a right-aligned result count. All changes go through `useTransition` + `router.replace`.
- **Pagination** is a `nav[aria-label="Pagination"]` with an ordered list. Buttons are 36×36px. Current page is `aria-current="page"` with `--accent-soft` background. Disabled `Previous`/`Next` are real `<span>`s with `aria-disabled="true"`, not links, so they are skipped in tab order.

---

## 6. Responsive design

### 6.1 Breakpoints (Tailwind v4 defaults, unchanged)

| Name | Min width | Shell |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | Side-by-side editor preview; list meta line stays inline |
| `lg` | 1024px | **Sidebar visible**; drawer removed; header search input shown |
| `xl` | 1280px | **TOC column appears** on detail routes |

Minimum supported width: **360px**. No horizontal overflow at any width ≥360px (asserted in `responsive.spec.ts`).

### 6.2 Adaptation matrix

| Element | <768px | 768–1023px | 1024–1279px | ≥1280px |
|---|---|---|---|---|
| Header | h-14; hamburger + wordmark + search icon + `+` icon; search expands to a full-width overlay row on tap | h-14; hamburger + wordmark + full search input + `+ New article` + theme + avatar | same | same |
| Sidebar | Off-canvas Radix `Dialog` drawer from the left, 280px, opened by `☰` | Same drawer | Sticky 240px column | Sticky 240px column |
| Content | `px-4`, full width | `px-6`, `max-w-3xl` | `max-w-3xl` | `max-w-3xl` |
| TOC | Hidden | Hidden | Hidden | Sticky 200px column |
| ArticleCard meta | Category on its own line under the summary | inline | inline | inline |
| Editor preview | Tabbed (`Write`/`Preview`) | Side-by-side 50/50 | Side-by-side 50/50 | Side-by-side 50/50 |
| Detail action row | `Edit` full-width, `⋯` beside it | inline | inline | inline |
| FilterBar | 2 rows, chips scroll horizontally | 1 row | 1 row | 1 row |
| Pagination | `← Prev` / `2 / 3` / `Next →` (numbers collapse) | full numbered pager | full numbered pager | full numbered pager |
| Page gutter | `--space-4` | `--space-6` | `--space-6` | `--space-6` |

### 6.3 Mobile navigation drawer

- Radix `Dialog` with `modal`, rendered from the left, 280px wide, full height, `--surface`, `--shadow-overlay`.
- Contains: wordmark, the full category list, `New category`, and the `Editing as` chip.
- Focus is trapped; `Escape` closes; focus returns to the `☰` button.
- Overlay is `oklch(0 0 0 / 0.4)`.
- Slide-in 200 ms `ease-out`; `prefers-reduced-motion` makes it instant.
- The hamburger is 40×40px with `aria-label="Open navigation"` and `aria-expanded`.

### 6.4 Touch targets

| Element | Minimum size | Note |
|---|---|---|
| All interactive controls | **44×44 CSS px** on touch viewports | Achieved by padding + a pseudo-element hit area, not by visually enlarging small controls. |
| Filter chips | 32px visual height, 44px hit area | `::after { inset: -6px 0; }` |
| Card rows | 72px | Already above the minimum. |
| Pagination buttons | 36px visual, 44px hit area | |
| Toolbar buttons | 32px visual, 44px hit area | |
| Table of contents items | 32px visual, 44px hit area | |
| Inline text links | 44px hit area only where they are the primary action; prose links inside `ArticleBody` are exempt | Enlarging prose link targets would break line-height rhythm. |
| Minimum gap between adjacent targets | 8px | |

### 6.5 Mobile-specific patterns

- **Search**: on `<768px` the header shows a search icon; tapping it expands the input to a full-width row beneath the header with focus applied and the keyboard raised. `Escape` or blur with an empty value collapses it.
- **Article detail**: the TOC is replaced by an inline "On this page" `<details>` block directly under the meta line, collapsed by default.
- **Editor**: sticky bottom action bar on `<768px` (`position: sticky; bottom: 0`) containing `Cancel` and `Save article`, so the primary action is always reachable while typing.
- **Toasts**: full width minus `--space-4` gutters, anchored to the bottom.
- **No hover-only affordances.** Anything revealed on hover (the card's `⋯`, the clear button) must also be reachable by focus and be permanently visible on touch viewports.

### 6.6 Tablet specifics (the stated floor)

Tested at **834×1112** (iPad landscape) and **1280×800** (desktop). At 834px the layout is single-column with the drawer, which means:

- The header must still expose `+ New article` as a labelled button (not an icon) at 834px — there is room, and it is the second-most-common action.
- The editor is side-by-side at 834px. Both panes must remain usable at 50% of ~786px content width (≈390px each) — this is why the editor content column is `max-w-[1100px]` rather than `max-w-3xl`.
- Tap targets at 834px are touch-sized (44px), same as phone.

---

## 7. UI states

### 7.1 Global state inventory

| Element | Default | Hover | Focus-visible | Active/Pressed | Loading | Empty | Error | Success | Disabled |
|---|---|---|---|---|---|---|---|---|---|
| Primary button | ✓ | ✓ | ✓ | ✓ | label + spinner, width locked | n/a | n/a | n/a | ✓ |
| Secondary button | ✓ | ✓ | ✓ | ✓ | as primary | n/a | n/a | n/a | ✓ |
| Ghost/icon button | ✓ | ✓ | ✓ | ✓ | spinner replaces icon | n/a | n/a | n/a | ✓ |
| Text input | ✓ | border `--border-strong` | ✓ | — | — | placeholder | `--danger` border + error text + `aria-invalid` | — | ✓ |
| Select | ✓ | ✓ | ✓ | open listbox | — | "Uncategorized" | as input | — | ✓ |
| Search input | ✓ | ✓ | ✓ | — | results show progress bar | placeholder | never errors | — | — |
| ArticleCard | ✓ | bg `--surface-muted`, title `--accent-ink` | ring inset | — | skeleton row | n/a | n/a | n/a | n/a |
| Sidebar row | ✓ | bg `--surface-muted` | ✓ | — | skeleton | empty state | — | — | — |
| Sidebar row (active) | bg `--accent-soft`, text `--accent-ink`, `aria-current="page"` | — | ✓ | — | — | — | — | — | — |
| Filter chip | ✓ | ✓ | ✓ | selected: `--accent-soft` + `--accent-ink` | — | — | — | — | ✓ (no results) |
| Pagination button | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ |
| TOC item | ✓ | text `--ink` | ✓ | — | skeleton | hidden if <2 headings | — | — | — |
| TOC item (active) | `--accent-ink` + 2px left border | — | — | — | — | — | — | — | — |
| `<mark>` | bg `--color-mark-bg` | — | — | — | — | — | — | — | — |
| Toast | ✓ | — | ✓ (close) | — | — | — | `role="alert"` | `role="status"` | — |
| Dialog | ✓ | — | ✓ | — | — | — | — | — | — |
| Theme toggle | ✓ | ✓ | ✓ | — | — | — | — | — | — |

### 7.2 Focus ring

One ring everywhere, defined once:

```css
--focus-ring: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-ring);
```

Applied as `:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }` for elements where a box-shadow ring would be clipped (e.g. inside `overflow: hidden` rows, use `outline-offset: -2px`). Contrast of `--color-ring` against `--surface`: **5.39:1** (light) and **7.44:1** (dark) — both exceed the 3:1 requirement for non-text contrast.

### 7.3 Empty states

Covered in §5.6. **Rule: no list surface may render blank.** Every list route must be able to produce a titled, described, actionable empty state.

### 7.4 Error states

Three levels, in order of proximity to the failure:

| Level | Component | Content | Recovery |
|---|---|---|---|
| Field | `Field` error text | The Zod message, verbatim. | Fix the field. |
| Form | `role="alert"` banner above the actions | "We couldn't save your changes. Your text is still here." | `Try again` |
| Route | `error.tsx` panel | "Something went wrong loading this page." + `Reference: {digest}` (12px `--ink-subtle`, selectable) | `Try again` (calls `reset()`) + `Go to all articles` |
| App | `global-error.tsx` | Minimal centered panel, same copy. | `Reload` |

- The digest is displayed, never a stack trace.
- Route errors render **inside** the shell (header + sidebar stay usable) so the user can navigate away without a full reload.
- 404 for an unknown slug is `not-found.tsx`, not `error.tsx` — see §3.4.

### 7.5 Loading states

| Context | Treatment |
|---|---|
| Route first paint | `loading.tsx` per route with layout-matched skeletons. |
| Filter / sort / page change | Content at 60% opacity, 2px header progress bar. **No skeleton** — the content is already known, just stale. |
| Search keystroke | Same as above. |
| Save | Button spinner + label change + `aria-busy` on the form + status pill `Saving…`. |
| Editor bundle | 520px skeleton + "Loading editor…" label. |
| Command palette search | Inline spinner in the palette's right edge; previous results stay visible. |
| Never | A bare centered spinner on a full page. |

### 7.6 Success states

| Action | Feedback |
|---|---|
| Create article | Redirect to detail + toast `Article created.` |
| Save edit | Redirect to detail + toast `Article saved.` |
| Publish transition | Toast `Article published.` (replaces `Article saved.`) |
| Archive | Redirect to `/` + toast `Article archived.` with an `Undo` action (5 s) that calls `PATCH { status: 'published' }`. |
| Create category | Dialog closes, sidebar list updates optimistically, toast `Category created.` |
| Set display name | Dialog closes, chip updates, toast `Display name saved.` |
| Copy my text | Button label → `Copied` for 2 s, `role="status"` announcement. |

The **Undo** on archive is the one place v1 offers an inline reversal. It is cheap (a status write) and removes the fear from the only destructive action in the app.

---

## 8. Visual style system

### 8.1 Design tokens — `src/app/globals.css`

Copy this block verbatim. Tailwind v4 `@theme` makes each token a real CSS custom property *and* a utility (e.g. `bg-surface`, `text-ink-muted`, `rounded-card`).

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Manual (class-based) dark mode so next-themes can drive it. */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* ── Surfaces ─────────────────────────────────────────────── */
  --color-surface:        oklch(0.995 0 0);        /* #FDFDFD */
  --color-surface-muted:  oklch(0.972 0.004 250);  /* #F4F6F8 */
  --color-surface-sunken: oklch(0.955 0.005 250);  /* #EEF0F3 */

  /* ── Lines ────────────────────────────────────────────────── */
  --color-border:         oklch(0.905 0.006 250);  /* #DDE0E3  decorative only */
  --color-border-strong:  oklch(0.640 0.018 250);  /* #848D97  ≥3:1 — inputs, secondary buttons */
  --color-divider:        oklch(0.930 0.005 250);  /* #E5E8EB */

  /* ── Text ─────────────────────────────────────────────────── */
  --color-ink:            oklch(0.240 0.012 250);  /* #1B2025  16.20:1 */
  --color-ink-muted:      oklch(0.500 0.014 250);  /* #5D646B   5.90:1 */
  --color-ink-subtle:     oklch(0.580 0.014 250);  /* #747B83   4.22:1  meta text ≥12px only */

  /* ── Accent ───────────────────────────────────────────────── */
  --color-accent:         oklch(0.525 0.165 255);  /* #0F69C6  button fill */
  --color-accent-hover:   oklch(0.470 0.160 255);  /* #0058B1 */
  --color-accent-soft:    oklch(0.965 0.028 255);  /* #E7F5FF  selected/active backgrounds */
  --color-accent-ink:     oklch(0.470 0.150 255);  /* #0859AC  links, 6.82:1 */
  --color-accent-ink-hover: oklch(0.420 0.150 255);/* #004A9C */
  --color-accent-on:      oklch(1 0 0);            /* white text on --color-accent, 5.47:1 */

  /* ── Semantic ─────────────────────────────────────────────── */
  --color-success:        oklch(0.500 0.120 152);  /* #1A763F   5.59:1 */
  --color-success-soft:   oklch(0.960 0.028 152);  /* #E5F8E9 */
  --color-warning:        oklch(0.500 0.115 70);   /* #8C5500   6.06:1 */
  --color-warning-soft:   oklch(0.975 0.030 85);   /* #FFF6E1 */
  --color-danger:         oklch(0.545 0.185 27);   /* #C5312E   5.36:1 */
  --color-danger-hover:   oklch(0.495 0.185 27);   /* #B01F1E */
  --color-danger-soft:    oklch(0.960 0.028 27);   /* #FFEBE8 */
  --color-danger-on:      oklch(1 0 0);            /* white     6.08:1 on danger */

  /* ── Focus + selection ────────────────────────────────────── */
  --color-ring:           oklch(0.525 0.165 255);  /* #0F69C6   5.39:1 */
  --color-mark-bg:        oklch(0.925 0.075 95);   /* #F6E6AD   ink 13.22:1 */
  --color-selection-bg:   oklch(0.860 0.090 255);  /* #A9D4FF   ink 10.63:1 */

  /* ── Disabled ─────────────────────────────────────────────── */
  --color-disabled-bg:    oklch(0.955 0.005 250);  /* #EEF0F3 */
  --color-disabled-ink:   oklch(0.620 0.012 250);  /* #81878D   3.19:1 on disabled-bg */

  /* ── Overlay ──────────────────────────────────────────────── */
  --color-overlay:        oklch(0 0 0 / 0.40);

  /* ── Radius ───────────────────────────────────────────────── */
  --radius-control: 0.375rem;  /*  6px  inputs, buttons, chips  */
  --radius-card:    0.75rem;   /* 12px  cards, panels, dialogs  */
  --radius-pill:    9999px;    /*        badges                 */

  /* ── Typography ───────────────────────────────────────────── */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;

  --text-2xs: 0.6875rem;  /* 11px  uppercase section labels only */
  --text-xs:  0.75rem;    /* 12px  meta, badges, hints */
  --text-sm:  0.8125rem;  /* 13px  field labels, table text */
  --text-base:0.875rem;   /* 14px  UI body, buttons, list summaries */
  --text-md:  1rem;       /* 16px  ARTICLE BODY — the reading size */
  --text-lg:  1.0625rem;  /* 17px  card titles, section headings */
  --text-xl:  1.25rem;    /* 20px  h2 in article body */
  --text-2xl: 1.5rem;     /* 24px  page sub-titles */
  --text-3xl: 2rem;       /* 32px  page h1, article h1 */
  --text-4xl: 2.5rem;     /* 40px  reserved; landing only, unused in v1 */

  --leading-tight:   1.25;
  --leading-snug:    1.35;
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;   /* article body */

  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;

  /* ── Spacing (4px base) ───────────────────────────────────── */
  --space-1:  0.25rem;  /*  4px */
  --space-2:  0.5rem;   /*  8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* ── Layout ───────────────────────────────────────────────── */
  --layout-header-h:  3.5rem;   /* 56px */
  --layout-sidebar-w: 15rem;    /* 240px */
  --layout-toc-w:     12.5rem;  /* 200px */
  --layout-measure:   68ch;     /* article reading measure */

  /* ── Elevation (deliberately minimal) ─────────────────────── */
  --shadow-card:    0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-overlay: 0 8px 24px oklch(0 0 0 / 0.12);
  --shadow-dialog:  0 16px 48px oklch(0 0 0 / 0.18);

  /* ── Motion ───────────────────────────────────────────────── */
  --duration-fast:   120ms;
  --duration-base:   180ms;
  --duration-slow:   240ms;
  --ease-standard:   cubic-bezier(0.2, 0, 0, 1);
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
}

.dark {
  --color-surface:        oklch(0.190 0.012 250);  /* #101419 */
  --color-surface-muted:  oklch(0.240 0.013 250);  /* #1B2025 */
  --color-surface-sunken: oklch(0.165 0.012 250);  /* #0A0F13 */

  --color-border:         oklch(0.320 0.014 250);  /* #2E343A */
  --color-border-strong:  oklch(0.540 0.018 250);  /* #677079  ≥3:1 */
  --color-divider:        oklch(0.280 0.012 250);  /* #22272C */

  --color-ink:            oklch(0.965 0.005 250);  /* #F1F4F7  16.68:1 */
  --color-ink-muted:      oklch(0.740 0.014 250);  /* #A4ACB4   8.01:1 */
  --color-ink-subtle:     oklch(0.620 0.014 250);  /* #80878E   5.08:1 */

  --color-accent:         oklch(0.565 0.170 255);  /* #1C75D6  white text 4.61:1 */
  --color-accent-hover:   oklch(0.610 0.160 255);  /* #3683E0 */
  --color-accent-soft:    oklch(0.290 0.045 255);  /* #1C2C41 */
  --color-accent-ink:     oklch(0.800 0.115 255);  /* #8AC1FF   9.80:1 */
  --color-accent-ink-hover: oklch(0.860 0.100 255);/* #A5D4FF */
  --color-accent-on:      oklch(1 0 0);

  --color-success:        oklch(0.780 0.130 152);  /* #72CF8E   9.70:1 */
  --color-success-soft:   oklch(0.290 0.040 152);  /* #1B3121 */
  --color-warning:        oklch(0.820 0.140 85);   /* #EEBC4A  10.49:1 */
  --color-warning-soft:   oklch(0.300 0.045 85);   /* #382C11 */
  --color-danger:         oklch(0.550 0.190 27);   /* #C9302D  white text 5.34:1 */
  --color-danger-hover:   oklch(0.580 0.190 27);   /* #D33B36  white text 4.71:1 */
  --color-danger-soft:    oklch(0.290 0.045 27);   /* #3F221F */
  --color-danger-on:      oklch(1 0 0);

  --color-ring:           oklch(0.720 0.130 255);  /* #6AA7F4   7.44:1 */
  --color-mark-bg:        oklch(0.440 0.085 85);   /* #684E0C   ink 7.07:1 */
  --color-selection-bg:   oklch(0.380 0.080 255);  /* #23436C   ink 9.06:1 */

  --color-disabled-bg:    oklch(0.260 0.012 250);  /* #212730 */
  --color-disabled-ink:   oklch(0.580 0.012 250);  /* #757B81   3.63:1 on disabled-bg */

  --color-overlay:        oklch(0 0 0 / 0.60);

  --shadow-card:    0 1px 2px oklch(0 0 0 / 0.40);
  --shadow-overlay: 0 8px 24px oklch(0 0 0 / 0.50);
  --shadow-dialog:  0 16px 48px oklch(0 0 0 / 0.60);
}

/* Base */
@layer base {
  :root { color-scheme: light; }
  .dark { color-scheme: dark; }

  html { -webkit-text-size-adjust: 100%; }

  body {
    background: var(--color-surface);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: var(--leading-normal);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  ::selection { background: var(--color-selection-bg); }

  :focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }

  /* Article body reading measure + rhythm */
  .prose {
    max-width: var(--layout-measure);
    font-size: var(--text-md);
    line-height: var(--leading-relaxed);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

> **Note on the accent in dark mode.** Dark mode uses a *different* accent for button fills (`--color-accent` = `#1C75D6`, white text) than for links (`--color-accent-ink` = `#8AC1FF`). This is deliberate: a single blue cannot simultaneously give white text 4.5:1 on a fill *and* give body text 4.5:1 on a dark surface. Two tokens, two jobs.

### 8.2 Palette rationale

- **One accent hue (255°), one neutral hue (250°).** The 5° separation means the accent reads as "the same family, brighter" rather than a clashing second color. Calm is a direct consequence of hue discipline.
- **Warm neutrals would be wrong here.** A knowledge base is a reference tool; cool neutrals read as "document" and warm neutrals read as "marketing".
- **Semantic colors are used only for status, never for decoration.** `--color-warning` appears on exactly three things: the `Draft` badge, the `Unsaved changes` pill, and the conflict banner. `--color-danger` appears on exactly three: field errors, the Archive action, and route errors.
- **Dark mode is not inverted light mode.** Surface lightness is `0.19` (not `0`), borders are lighter than surfaces, and the accent is lighter and less saturated. Pure-black backgrounds cause halation with white text on OLED and look harsh in a long reading session.
- **`--color-border` (1.31:1) is decorative only** — it separates rows. Anything that must be *perceived* as a boundary (input outlines, secondary button borders, focus-adjacent edges) uses `--color-border-strong` at ≥3:1, satisfying WCAG 1.4.11.

### 8.3 Typography

**Family:** system UI stack (§8.1 `--font-sans`), monospace for code (§8.1 `--font-mono`). Optional `Inter` only if self-hosted via `next/font/local` (U7).

**Why 14px base UI / 16px article body** [DECISION]: The UI is dense and scannable, so 14px maximizes information per viewport; the *reading surface* is 16px/1.65 with a 68ch measure. This split is the single most important typographic decision in the spec — it lets the app be both information-dense and comfortable to read.

| Role | Token | Size | Weight | Line height | Color | Notes |
|---|---|---|---|---|---|---|
| Page h1 (list) | `--text-3xl` | 32px | 600 | 1.25 | `--ink` | `letter-spacing: -0.02em` |
| Article h1 (detail) | `--text-3xl` | 32px | 600 | 1.25 | `--ink` | same |
| Editor article title input | `--text-2xl` | 24px | 600 | 1.35 | `--ink` | larger than a normal input on purpose |
| Article h2 | `--text-xl` | 20px | 600 | 1.35 | `--ink` | `margin-top: 2em` |
| Article h3 | `--text-lg` | 17px | 600 | 1.4 | `--ink` | |
| Card title | `--text-lg` | 17px | 600 | 1.35 | `--ink` | truncate 1 line |
| UI body / button | `--text-base` | 14px | 400/500 | 1.5 | `--ink` | |
| List summary | `--text-base` | 14px | 400 | 1.5 | `--ink-muted` | clamp 2 lines |
| Article body | `--text-md` | 16px | 400 | 1.65 | `--ink` | measure 68ch |
| Field label | `--text-sm` | 13px | 500 | 1.4 | `--ink` | |
| Meta line | `--text-xs` | 12px | 400 | 1.4 | `--ink-subtle` | never below 12px |
| Badge | `--text-xs` | 12px | 500 | 1 | varies | uppercase, `letter-spacing: 0.02em` |
| Hint | `--text-xs` | 12px | 400 | 1.4 | `--ink-subtle` | |
| Error | `--text-xs` | 12px | 500 | 1.4 | `--danger` | |
| Section label (sidebar) | `--text-2xs` | 11px | 600 | 1.2 | `--ink-subtle` | uppercase, `letter-spacing: 0.06em` |
| Code (inline + block) | `--text-sm` | 13px | 400 | 1.6 | `--ink` | `--font-mono` |

**Rules**

1. **Never go below 11px.** 11px is reserved for uppercase section labels only.
2. **Uppercase is only used for 11px section labels and 12px badges**, always with `letter-spacing: 0.06em` / `0.02em`. Never uppercase a heading or a button.
3. **Body copy never exceeds 68ch.** Enforced by `--layout-measure` on `.prose`; the list column is `max-w-3xl` which is narrower than 68ch at 16px, so both are safe.
4. **`font-weight: 700` is not used.** Max is 600. At small sizes on non-retina displays 700 looks heavy and hurts the "calm" goal.
5. **Numbers in meta lines** use `font-variant-numeric: tabular-nums` where they align in columns (article counts in the sidebar, revision numbers).

### 8.4 Spacing scale

4px base, tokens in §8.1. Application rules:

| Context | Value |
|---|---|
| Between form fields | `--space-5` (20px) |
| Between a label and its control | `--space-1` (4px) — actually `gap-1.5` = 6px in `Field` |
| Between a control and its error text | `--space-1` (4px) |
| Card internal padding | `--space-4` (16px) horizontal, `--space-3.5` vertical |
| Between cards | 0 (they share a 1px border) |
| Page section spacing | `--space-8` (32px) |
| Page top/bottom padding | `--space-8` (32px) |
| Sidebar item padding | `--space-2` vertical, `--space-3` horizontal |
| Toolbar gap | `--space-2` (8px) |
| Dialog padding | `--space-6` (24px) |
| Toast padding | `--space-3` (12px) |
| Between inline icon and text | `--space-1.5` (6px) |

**Do not invent intermediate values.** If a spacing need falls between tokens, use the nearer token. Arbitrary `margin: 13px` is a review failure.

### 8.5 Iconography

- **Library:** `lucide-react` 1.44.0 (already a dependency).
- **Default size:** 16px in UI, 20px in headers and empty states, 14px for inline-in-text and field errors.
- **Stroke width:** 1.75 (lucide default is 2; 1.75 reads lighter and matches the calm tone). Set once via `<Icon strokeWidth={1.75} />` or a wrapper.
- **Color:** inherits `currentColor`. Never a second color inside one icon.
- **Alignment:** icons in buttons use `gap: 6px`; icons are vertically centered on the text's cap height, not its baseline.

**Icon inventory (complete — do not add icons beyond this list in v1):**

| Purpose | Icon | Size |
|---|---|---|
| Search | `Search` | 16 |
| Clear search | `X` | 14 |
| New / create | `Plus` | 16 |
| Edit article | `Pencil` | 16 |
| More actions | `MoreHorizontal` | 16 |
| Archive | `Archive` | 16 |
| History / revisions | `History` | 16 |
| Back / cancel | `ArrowLeft` | 16 |
| Navigation (mobile) | `Menu` | 20 |
| Theme: light | `Sun` | 16 |
| Theme: dark | `Moon` | 16 |
| Theme: system | `Monitor` | 16 |
| Category | `Folder` | 14 |
| Empty: no articles | `FileText` | 32 |
| Empty: no results | `SearchX` | 32 |
| Empty: empty category | `FolderOpen` | 32 |
| Empty: no categories | `FolderPlus` | 32 |
| Empty: no filter match | `FilterX` | 32 |
| Error / warning | `AlertTriangle` | 16 / 20 |
| Field error | `AlertCircle` | 14 |
| Success | `CheckCircle2` | 16 |
| TOC / heading | `Hash` | 14 |
| Reading time | `Clock` | 14 |
| External / slug | `Link2` | 14 |
| Toolbar: bold | `Bold` | 16 |
| Toolbar: italic | `Italic` | 16 |
| Toolbar: link | `Link` | 16 |
| Toolbar: list | `List` | 16 |
| Toolbar: ordered list | `ListOrdered` | 16 |
| Toolbar: code | `Code` | 16 |
| Toolbar: code block | `SquareCode` | 16 |
| Toolbar: quote | `Quote` | 16 |

**Rules:** every meaningful icon has adjacent text or an `aria-label`; every decorative icon is `aria-hidden="true"`; never use an icon as the *only* signal for status (the `Draft` badge has text *and* color).

### 8.6 Motion

| Interaction | Duration | Easing | Property |
|---|---|---|---|
| Button hover / chip select | 120ms | `--ease-standard` | background-color, color, border-color |
| Card hover | 120ms | `--ease-standard` | background-color |
| Drawer slide | 200ms | `--ease-out` | transform |
| Dialog fade + scale (0.98 → 1) | 180ms | `--ease-out` | opacity, transform |
| Toast slide-up | 180ms | `--ease-out` | transform, opacity |
| Progress bar | indeterminate | linear | transform |
| Skeleton shimmer | 1600ms | linear, infinite | background-position |
| Scroll to heading | `smooth` | native | scroll |

**Never animate:** layout-affecting properties (`width`, `height`, `margin`, `top`), the content column on navigation, or anything on initial page load. `prefers-reduced-motion: reduce` collapses all of the above to `0.01ms` (§8.1 base layer).

---

## 9. Accessibility

Target: **WCAG 2.1 AA** for shipped flows (a floor, per `architecture.md` §13.5).

### 9.1 Contrast — verified pairs

All ratios computed from the sRGB values in §8.1. **These must not be changed without recomputing.**

**Light theme**

| Foreground | Background | Ratio | Requirement | Status |
|---|---|---|---|---|
| `--ink` | `--surface` | 16.20:1 | 4.5:1 | ✅ |
| `--ink` | `--surface-muted` | 15.16:1 | 4.5:1 | ✅ |
| `--ink-muted` | `--surface` | 5.90:1 | 4.5:1 | ✅ |
| `--ink-muted` | `--surface-muted` | 5.53:1 | 4.5:1 | ✅ |
| `--ink-subtle` | `--surface` | 4.22:1 | 4.5:1 | ⚠️ **large/bold text only** — see note |
| `--accent-ink` | `--surface` | 6.82:1 | 4.5:1 | ✅ |
| `--accent-ink` | `--accent-soft` | 6.22:1 | 4.5:1 | ✅ |
| `--accent-on` (white) | `--accent` | 5.47:1 | 4.5:1 | ✅ |
| `--success` | `--success-soft` | 5.09:1 | 4.5:1 | ✅ |
| `--warning` | `--warning-soft` | 5.71:1 | 4.5:1 | ✅ |
| `--danger` | `--surface` | 5.36:1 | 4.5:1 | ✅ |
| `--danger` | `--danger-soft` | 4.75:1 | 4.5:1 | ✅ |
| `--danger-on` (white) | `--danger` | 6.08:1 | 4.5:1 | ✅ |
| `--ink` | `--mark-bg` | 13.22:1 | 4.5:1 | ✅ |
| `--border-strong` | `--surface` | 3.31:1 | 3:1 | ✅ |
| `--ring` | `--surface` | 5.39:1 | 3:1 | ✅ |
| `--disabled-ink` | `--disabled-bg` | 3.19:1 | 3:1 (exempt) | ✅ |

**Dark theme**

| Foreground | Background | Ratio | Requirement | Status |
|---|---|---|---|---|
| `--ink` | `--surface` | 16.68:1 | 4.5:1 | ✅ |
| `--ink-muted` | `--surface` | 8.01:1 | 4.5:1 | ✅ |
| `--ink-subtle` | `--surface` | 5.08:1 | 4.5:1 | ✅ |
| `--accent-ink` | `--surface` | 9.80:1 | 4.5:1 | ✅ |
| `--accent-ink` | `--accent-soft` | 7.49:1 | 4.5:1 | ✅ |
| `--accent-on` (white) | `--accent` | 4.61:1 | 4.5:1 | ✅ |
| `--success` | `--success-soft` | 7.30:1 | 4.5:1 | ✅ |
| `--warning` | `--warning-soft` | 7.77:1 | 4.5:1 | ✅ |
| `--danger` | `--danger-soft` | 5.85:1 | 4.5:1 | ✅ |
| `--danger-on` (white) | `--danger` | 5.34:1 | 4.5:1 | ✅ |
| `--danger-on` (white) | `--danger-hover` | 4.71:1 | 4.5:1 | ✅ |
| `--ink` | `--mark-bg` | 7.07:1 | 4.5:1 | ✅ |
| `--border-strong` | `--surface-muted` | 3.25:1 | 3:1 | ✅ |
| `--ink-subtle` | `--surface` | 5.08:1 | 4.5:1 | ✅ |
| `--disabled-ink` | `--disabled-bg` | 3.63:1 | 3:1 (exempt) | ✅ |
| `--border-strong` | `--surface` | 3.65:1 | 3:1 | ✅ |
| `--ring` | `--surface` | 7.44:1 | 3:1 | ✅ |

> **`--ink-subtle` at 4.22:1 in light mode** is below 4.5:1. It is therefore **restricted to 12px meta text that is duplicated elsewhere** (the card meta line's category and timestamp also appear on the detail page, and the timestamp carries a `title` with the absolute date). If a future design needs `--ink-subtle` to carry unique information, switch that text to `--ink-muted` (5.90:1). Do not darken the token: doing so collapses the visual hierarchy between summary and meta.
>
> This is a conscious tradeoff, recorded in §12. It is the one place the spec accepts AA-adjacent contrast, and it is bounded.

### 9.2 Keyboard navigation

| Key | Context | Action |
|---|---|---|
| `Tab` / `Shift+Tab` | Global | Move through the focus order below. |
| `Enter` | Focused card / sidebar row | Open the target. |
| `/` | Global, not in a text field | Focus the header search input. |
| `⌘K` / `Ctrl+K` | Global | Open the command palette. |
| `Escape` | Search input focused | Clear the input; if already empty, blur. |
| `Escape` | Dialog / drawer / palette open | Close it and restore focus to the opener. |
| `↑` / `↓` | Palette open | Move through results. |
| `Enter` | Palette, result focused | Navigate to the article. |
| `⌘Enter` / `Ctrl+Enter` | Editor body focused | Save the article. |
| `⌘B` / `⌘I` / `⌘K` | Editor body focused | Bold / italic / link. |
| `Tab` | Editor toolbar | Buttons are in the tab order; the toolbar is **not** a roving-tabindex widget (fewer than 12 buttons, so plain tabbing is simpler and more predictable). |
| `Space` / `Enter` | `<details>` summary (History, On this page) | Toggle. |

**Focus order (every page):**

1. Skip link (visually hidden until focused)
2. Header: `☰` (mobile only) → wordmark → search input → `+ New article` → theme toggle → `Editing as` chip
3. Sidebar: `Categories` section → each category row → `New category` → `Editing as`
4. Main: breadcrumb → `h1` → toolbar controls (filters, actions) → content (cards / article body links / form fields) → pagination → bottom CTA
5. Footer: minimal, one link (`Keyboard shortcuts`) that opens a dialog.

The DOM order **is** the visual order at every breakpoint. No `tabIndex` greater than 0 anywhere in the codebase.

**Focus management rules:**

- Opening a dialog moves focus to the first focusable element inside it (or the dialog container if it holds an `role="alert"`).
- Closing restores focus to the element that opened it.
- The conflict banner receives programmatic focus when it appears (§5.5).
- On a validation failure, focus moves to the first invalid field.
- On client-side navigation, focus moves to the `h1` of the new page (`tabIndex={-1}`), so a screen-reader user is not stranded at the top of the document. Do **not** move focus on filter/pagination changes — the user is refining, not navigating.
- The skip link targets `<main id="main" tabIndex={-1}>`.

### 9.3 Screen reader labelling

| Component | Guidance |
|---|---|
| Skip link | `Skip to content`, first focusable element, visible on focus. |
| Header | `<header>` — implicit `banner` role, only one per page. |
| Sidebar nav | `<nav aria-label="Categories">`. |
| Breadcrumb | `<nav aria-label="Breadcrumb">` + `<ol>`; last item `aria-current="page"`. |
| Main | `<main id="main">` — one per page. |
| Search form | `<form role="search">` + `<input aria-label="Search articles">`. The placeholder is **not** the label. |
| Search results heading | The visible `h1` on `/search` is `sr-only`: "Search results". The visible heading is the live region text. |
| Result count | `<span role="status" aria-live="polite">3 results for “deploy”</span>`. |
| Article card | The whole row is one `<a>`; its accessible name is the title + summary + meta concatenated by the DOM. Add `aria-label` only if the concatenation is ambiguous — do not override it. |
| Status badge | `<span class="badge">Draft</span>` with the full word, never `D` or a color-only dot. When the badge is adjacent to a title inside the same link, the accessible name becomes "Deploying the API Draft" — acceptable and informative. |
| Sidebar row | `<a aria-current="page">` on the active category; count is `<span class="sr-only">12 articles</span><span aria-hidden="true">12</span>` so a screen reader hears "Engineering, 12 articles" rather than "Engineering 12". |
| Icon-only button | Requires `aria-label` (e.g. `aria-label="Clear search"`), never `title` alone. |
| Theme toggle | `aria-label="Change theme"` on the trigger; the menu items are `Light` / `Dark` / `System` with `role="menuitemradio"` and `aria-checked`. |
| Editor status pill | `role="status" aria-live="polite"` — announces `Unsaved changes` / `Saving…` / `Saved`. |
| Character counter | `aria-live="polite"` but throttled: announce only at 190,000 and 200,000, not on every keystroke. |
| TOC | `<nav aria-label="On this page">`; active item `aria-current="true"`. |
| `<mark>` | Native semantics; no extra ARIA. Screen readers announce "highlighted". |
| Toast | `role="status"` (success) / `role="alert"` (error); the close button is `aria-label="Dismiss"`. |
| Dialog | Radix provides `role="dialog" aria-modal="true"` + `aria-labelledby`. Always pass a `<DialogTitle>`; never rely on `aria-label` when a visible title exists. |
| Pagination | `<nav aria-label="Pagination">`; disabled controls are `<span aria-disabled="true">`, not `<a>`. |
| Skeleton containers | `role="status" aria-label="Loading"` on the wrapper; individual blocks `aria-hidden`. |
| Error digest | Rendered as text, not an image, and selectable so it can be reported. |
| `article` element | The detail page body is wrapped in `<article>`; the title is its `<h1>`. |
| Decorative separators (`·`) | `aria-hidden="true"` so they are not read as "middle dot". |
| Relative timestamps | `<time dateTime="2026-09-08T12:00:00.000Z" title="September 8, 2026 at 12:00 PM">2 days ago</time>` — the absolute date is available on hover/focus and via the `dateTime` attribute. |

### 9.4 Additional requirements

- **Landmarks:** exactly one `banner`, one `main`, one `contentinfo`; `nav` elements are individually labelled.
- **Heading order:** never skip a level. `h1` (page) → `h2` (section) → `h3` (card title / article sub-section). Card titles are `h3` because the list `h1` is the page title and the implicit section is `h2` (rendered `sr-only` as "Articles").
- **Zoom:** the layout must remain usable at 200% browser zoom and at a 320px effective viewport (WCAG 1.4.10 reflow). The three-column shell collapses to one column, which satisfies this.
- **Text spacing:** must not break with `line-height: 1.5`, `letter-spacing: 0.12em`, `word-spacing: 0.16em`, and `paragraph-spacing: 2em` applied (WCAG 1.4.12). Avoid fixed heights on text containers — this is why `ArticleCard` uses `min-height`, not `height`.
- **Color is never the only signal:** draft/archived have text badges; errors have an icon + text + `aria-invalid`; search matches have `<mark>` background *and* the native `mark` semantics; the active TOC item has a left border *and* `aria-current`.
- **Motion:** `prefers-reduced-motion` collapses all transitions (§8.1).
- **`aria-busy`** is set on the `<form>` during save and on the results region during search.
- **No `outline: none`** anywhere without an equivalent visible replacement.
- **Automated check:** `@axe-core/playwright` with `wcag2a` + `wcag2aa` on `/`, `/search`, and `/articles/[slug]` (matching §11.4 of the architecture spec). The spec's own contrast table (§9.1) is the manual companion to the `color-contrast` rule, which is disabled in the automated run.

---

## 10. Handoff notes

### 10.1 Component → file map

| Component | File | Client? | Depends on |
|---|---|---|---|
| `Button` | `ui/button.tsx` | no | `cva`, `cn`, `@radix-ui/react-slot` |
| `Input` | `ui/input.tsx` | no | `cn` |
| `Textarea` | `ui/textarea.tsx` | no | `cn` |
| `Select` | `ui/select.tsx` | **yes** | Radix `Select` |
| `Badge` | `ui/badge.tsx` | no | `cva` |
| `Dialog` | `ui/dialog.tsx` | **yes** | Radix `Dialog` |
| `Field` | `ui/field.tsx` | no | `Label`, `cn` |
| `EmptyState` | `ui/empty-state.tsx` | no | `Button` |
| `Skeleton` | `ui/skeleton.tsx` | no | `cn` |
| `Toast` / `ToastRegion` | `ui/toast.tsx` | **yes** | `aria-live` |
| `AppShell` | `layout/app-shell.tsx` | no | grid + the three regions |
| `Sidebar` | `layout/sidebar.tsx` | no | `CategoryChips`, `EditingAsChip` |
| `MobileNav` | `layout/mobile-nav.tsx` | **yes** | Radix `Dialog` |
| `ThemeToggle` | `layout/theme-toggle.tsx` | **yes** | `next-themes` |
| `SkipLink` | `layout/skip-link.tsx` | no | — |
| `ArticleCard` | `articles/article-card.tsx` | no | `Badge` |
| `ArticleList` | `articles/article-list.tsx` | no | `ArticleCard`, `EmptyState` |
| `ArticleHeader` | `articles/article-header.tsx` | no | `Badge`, `Button` |
| `ArticleBody` | `articles/article-body.tsx` | no | `react-markdown` |
| `ArticleForm` | `articles/article-form.tsx` | **yes** | RHF + Zod + `MarkdownEditor` |
| `MarkdownEditor` | `articles/markdown-editor.tsx` | **yes** (`ssr:false`) | `@uiw/react-md-editor` |
| `StatusBadge` | `articles/status-badge.tsx` | no | `Badge` |
| `RevisionList` | `articles/revision-list.tsx` | no (dialog is client) | `Dialog` |
| `DeleteArticleButton` → **`ArchiveArticleButton`** | `articles/delete-article-button.tsx` | **yes** | `Dialog` |
| `SearchInput` | `search/search-input.tsx` | **yes** | `useRouter`, `useTransition` |
| `SearchResults` | `search/search-results.tsx` | no | `ArticleCard`, `Highlight` |
| `Highlight` | `search/highlight.tsx` | no | — |
| `CommandPalette` | `search/command-palette.tsx` | **yes** | `cmdk` |
| `FilterBar` | `filters/filter-bar.tsx` | **yes** | `useTransition` |
| `CategoryChips` | `filters/category-chips.tsx` | **yes** | `useTransition` |
| `Pagination` | `filters/pagination.tsx` | **yes** | `useTransition` |
| `TableOfContents` | `articles/table-of-contents.tsx` | **yes** | `IntersectionObserver` |
| `EditingAsChip` | `layout/editing-as-chip.tsx` | **yes** | cookie write + `Dialog` |
| `ProgressBar` | `layout/progress-bar.tsx` | **yes** | `useLinkStatus` / `useTransition` |

> **Naming note:** `architecture.md` §5.1 lists `delete-article-button.tsx`. Keep the filename, but the component and all copy must say **Archive** (U9). Do not create a second file.

### 10.2 Token → utility cheat sheet

| Token | Tailwind utility | Typical use |
|---|---|---|
| `--color-surface` | `bg-surface` | page, header, cards |
| `--color-surface-muted` | `bg-surface-muted` | hover rows, search pill, banner fills |
| `--color-surface-sunken` | `bg-surface-sunken` | code blocks, key caps, pressed states |
| `--color-border` | `border-border` | row separators, container outlines |
| `--color-border-strong` | `border-border-strong` | inputs, secondary buttons |
| `--color-ink` | `text-ink` | headings, body |
| `--color-ink-muted` | `text-ink-muted` | summaries, secondary copy |
| `--color-ink-subtle` | `text-ink-subtle` | meta lines, hints, placeholders |
| `--color-accent` | `bg-accent` | primary button |
| `--color-accent-soft` | `bg-accent-soft` | active sidebar row, selected chip |
| `--color-accent-ink` | `text-accent-ink` | links, active row text |
| `--color-ring` | `ring-ring` / `outline-ring` | focus |
| `--color-mark-bg` | `bg-mark-bg` | `<mark>` in search results |
| `--radius-control` | `rounded-control` | inputs, buttons |
| `--radius-card` | `rounded-card` | cards, dialogs, banners |
| `--radius-pill` | `rounded-pill` | badges |
| `--layout-header-h` | `h-(--layout-header-h)` | header, sticky offsets |
| `--layout-sidebar-w` | `w-(--layout-sidebar-w)` | sidebar column |
| `--layout-toc-w` | `w-(--layout-toc-w)` | TOC column |
| `--layout-measure` | `max-w-(--layout-measure)` | `.prose` |

**Class-order convention:** use `prettier-plugin-tailwindcss` (already a dev dependency) so class order is deterministic. Do not hand-sort.

### 10.3 Utility recipes

```ts
// src/lib/cn.ts  (already specified in architecture.md §5.1)
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

```tsx
// Focus ring, reusable
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

// Inset ring for rows with overflow:hidden
export const focusRingInset =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';
```

### 10.4 Implementation order for the design layer

Follows `architecture.md` §18 steps 5–10, with the design-specific acceptance criteria attached:

| Step | Deliverable | Design acceptance criteria |
|---|---|---|
| 1 | `globals.css` tokens (§8.1) | All tokens present; `bg-surface`, `text-ink`, `rounded-card` compile; dark mode toggles every token. |
| 2 | `ui/button`, `ui/input`, `ui/field`, `ui/badge` | Every state in §5.1/§5.2 renders; focus ring visible on all five variants in both themes. |
| 3 | `ui/empty-state`, `ui/skeleton`, `ui/dialog`, `ui/toast` | All five empty states (§5.6) render with exact copy; skeleton has no shimmer for the first 400 ms. |
| 4 | `AppShell`, `Sidebar`, `MobileNav`, `ThemeToggle`, `SkipLink` | Three-column at ≥1280, two at 1024, drawer below; skip link is the first tab stop; drawer traps focus. |
| 5 | `ArticleCard`, `ArticleList`, `Pagination`, `FilterBar` | 72px rows, 20 per page, meta line correct, hover/focus/active states, no horizontal overflow at 360px. |
| 6 | `ArticleHeader`, `ArticleBody`, `TableOfContents`, `RevisionList` | 68ch measure, 16px/1.65 body, TOC active tracking, history collapsed by default. |
| 7 | `SearchInput`, `SearchResults`, `Highlight`, `CommandPalette` | `<mark>` uses the token, live region announces counts, ⌘K opens/escapes, 0-results state exact. |
| 8 | `ArticleForm`, `MarkdownEditor`, conflict banner | All editor states in §3.5; toolbar accessible; conflict banner receives focus; `Copy my text` works. |
| 9 | `StatusBadge`, `CategoryChips`, `EditingAsChip` | Badges only for non-published; active chip/row states; display-name dialog writes the cookie. |
| 10 | Responsive pass + a11y pass | §6.2 matrix verified at 360/768/834/1024/1280/1440; axe smoke clean on `/`, `/search`, `/articles/[slug]`. |

### 10.5 Copy deck

All user-facing strings, exact. Use these; do not improvise.

| Key | String |
|---|---|
| `app.name` | `Knowledge Base` |
| `nav.categories` | `Categories` |
| `nav.allArticles` | `All articles` |
| `nav.uncategorized` | `Uncategorized` |
| `nav.newCategory` | `New category` |
| `header.search.placeholder` | `Search articles…` |
| `header.search.label` | `Search articles` |
| `header.newArticle` | `New article` |
| `browse.title` | `Articles` |
| `browse.count` | `{n} published · updated {relative}` |
| `browse.filter.sort.updated` | `Updated` |
| `browse.filter.sort.created` | `Created` |
| `browse.filter.sort.title` | `Title A–Z` |
| `browse.filter.status.published` | `Published` |
| `browse.filter.status.drafts` | `Drafts` |
| `browse.filter.status.all` | `All` |
| `browse.empty.title` | `No articles yet` |
| `browse.empty.body` | `Create the first article to start building your team's knowledge base.` |
| `browse.empty.cta` | `New article` |
| `browse.emptyFiltered.title` | `No articles match these filters.` |
| `browse.emptyFiltered.body` | `Try removing a filter.` |
| `browse.emptyFiltered.cta` | `Clear filters` |
| `search.title` | `Search results` |
| `search.count.one` | `1 result for “{q}”` |
| `search.count.other` | `{n} results for “{q}”` |
| `search.clear` | `Clear search` |
| `search.empty.title` | `No results for “{q}”` |
| `search.empty.body` | `Try a different term, or browse all articles.` |
| `search.tooLong` | `Search terms are limited to 200 characters.` |
| `palette.placeholder` | `Search articles…` |
| `palette.seeAll` | `See all results for “{q}”` |
| `palette.empty` | `No results.` |
| `palette.hint.navigate` | `↑↓ to navigate` |
| `palette.hint.open` | `↵ to open` |
| `palette.hint.close` | `esc to close` |
| `category.empty.title` | `Nothing in {category} yet` |
| `category.empty.body` | `Articles you assign to this category will appear here.` |
| `category.empty.cta` | `New article in {category}` |
| `categories.empty.title` | `No categories yet` |
| `categories.empty.body` | `Categories help you group related articles.` |
| `categories.empty.cta` | `Create a category` |
| `categories.new.title` | `New category` |
| `categories.new.name` | `Name` |
| `categories.new.description` | `Description` |
| `categories.new.description.hint` | `Optional. Up to 200 characters.` |
| `categories.new.submit` | `Create category` |
| `detail.edit` | `Edit` |
| `detail.more` | `More actions` |
| `detail.archive` | `Archive article` |
| `detail.archive.title` | `Archive “{title}”?` |
| `detail.archive.body` | `It will be hidden from browse and search. The article and its history are kept, and it stays reachable by direct link.` |
| `detail.archive.cancel` | `Cancel` |
| `detail.archive.confirm` | `Archive article` |
| `detail.history` | `History ({n} revisions)` |
| `detail.history.view` | `View` |
| `detail.history.empty` | `No revisions yet.` |
| `detail.toc` | `On this page` |
| `detail.readingTime` | `{n} min read` |
| `detail.archived.banner` | `This article is archived and may be out of date.` |
| `detail.editBottom` | `Edit this article` |
| `detail.backToTop` | `Back to top` |
| `notFound.article.title` | `We couldn't find that article.` |
| `notFound.article.body` | `It may have been archived or the link may be wrong.` |
| `notFound.article.browse` | `Browse all articles` |
| `notFound.article.search` | `Search` |
| `editor.new.title` | `New article` |
| `editor.edit.title` | `Edit article` |
| `editor.cancel` | `Cancel` |
| `editor.save.create` | `Save article` |
| `editor.save.edit` | `Save changes` |
| `editor.save.pending` | `Saving…` |
| `editor.save.andNew` | `Save & create another` |
| `editor.field.title` | `Title` |
| `editor.field.slug` | `Slug` |
| `editor.field.slug.regenerate` | `Regenerate from title` |
| `editor.field.slug.warning` | `Changing the slug will break existing links to this article.` |
| `editor.field.summary` | `Summary` |
| `editor.field.category` | `Category` |
| `editor.field.status` | `Status` |
| `editor.field.body` | `Body` |
| `editor.field.body.hint` | `Markdown supported — the preview updates as you type.` |
| `editor.field.changeNote` | `Change note` |
| `editor.field.changeNote.hint` | `Shown in history. Optional.` |
| `editor.field.changeNote.placeholder` | `What changed? (optional)` |
| `editor.status.saved` | `Saved` |
| `editor.status.dirty` | `Unsaved changes` |
| `editor.status.saving` | `Saving…` |
| `editor.status.failed` | `Save failed` |
| `editor.tab.write` | `Write` |
| `editor.tab.preview` | `Preview` |
| `editor.loading` | `Loading editor…` |
| `editor.discard.title` | `Discard your unsaved changes?` |
| `editor.discard.body` | `Your edits to this article will be lost.` |
| `editor.discard.keep` | `Keep editing` |
| `editor.discard.confirm` | `Discard` |
| `editor.error.form` | `We couldn't save your changes. Your text is still here.` |
| `editor.error.fix` | `Please fix the highlighted fields.` |
| `editor.error.retry` | `Try again` |
| `editor.conflict.title` | `This article was updated by someone else.` |
| `editor.conflict.body` | `Reload the latest version to see their changes, or copy your text first so nothing is lost.` |
| `editor.conflict.reload` | `Reload latest version` |
| `editor.conflict.copy` | `Copy my text` |
| `editor.conflict.copied` | `Copied` |
| `editor.conflict.reloadConfirm.title` | `Discard your unsaved edits?` |
| `editor.conflict.reloadConfirm.body` | `Copy them first if you want to keep them.` |
| `editor.conflict.reloadConfirm.confirm` | `Discard and reload` |
| `editingAs.label` | `Editing as` |
| `editingAs.anonymous` | `Anonymous editor` |
| `editingAs.dialog.title` | `Display name` |
| `editingAs.dialog.body` | `Your name appears in an article's history when you save. It is not a login.` |
| `editingAs.dialog.save` | `Save name` |
| `error.route.title` | `Something went wrong loading this page.` |
| `error.route.reference` | `Reference: {digest}` |
| `error.route.retry` | `Try again` |
| `error.route.home` | `Go to all articles` |
| `toast.created` | `Article created.` |
| `toast.saved` | `Article saved.` |
| `toast.published` | `Article published.` |
| `toast.archived` | `Article archived.` |
| `toast.archived.undo` | `Undo` |
| `toast.categoryCreated` | `Category created.` |
| `toast.nameSaved` | `Display name saved.` |
| `toast.dismiss` | `Dismiss` |
| `theme.toggle` | `Change theme` |
| `theme.light` | `Light` |
| `theme.dark` | `Dark` |
| `theme.system` | `System` |
| `skip.link` | `Skip to content` |

**Validation messages** come from the Zod schemas verbatim (`architecture.md` §7.4) — e.g. `Title must be at least 3 characters.` Do not re-word them in the UI layer.

### 10.6 What a developer must NOT do

1. Do not add a `tailwind.config.js`. Tokens live in `globals.css` (§8.1).
2. Do not add a second accent color, a second font family, or a decorative illustration.
3. Do not use `dangerouslySetInnerHTML` — highlights are segment arrays.
4. Do not replace `--color-ink-subtle` with `--color-ink-muted` globally; the hierarchy is intentional.
5. Do not add a sort control to search results.
6. Do not show a `Published` badge.
7. Do not use the word "delete" in the UI; it is Archive.
8. Do not implement autosave.
9. Do not add a bottom tab bar for phones.
10. Do not animate anything on initial page load.

---

## 11. Component state reference (implementation checklist)

Use this table as a test matrix. Every row must be visually verified in **both themes**.

| # | Component | States to verify |
|---|---|---|
| 1 | Button (all 5 variants) | default, hover, focus-visible, active, disabled, loading |
| 2 | Input / Textarea | default, hover, focus, filled, placeholder, error, disabled |
| 3 | Select | closed, open, selected, focus, disabled |
| 4 | Field | with hint, with error, with both, required marker |
| 5 | SearchInput | empty, focused, typing, filled, clear-button visible, keyboard-shortcut hint |
| 6 | ArticleCard | default, hover, focus, draft badge, archived badge, 2-line summary, 1-line title truncation, no summary (excerpt fallback) |
| 7 | Sidebar row | default, hover, focus, active (`aria-current`), count, zero count |
| 8 | Filter chip | default, hover, focus, selected, disabled |
| 9 | Pagination | first page, middle page, last page, single page, disabled prev/next |
| 10 | TOC | empty (hidden), 2 headings, 10 headings, active item, scrolled state |
| 11 | Markdown body | h1–h4, paragraphs, ul/ol, task list, table, blockquote, inline code, fenced code, link, hr |
| 12 | Status pill (editor) | saved, dirty, saving, failed |
| 13 | Conflict banner | visible, focused, reload-confirm open, copied |
| 14 | Toast | success, error, with action (Undo), dismiss, auto-dismiss timing |
| 15 | Dialog | open, focus trap, escape, overlay click, long content scroll |
| 16 | Empty states (5) | each renders exact copy + correct CTA target |
| 17 | Skeleton | list, detail, editor, TOC |
| 18 | Error panel | route error, digest visible, retry works |
| 19 | 404 | global 404, missing article |
| 20 | Progress bar | visible during transition, hidden otherwise |

---

## 12. Decisions log

| # | Decision | Alternatives considered | Resolution | Rationale |
|---|---|---|---|---|
| **UX1** | UI base type size | 16px everywhere; 15px; 14px UI + 16px body | **14px UI / 16px article body** | The brief demands both "information-dense" and "readable". One size cannot serve a 20-row list and a long article. Splitting them is the only way to satisfy both. |
| **UX2** | List presentation | Card grid; table; row list | **Row list, 20/page, 72px rows** | ~40% more content per viewport than a grid; a table would force column headers onto data that is not tabular. |
| **UX3** | Pagination | Infinite scroll; "Load more"; numbered pager | **Numbered pager** | URL is the state container (§9.5). Numbered pages are linkable, back-button-correct, and make the corpus size legible. Infinite scroll breaks the back button. |
| **UX4** | Search placement | Dedicated `/search` page only; header input only | **Both — shared input, `/search` as canonical** | Search-first navigation requires the affordance on every route; a dedicated URL is required for deep links and back-button correctness. |
| **UX5** | ⌘K palette | Skip it; make it primary | **Secondary, additive** | Power users get speed; everyone else is unaffected. It must never be the only path to a feature, so it never is. |
| **UX6** | Editor shell | Keep the full shell; focused shell | **Focused shell (no sidebar/TOC/search)** | Writing is a different mode from reading. Removing navigation reduces context-switching and matches "low-friction". |
| **UX7** | Save model | Autosave; save-on-blur; explicit save | **Explicit save + `beforeunload` guard** | Autosave creates revision noise and races optimistic concurrency (§9.3). A guard covers the real risk (lost work) without the cost. |
| **UX8** | Draft visibility | Hide drafts entirely; show everywhere; filter default | **Visible, excluded from default scope** | Hiding makes drafts unreachable; showing everywhere dilutes the primary view. The filter is the honest middle. |
| **UX9** | Published badge | Always show; never show | **Never show for published** | A badge on 95% of rows is visual noise and trains users to ignore badges. |
| **UX10** | Archive affordance | Filled danger button on the page; overflow menu | **Overflow menu + confirm dialog** | The destructive action is rare and must not compete with Edit. The confirm dialog states reversibility explicitly. |
| **UX11** | Undo on archive | No undo; full trash/restore UI | **5-second Undo toast only** | The write is a single status change, so undo is nearly free. A trash UI is a whole screen for a rare need. |
| **UX12** | Display-name prompt | No attribution; block editing until set; optional chip | **Optional chip with a warning dot** | Blocking would add friction to the core edit flow. Doing nothing makes History read "Anonymous editor" for everyone, which silently destroys its value. A dismissible nudge is the right weight. |
| **UX13** | Search highlighting | Bold; color; underline; `<mark>` background | **`<mark>` background token** | Color-only fails WCAG 1.4.1; bold shifts line lengths; `<mark>` is semantically correct and free. |
| **UX14** | Conflict resolution | Last-write-wins; full merge UI; reload-or-copy | **Banner with Reload + Copy my text** | A merge UI is a large build for a near-zero collision rate. The clipboard escape hatch makes "reload discards edits" acceptable. |
| **UX15** | `--ink-subtle` at 4.22:1 (light) | Darken the token to reach 4.5:1; use `--ink-muted` for meta | **Accept 4.22:1 on redundant 12px meta only** | Darkening collapses the summary/meta hierarchy, which is the primary scannability mechanism. The text is duplicated on the detail page and carries a `title` with the absolute date, so no information is lost. Bounded and documented. |
| **UX16** | Two accent tokens in dark mode | One accent for both fills and links | **`--accent` for fills, `--accent-ink` for text** | No single blue gives white-on-fill 4.5:1 *and* text-on-surface 4.5:1 at the same lightness. Two tokens is the honest solution. |
| **UX17** | TOC | Always visible; never; ≥1280px only | **≥1280px only, ≥2 headings** | Below 1280px the TOC would squeeze the article measure below the readable floor. The `<details>` fallback covers smaller widths. |
| **UX18** | History default | Expanded; collapsed | **Collapsed** | Readers want the article, not the metadata. Content owners who want it click once. |
| **UX19** | Motion | Rich transitions; none; functional only | **Functional only, 120–240ms, reduced-motion aware** | The brief says "avoid excessive motion". Motion earns its place only when it explains a state change. |
| **UX20** | Empty-state count | Four canonical states | **Five (added the filtered-empty state)** | A filter can produce an empty set while articles exist. Reusing "No articles yet" there would be factually wrong and would push users to create a duplicate article. |
| **UX21** | Editor preview scroll sync | Sync both panes; independent | **Independent** | Sync scrolling is janky on long documents and provides little value when the preview is half-width. |
| **UX22** | "Save & create another" | Not offered; offered on create only | **Offered on create only** | Content owners add articles in batches. On edit it would be meaningless (there is no "another"). |

---

## 13. Verification checklist

Before the design layer is considered done:

- [ ] Every token in §8.1 exists in `globals.css` and resolves in both themes.
- [ ] Contrast ratios in §9.1 re-verified against the shipped CSS (a script or manual check).
- [ ] All 5 empty states render their exact copy and correct CTA target.
- [ ] Every route in §2.2 renders the correct shell regions at 1280px.
- [ ] The 4 breakpoints in §6.2 verified at 360, 768, 834, 1024, 1280, 1440.
- [ ] No horizontal overflow at 360px (`document.scrollingElement.scrollWidth <= innerWidth + 1`).
- [ ] All touch targets ≥44×44px at 834px.
- [ ] Skip link is the first tab stop; focus order matches §9.2.
- [ ] Drawer traps focus and restores it on close; `Escape` closes it.
- [ ] Conflict banner receives focus and `Copy my text` works.
- [ ] `prefers-reduced-motion` disables all transitions.
- [ ] axe-core (`wcag2a`, `wcag2aa`) reports zero violations on `/`, `/search`, `/articles/[slug]`.
- [ ] The 20-row matrix in §11 verified in both themes.
- [ ] No `tailwind.config.js` exists; no second accent color exists; the word "delete" appears nowhere in the UI.

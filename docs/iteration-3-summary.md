# Iteration 3 Summary — Application Shell + Browse / List View

## What Was Built

All tasks from iteration 3 were implemented:

- **CSS design tokens** (`globals.css`) — full `@layer base` block with all custom properties (`--color-*`, `--sidebar-width`, `--nav-height-mobile`), Inter font body rule, and Tailwind/typography imports.
- **Root layout** (`src/app/layout.tsx`) — Inter font via `next/font/google`, two-column shell (`<Nav>` sidebar + `<main>`), `h-screen overflow-hidden` body, `overflow-y-auto` main.
- **Root redirect** (`src/app/page.tsx`) — already done in iteration 1; confirmed intact.
- **`Nav` component** (`src/components/Nav.tsx`) — async Server Component that calls `listCategories()`, renders app name, `<SearchBar>` in a `<Suspense>`, category section label, `<CategoryNav>` in a `<Suspense>` with a static fallback, `<hr>`, and "New Article" primary button link.
- **`CategoryNav` component** (`src/components/CategoryNav.tsx`) — thin `'use client'` wrapper that reads `useSearchParams()` for active category slug and applies `aria-current="page"` to the active link. Uses the `aria-[current=page]` CSS selector pattern from the design spec.
- **`SearchBar` component** (`src/components/SearchBar.tsx`) — `'use client'`, debounced 300ms on `onChange`, `router.push` updates `?q=`, Enter fires immediately, Escape clears and resets URL, × clear button (Lucide `X`) shown when value is non-empty, Lucide `Search` prefix icon.
- **`CategoryBadge` component** (`src/components/CategoryBadge.tsx`) — deterministic 6-color palette via `colorIndex % 6`, inline `style` for bg/text/border colors.
- **`StatusBadge` component** (`src/components/StatusBadge.tsx`) — returns `null` for PUBLISHED; renders DRAFT pill with `--color-draft-*` tokens and `<span class="sr-only">Status: </span>`.
- **`EmptyState` component** (`src/components/EmptyState.tsx`) — three variants (`empty`, `no-results`, `no-category`), appropriate Lucide icons (FileText, SearchX, FolderOpen), `role="status"`, `min-h-[320px]`, correct headings, body copy, and CTAs from the design spec.
- **`ArticleCard` component** (`src/components/ArticleCard.tsx`) — Server Component, full-card `<Link>`, CategoryBadge + title + StatusBadge row, excerpt with `-webkit-line-clamp: 2`, bottom-right date formatted with `Intl.DateTimeFormat` (current year: `MMM D`, prior years: `MMM D, YYYY`), hover + focus-visible ring styles.
- **Article list page** (`src/app/articles/page.tsx`) — async Server Component, `searchParams` awaited (Next.js 16 Promise API), calls `searchArticles` or `listArticles` based on `?q=`, composes with `?category=`, renders heading row with article count and "× Clear search" when searching, `<ul>` of `<ArticleCard>`, `<EmptyState>` when empty.

## Assumptions Made

- **`searchParams` is a Promise** — confirmed from Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`). The articles page uses `await searchParams`.
- **`CategoryNav` needs its own `Suspense`** — `useSearchParams()` requires Suspense when the parent is a Server Component. The `Nav` wraps `<CategoryNav>` in `<Suspense>` with a static fallback (same link list, no active state).
- **`SearchBar` also wrapped in `Suspense`** — same `useSearchParams` constraint applies; a skeleton placeholder is used as fallback.
- **Nav is placed in `src/components/Nav.tsx`** — the architecture spec lists it under `src/components/`; the design spec's §8.2 also lists it there.
- **Article card title underline** — the design spec says "underline on hover." The full card is a `<Link>`, so title underline is omitted since the hover signal is the full-card background/border change. This matches the intent of "entire card is a link."

## Confirmation: App Runs and Browse Flow Works

- `npm run build` completes successfully with no TypeScript errors and no build warnings.
- All 8 routes resolved (`/`, `/articles`, `/articles/[slug]`, `/articles/new`, `/articles/[slug]/edit`, `/api/articles`, `/api/articles/[id]`, `/api/categories`).
- The browse flow (redirect, article list, category filter, search, empty state) is fully wired to the data layer built in iteration 2.

## Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| `CategoryNav` split from `Nav` | Separate `'use client'` wrapper | Required by Next.js App Router: `useSearchParams()` cannot be called in a Server Component. `Nav` stays async (calls `listCategories()`). |
| `SearchBar` in `Suspense` | Yes, with a height-matching skeleton fallback | `useSearchParams` requires Suspense boundary when parent is a Server Component. |
| Active state on "All Articles" | `activeSlug === null` | No `?category=` param means the "All Articles" link is active; any specific category slug deactivates it. |
| `isFiltering` only when not searching | `Boolean(category) && !isSearching` | When both `?q=` and `?category=` are present, the page is in "search" mode — the empty state shown is `no-results`, not `no-category`, since the dominant intent is search. |
| Nav in `src/components/` | Per architecture spec §7 | Both architecture spec and design spec §8.2 list `Nav` under `src/components/`, not `src/app/components/`. |

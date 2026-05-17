# Iteration 4 Summary — Article Detail Page

## What Was Built

All tasks from iteration 4 were implemented:

- **`ArticleRenderer` component** (`src/components/ArticleRenderer.tsx`) — Server Component using `react-markdown` with the `remark-gfm` plugin, wrapped in `<div className="prose prose-slate max-w-none">`. No `rehype-raw` included (XSS prevention).
- **Prose link color overrides** in `globals.css` — `.prose a` and `.prose a:hover` use `--color-accent` and `--color-accent-hover` respectively to prevent `prose-slate` from overriding the design system accent color.
- **Article detail page** (`src/app/articles/[slug]/page.tsx`) — async Server Component that:
  - Awaits `params` (Promise API in Next.js 16)
  - Calls `getArticleBySlug(slug)` and calls `notFound()` if the result is `null`
  - Renders the top row with back link (ChevronLeft icon + "Articles") and Edit button (Pencil icon)
  - Renders badges row with `CategoryBadge` and `StatusBadge`
  - Renders `<h1>` title, `<hr>`, metadata line (updated date + reading time), and `<ArticleRenderer>` in a `max-w-[720px] mx-auto` wrapper
  - Includes `generateMetadata` for document title
- **Custom 404 page** (`src/app/not-found.tsx`) — minimal branded 404 with a back link to `/articles`

## Assumptions Made

- **`params` is a Promise** — confirmed from `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`. Used `await params` in both `generateMetadata` and the page component.
- **`getArticleBySlug` called twice** — once in `generateMetadata` and once in the page component. Per the iteration notes, Next.js deduplicates Server Component data fetches within a single request, so this is not a double DB hit.
- **Prose link overrides placed outside `@layer base`** — the `.prose a` override rules are placed before the `@layer base` block in `globals.css`. This is sufficient for Tailwind 4.x since typography plugin styles are not inside a layer and these overrides apply at the cascade level.
- **Edit button uses secondary styling** — implemented as a bordered/surface-colored link button matching the design spec's secondary button style, consistent with existing patterns in the codebase.

## Confirmation: App Runs and Detail Flow Works

- `npm run build` completes successfully with no TypeScript errors and no build warnings.
- All 8 routes resolved cleanly (`/`, `/_not-found`, `/articles`, `/articles/[slug]`, `/articles/[slug]/edit`, `/articles/new`, `/api/articles`, `/api/articles/[id]`, `/api/categories`).
- The list → detail navigation journey is fully wired: ArticleCard links → detail page renders title, badges, metadata, and Markdown content.
- Non-existent slugs trigger `notFound()` which renders the custom `not-found.tsx` page.

## Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| No `rehype-raw` | Excluded | Spec explicitly forbids it to prevent XSS from stored Markdown content. `react-markdown` builds a React tree without it. |
| Prose overrides outside `@layer base` | Plain CSS rules before the layer block | Typography plugin styles are not layer-scoped; a plain rule at document level overrides them reliably in Tailwind 4.x. |
| `generateMetadata` duplicates `getArticleBySlug` call | Accepted | Next.js request-level deduplication prevents a double DB round-trip. This is the idiomatic App Router pattern. |
| Edit button as a `<Link>` with secondary styling | `<Link>` styled with border + surface colors | Matches design spec "secondary button style" and keeps the Edit affordance navigational, not a form action. |

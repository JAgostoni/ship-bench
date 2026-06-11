# Iteration 3 Summary — UI foundation and browse/read flow

**Date:** 2026-06-11
**Scope:** `docs/iterations/iteration-3.md` — all eight tasks completed. This iteration delivered the design system (tokens, icons, six primitives), the global layout and header (with the iteration-3 search stub), the shared Markdown renderer, and the complete read path: home list (S1), article detail (S2), and not-found (S6). No Edit/Delete actions and no SearchBox dropdown were built — those are iterations 5 and 4 respectively, per the plan.

---

## What was built

| Task | Outcome |
| --- | --- |
| 3.1 Design tokens | `src/app/globals.css` — Tailwind 4 `@theme` block with the §6.1 palette/shadows/radii and §6.2 font stacks + type scale verbatim. The `--color-*`, `--text-*`, `--font-*`, `--radius-*`, `--shadow-*`, and `--container-*` namespaces are reset (`*: initial`) so only spec tokens generate utilities — hardcoded values outside this file now simply don't compile to styles. Also home of the shared `:focus-visible` ring, the reduced-motion-guarded 0.8s spinner animation, and the full §6.3 ArticleBody prose styles. |
| 3.2 Icon set | `src/components/ui/icons.tsx` — the 12 Lucide icons as local inline-SVG components (stroke 1.75, `currentColor`, size default 16, `aria-hidden="true"` by default). `SpinnerIcon` is loader-circle with the guarded spin class. No icon package dependency. |
| 3.3 Primitives | `src/components/ui/` — `Button` (primary/secondary/danger/ghost-danger, link-or-button polymorphic via `href`, loading state with real `disabled`, spinner + verb label, and width locked by stacked grid cells), `Input` (visible label, error wiring with `aria-invalid`/`aria-describedby` + alert icon, leading-icon slot), `Card` (whole-card link, 2-line clamp title, relative-time meta in `<time datetime title>`), `EmptyState`, `Badge`, `PageHeader`. All states per §4 tables; heights 40px desktop / 44px below `lg`. |
| 3.4 Layout + header | `src/app/layout.tsx` + `src/components/Header.tsx` — skip link as first tab stop, sticky 56px banner header (logo glyph + "Team KB" → `/`, search area, primary "+ New article" → `/articles/new`), `<main id="main">` at 1100px max width. Search stub is a plain GET form (`role="search"`, styled input with search icon) submitting to `/search?q=…`; `src/app/search/page.tsx` renders the instruction state ("Type in the search box above…") for any query. Below 768px the name collapses to the labeled glyph and the button becomes icon-only with `aria-label="New article"`. |
| 3.5 ArticleBody | `src/components/ArticleBody.tsx` — react-markdown + remark-gfm, pure presentation, no `rehype-raw` (raw HTML stays escaped). GFM tables get an `overflow-x-auto` wrapper via a `components` override; all other prose styling lives under `.article-body` in globals.css. Reused as-is by the iteration-5 editor preview. |
| 3.6 Home (S1) | `src/app/page.tsx` — RSC, `force-dynamic`, calls `listArticles()` directly. PageHeader "Articles" + Badge count ("12 articles", pluralized); card grid as `<ul>/<li>` (2 columns ≥1024px, 1 below, 16px gap); zero-articles `EmptyState` with the §5.1 copy and "Create your first article" CTA. Shared relative-time util in `src/lib/time.ts` (+ unit tests). |
| 3.7 Detail (S2) | `src/app/articles/[id]/page.tsx` — RSC, `force-dynamic`; non-numeric/unknown ids → `notFound()`. "← All articles" link is the first focusable in `main`, then h1, absolute-dates meta line, divider, `ArticleBody`. No Edit/Delete buttons (iteration 5, backlog decision #5). |
| 3.8 Not found (S6) | `src/app/not-found.tsx` — `EmptyState` with file-question icon and §5.3 copy; serves bad article ids and unknown routes. |

## Verification (all run locally, 2026-06-11)

- `npm run check` → typecheck, ESLint, Prettier, and **47 Vitest tests** (40 existing + 7 new for the time util) all pass. ✅
- **Browse flow on seeded data** (`npm run dev`): home renders all 12 cards sorted by `updatedAt` DESC with relative times ("1 day ago" … absolute beyond 7 days); card click → detail; detail renders Markdown from seed content including headings, lists, inline code, links, and a styled GFM table in a scroll wrapper; "← All articles" returns home. ✅
- **404s:** `/articles/9999`, `/articles/abc`, and `/nonsense` all return HTTP 404 with the branded S6 empty state. ✅
- **Search stub:** header form GET-navigates to `/search?q=…` (200) showing the instruction state. ✅
- **Empty state:** with `DATABASE_PATH=data/kb-empty.sqlite` (fresh file, auto-migrated on boot) home shows "No articles yet" + CTA and a "0 articles" badge; temp DB deleted afterwards, the seeded dev DB was never touched. ✅
- **Responsive (Playwright screenshots at 1280 / 800 / 375):** 2-col → 1-col grid; header collapses below 768px to glyph + icon-only 44×44 "+" button; detail and 404 pages don't break at 375px. ✅
- **Keyboard pass (Playwright):** Tab order is skip link (visible when focused) → logo → search input → New article → main content; computed focus outline is the spec'd 2px solid `#1D4ED8`. ✅

## Assumptions made

1. **S6 title size:** design §5 specifies empty-state titles at 18px, but §1.3/S6 explicitly calls for "h1 22px" on the 404 page. Resolved with an `EmptyState` `titleAs` prop: default `h2` at 18px (§5 normative); the 404 page passes `h1`, rendered at 22px to match both §1.3/S6 and the type-scale's "section h1" role.
2. **Badge text style:** S1's wireframe annotates the count as "14px muted" while §4.7 specifies the Badge primitive at 13px. The Badge primitive spec wins (task 3.6 explicitly says `Badge` count); 13px, `--color-text-secondary`.
3. **Stub search page title:** iteration 4 owns the real S3 header ("Search results for "{q}""); the stub needed *some* h1, so it uses "Search" at the 22px section-h1 size. Replaced wholesale in iteration 4.
4. **Logo link color** follows §4.5's nav-link row (text-secondary, hover text + underline) rather than plain `--color-text`, since §4.5 explicitly lists the logo as a nav link.
5. **No `/` keyboard hint in the stub** — the kbd hint belongs to the `/` shortcut and dropdown behavior, which task 3.4 explicitly defers to iteration 4 ("No dropdown, no debounce, no `/` shortcut yet").
6. **"New article" header button lands on the 404 page until iteration 5** builds `/articles/new` — sanctioned by task 3.4; the S6 "Back to all articles" action keeps the interim state non-broken.

## Issues encountered

- Next.js 16 refuses to run two `next dev` instances against one project directory, so the empty-DB verification swapped `DATABASE_PATH` on the single dev server instead of running a parallel one on another port. No code impact.
- A `ReactNode`-typed value can't feed a `string | false` class-name parameter (`leadingIcon && "pl-9"`); fixed with an explicit ternary in `Input`.

## Decisions log

| # | Decision | Why |
| --- | --- | --- |
| 1 | Theme namespaces are **reset** in `@theme` (`--color-*: initial` etc.) before defining the spec tokens | Makes design §8.2 ("no hex/px/shadow outside globals.css") structurally enforceable: Tailwind simply has no other color/size utilities to reach for. `--color-white` added since §4.1 specifies `#fff` text on filled buttons. |
| 2 | Layout widths (1100px page, 480px search, 380px empty state, 72ch prose) defined as `--container-*` tokens | They are px values, so they belong in globals.css; as tokens they map to `max-w-page`, `max-w-search`, etc. instead of arbitrary-value utilities. |
| 3 | Button loading state locks width with two stacked CSS-grid cells (default + loading label both always occupy the cell; one is invisible) | Achieves §4.1's "width locked to pre-loading width" without a measuring ref, keeping Button a server component — no client JS shipped for read-only pages (architecture §10). |
| 4 | `Button` is polymorphic: `href` renders a Next `Link` with identical styling | The header "New article", empty-state CTAs, and 404 action are all navigations that the design styles as buttons; one primitive avoids a parallel "ButtonLink". |
| 5 | ArticleBody prose styles live in `globals.css` (`.article-body`), not in component-level Tailwind classes | §6.3 is full of px values that must stay in globals.css per §8.2; react-markdown's output is also easier to style via descendant CSS than per-element component overrides (only the table wrapper needs an override). |
| 6 | Detail page reuses `parseArticleId` from `src/lib/api/http.ts` | Identical "non-numeric → not found" semantics as the API (iteration 2 decision #5); duplicating the regex risks drift. |
| 7 | `Input` takes a required `id` and an optional `labelHidden` | No `useId` in server components, so ids are explicit; `labelHidden` keeps the §4.2 "always a `<label>`" rule for the header search box where the design shows no visible label (SR-only). |
| 8 | Relative-time util ships with unit tests despite iteration 3 having no mandated test tasks | Brief requires unit tests for core logic; date-boundary math (just-now/minutes/hours/days/absolute cutoffs, pluralization) is exactly the kind of logic that silently regresses. Tests are TZ-safe (local-time constructor). |

## State of the codebase

Working and runnable. `npm run dev` boots the styled app against the seeded DB; the full browse flow (home grid → detail → back), the 404 page, the header search stub → `/search` instruction page, and the zero-articles empty state all work; layout verified at 1280/800/375 px with keyboard access per design §7. `npm run check` is green (47 tests). Remaining for later iterations: SearchBox dropdown + real results page (4), editor/create/edit/delete (5), E2E + QA + verification docs (6).

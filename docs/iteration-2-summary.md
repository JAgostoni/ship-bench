# Iteration 2 Summary — Article browsing and detail

**Date:** 2026-07-12  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

### Query layer (`src/lib/queries/articles.ts`)

| Function | Behavior |
|----------|----------|
| `listArticles` | Status (default `PUBLISHED`), optional `categorySlug` / `tagSlug`, 1-based `page`, `pageSize` default 20; sort `updatedAt` desc; includes category + tags; returns `{ items, total, page, pageSize, totalPages }` |
| `getArticleBySlug` | Full article with relations; `null` if missing |
| `listCategories` / `listTags` | id, name, slug ordered by name (for filters) |
| `parseListStatus` / `parsePageParam` | URL param helpers |

Pages call queries only — no raw Prisma in route files.

### UI primitives (`src/components/ui/`)

- `Button` — primary, secondary, ghost, danger, danger-ghost; h-10; focus ring; disabled opacity  
- `Input`, `Label`, `Select`, `Badge`, `Textarea` — token-aligned styles for list/detail and future forms  

### Presentation components

| Component | Role |
|-----------|------|
| `StatusBadge` | Draft-only amber pill (published silent by default) |
| `EmptyState` | Icon + title + description + optional CTA |
| `ArticleListItem` | Full-row link: title, excerpt clamp, category/Uncategorized, tags (max 3 +N), relative date, Draft badge |
| `ArticleList` | Maps rows; empty states; Prev / Page N / Next pagination preserving filters |
| `ArticleDetail` | Back link, H1, meta, Edit link, Delete stub (disabled), sanitized prose |
| `ArticleFilters` | Desktop chip rail (status/category/tag); mobile GET form with selects |

### Date helpers (`src/lib/utils/dates.ts`)

- `formatRelativeUpdated` — e.g. “Updated 3d ago”  
- `formatAbsoluteUpdated` — e.g. “Updated Jul 10, 2026, 2:14 PM”  

### Routes

| Route | Behavior |
|-------|----------|
| `/` | SSR list; `?status=` / `?category=` / `?tag=` / `?page=`; force-dynamic |
| `/articles/[slug]` | Detail SSR; `notFound()` on miss; metadata from title/excerpt |
| `not-found.tsx` | Design S6: FileQuestion, “Article not found”, “Back to articles” |

### Shell

- Header “New article” primary styles retained; responsive two-row layout below `md`  
- Search remains disabled placeholder (Iteration 5)  
- `main#main-content` has `tabIndex={-1}` for skip link  

### Tests

- Unit tests for date helpers (`tests/unit/dates.test.ts`) in addition to existing smoke test  

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| **Category/tag filters** | Wired end-to-end on list via URL (recommended by iteration brief). Form assignment remains Iteration 4. |
| **Delete** | Visible but **disabled** stub until Server Actions (Iteration 3). Edit links to `/articles/[slug]/edit` (404 until It. 3). |
| **Pagination with 10 seeds** | `pageSize=20` → single page; control renders only when `totalPages > 1`. Out-of-range `?page=` with `total > 0` shows “No matching articles” + Clear filters (not the empty-DB CTA). |
| **Sanitizer** | Reused complete Iteration 1 `sanitizeHtml` before `dangerouslySetInnerHTML`. |
| **Build warning** | Next NFT trace warning involving `db.ts` path resolution — non-blocking; present since foundation. |
| **Mobile filters** | Apply via form submit (“Apply filters”) rather than onChange navigation — no client JS required. |

---

## Verification (local)

Commands run successfully:

```text
npm run db:seed    # 4 categories, 6 tags, 10 articles
npm test           # 7 tests passed (smoke + dates)
npx tsc --noEmit   # OK
npm run build      # OK — routes: / (dynamic), /articles/[slug] (dynamic), not-found
npm run dev        # http://localhost:3000
```

HTTP checks against dev server:

| Check | Result |
|-------|--------|
| `GET /` | 200; 8 published articles listed |
| `GET /?status=DRAFT` | 200; 2 drafts |
| `GET /?status=ALL` | 200; 10 articles |
| `GET /?category=hr` | 200; HR-related published items |
| `GET /?tag=onboarding` | 200; matching published item(s) |
| `GET /?category=hr&tag=runbook` | 200; “No matching articles” + Clear filters |
| `GET /articles/new-hire-onboarding` | 200; title, prose, Edit, All articles |
| `GET /articles/does-not-exist` | 404; branded not-found UI |

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| I2-D1 | Wire category + tag URL filters in It. 2 | Queries already support them; small effort; unlocks browse value early |
| I2-D2 | Desktop = chip links; mobile = GET form + Apply | Matches design S1; zero client components for filters |
| I2-D3 | Delete button visible but disabled | Design shows Delete on detail; avoid fake confirm without action; It. 3 owns mutations |
| I2-D4 | `force-dynamic` on list and detail | Architecture §7.1; SQLite + post-mutation revalidation path |
| I2-D5 | Pagination hides when `totalPages ≤ 1` | Design §6.9 |
| I2-D6 | Relative dates use pure `Intl`/math helpers | English-only; unit-testable without deps |
| I2-D7 | Empty page beyond range treated as empty list | No silent redirect; empty state clarifies no rows |

---

## Out of scope (noted, not built)

- Create/edit/delete Server Actions and TipTap (Iteration 3)  
- Category/tag assignment on forms (Iteration 4 polish)  
- Search API + typeahead (Iteration 5)  
- Playwright E2E, conflict UX, error boundary polish (Iteration 6)  

---

## How to re-run

```bash
npm install
cp .env.example .env   # if needed
npx prisma migrate dev
npm run db:seed
npm run dev
# Browse http://localhost:3000
# Drafts: /?status=DRAFT
# Detail: /articles/new-hire-onboarding
# 404: /articles/does-not-exist
```

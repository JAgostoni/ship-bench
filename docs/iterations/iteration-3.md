# Iteration 3 – Full‑Text Search Integration

## Goal
Add fast full‑text search over article titles and content using SQLite FTS5 and integrate it into the UI.

## Scope
- Extend Prisma migration to create FTS5 virtual table (`article_fts`).
- Add triggers to keep FTS index in sync with `Article` CRUD.
- Implement API endpoint `GET /api/search?query=` that queries the FTS table and returns ranked results.
- Build debounced search bar component (`SearchBox`) on the article list page.
- Update list UI to display search results, highlight matching terms.
- Add empty‑state UI for no results.
- Write unit tests for the search service and integration test for the API route.
- Add a Playwright test that performs a search and verifies results.

## Tasks
1. Create migration file `scripts/migrate-search.ts` that runs raw SQL to create `article_fts` virtual table and triggers (as per architecture). Add to `prisma/migrations`.
2. Run migration (`npx prisma migrate dev --name add-search`).
3. Implement `src/lib/search.ts` with function `searchArticles(query: string)` using raw Prisma `$queryRaw` to `SELECT * FROM article_fts WHERE article_fts MATCH ?`.
4. Add API route `src/app/api/search/route.ts` exposing GET endpoint.
5. Create `src/components/SearchBox.tsx` with debounce (300 ms) using `useState` and `useEffect`.
6. Update `src/app/articles/page.tsx` to consume search query via React Query (`useSearch`).
7. Highlight matches in `ArticleCard` (simple `<mark>` around query substring).
8. Write Jest test `tests/unit/search.test.ts` for `searchArticles`.
9. Write Playwright test `tests/e2e/search.spec.ts` that:
   - Loads `/articles`.
   - Types a query.
   - Expects at least one result card.
   - Verifies highlighted term.
10. Ensure lint passes.

## Notes
- Keep search UI on the same page; no separate results page.
- Use SQLite FTS5 ranking (bm25) for ordering.
- Ensure query is sanitized (parameterized) to avoid injection.
- Update README with search usage instructions.
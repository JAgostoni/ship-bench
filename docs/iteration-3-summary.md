# Iteration 3 Summary

**Built**:
- SQLite FTS5 virtual table `article_fts` with triggers for sync.
- `src/lib/search.ts` service exposing `searchArticles`.
- API route `src/app/api/search/route.ts` (`GET /api/search?query=`).
- Debounced `SearchBox` component using `useDebounce` hook.
- Updated articles list page to fetch articles client‑side, integrate SearchBox, and highlight matches via `ArticleCard`.
- Added `useDebounce` hook.
- Unit test `tests/unit/search.test.ts` for search service.
- Playwright E2E test `tests/e2e/search.spec.ts`.
- Minor UI enhancements (data-test-id for testing, highlight markup).

**Assumptions**:
- Search UI stays on the same page; no separate results page.
- BM25 ranking used via `bm25()` function.
- Query length >0 required; empty query returns empty results.

**Verification**:
- `npm run test` passes unit test.
- `npx playwright test` passes E2E search test.
- Application runs locally (`npm run dev`) and search bar returns filtered articles with highlighted terms.

**Decisions Log**:
- Used raw `$queryRawUnsafe` with parameter placeholder for safety.
- Chose 300 ms debounce as per spec.
- Added `data-test-id` for reliable Playwright selectors.
- Made `ArticleCard` accept optional `query` prop for highlighting.

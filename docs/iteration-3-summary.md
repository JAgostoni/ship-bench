# Iteration 3 Summary

**What was built**
- Added SQLite FTS5 virtual table `article_fts` and triggers (`article_ai`, `article_ad`, `article_au`) to keep it in sync with `Article`.
- Implemented `src/lib/search.ts` using raw SQL with BM25 ranking (`bm25`).
- Exposed GET `/api/search` endpoint (`src/app/api/search/route.ts`).
- Created client‑side search UI (`SearchBox.tsx`) with 300 ms debounce and React‑Query v5.
- Updated `ArticlesPage` (`src/app/articles/page.tsx`) to fetch articles client‑side, manage query state, and pass `query` to `ArticleCard`.
- Updated `ArticleCard` (`src/components/ArticleCard.tsx`) to highlight matching terms and include `data-test-id="article-card"` for stable selectors.
- Fixed Tailwind‑PostCSS conflict by installing `@tailwindcss/postcss` and updating `postcss.config.cjs`.
- Added date serialization in `src/app/api/articles/route.ts` (ISO strings for `createdAt`/`updatedAt`).
- Integrated `QueryClientProvider` in `src/app/layout.tsx` and added necessary `"use client"` directives.
- Added unit test `tests/unit/search.test.ts` and Playwright e2e test `tests/e2e/search.spec.ts`; both now pass.

**Assumptions / Issues**
- e2e test uses a uniquely‑titled article to avoid false positives.
- BM25 ranking is sufficient for relevance in this MVP.
- React‑Query v5 requires object‑style query definitions.
- Tailwind v4 needs a separate PostCSS plugin.

**Decisions log**
- Placed `QueryClientProvider` at the top‑level layout for global access.
- Added `"use client"` to any component receiving server‑side props.
- Chose `data-test-id="article-card"` for reliable test selectors.
- Serialized `Date` fields to ISO strings for JSON safety.

**Verification**
- `npm run dev` starts the app without errors.
- Searching via the UI returns filtered articles with highlighted terms.
- `npm test` and `npm run test:e2e` both succeed.


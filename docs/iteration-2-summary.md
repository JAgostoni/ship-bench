# Iteration 2 Summary: Backend API & Core Unit Tests

## What Was Built

### Services
- **`server/services/articleService.ts`** — Full CRUD (`listArticles`, `getArticleBySlug`, `createArticle`, `updateArticle`, `deleteArticle`) with auto-generated excerpts, unique slug generation, tag `connectOrCreate`, and immutable slugs on update.
- **`server/services/searchService.ts`** — FTS5-powered search with `$queryRawUnsafe`, rank-ordered results, and a 50-result limit. Includes FTS5 query sanitization to prevent SQL injection and syntax errors.
- **`server/services/categoryService.ts`** — `listCategories` with article counts via Prisma `_count`.

### Routes
- **`server/routes/articles.ts`** — `GET /api/articles` (with `search` inline delegation and pagination), `GET /api/articles/:slug`, `POST`, `PUT`, `DELETE`.
- **`server/routes/search.ts`** — `GET /api/search?q=` dedicated search endpoint.
- **`server/routes/categories.ts`** — `GET /api/categories`.

### Validation & Error Handling
- **`server/middleware/validate.ts`** — `validateBody` middleware with custom `ValidationError`. Maps Zod `issues` to `{ field, message }`.
- **`server/middleware/errorHandler.ts`** — Handles `ValidationError`, Prisma `P2025` (404), `P2002` (409), and generic 500s. Consistent `{ data, error }` envelope.

### Utilities
- **`server/lib/slugify.ts`** — `slugify()` and `generateUniqueSlug()` with collision handling and fallback for empty slugs.
- **`server/lib/test-db.ts`** — Fast test DB helper using raw SQL migration + FTS5 setup, with isolated per-suite database files to avoid SQLite lock contention.

### Tests
- **`server/lib/slugify.test.ts`** — 10 tests covering normalization, trimming, collision handling, and fallback slugs.
- **`server/services/articleService.test.ts`** — 9 tests covering CRUD, excerpt generation, tags, slug immutability, pagination, and missing-resource handling.
- **`server/services/searchService.test.ts`** — 5 tests covering title/content search, empty results, empty query, and category/tag inclusion.
- **`server/services/categoryService.test.ts`** — 1 test verifying article counts.

**Total: 25 unit tests, all passing.**

## Assumptions & Issues Encountered

- **SQLite FTS5 `MATCH` + Prisma parameterized queries:** Prisma's `$queryRaw` parameter interpolation doesn't work with `MATCH` expressions in SQLite FTS5 (causes `no such column` errors). Switched to `$queryRawUnsafe` with strict input sanitization (strip non-alphanumeric characters, escape single quotes). This is a known limitation of how Prisma parameterizes raw queries against virtual tables.
- **Prisma 7 + SQLite + concurrent tests:** The default `better-sqlite3` adapter experiences `SQLITE_BUSY`/`SocketTimeout` when multiple test suites try to share a single test database. Solved by creating an isolated database file per test suite via a suffix parameter in `test-db.ts`.
- **Zod v4 API difference:** Zod v4 uses `.issues` on `ZodError` instead of `.errors`. Fixed in `validate.ts`.
- **Category nulling on partial update:** Passing `categoryId: null` in `updateArticle` was incorrectly clearing the category even when it wasn't part of the update. Fixed to only set `categoryId` when explicitly provided.

## Verification

- `npm run test:unit:run` ✅ (25 tests passed)
- `GET /api/articles` returns paginated seeded articles ✅
- `GET /api/articles/:slug` returns single article with category/tags ✅
- `GET /api/articles?search=onboarding` delegates to search ✅
- `GET /api/search?q=onboarding` returns FTS5-ranked results ✅
- `POST /api/articles` creates article, triggers FTS5 index, returns 201 ✅
- `PUT /api/articles/:slug` updates without changing slug ✅
- `DELETE /api/articles/:slug` removes article, search no longer finds it ✅
- Invalid payloads return 400 with field-level error details ✅
- Missing resources return 404 with consistent envelope ✅

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| `$queryRawUnsafe` for FTS5 MATCH | Prisma parameter interpolation breaks SQLite FTS5 MATCH. Strict input sanitization (alphanumeric + spaces only) mitigates injection risk. |
| Isolated test DB files per suite | Prevents `SQLITE_BUSY` in concurrent Vitest workers. Each suite gets its own `.db` file. |
| Service-level `db` parameter with default | Makes services testable against isolated DBs while keeping production code clean (defaults to global `prisma`). |
| `categoryId` conditional in update | Only nulls category when explicitly passed; preserves category on partial updates. |
| `tagNames` causes full tag reconnect | Simplifies tag updates: clear old tags, then `connectOrCreate` new ones. Acceptable for MVP. |

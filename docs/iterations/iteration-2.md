# Iteration 2: Backend API & Core Unit Tests

**Goal:** Implement the complete REST API for articles, search, and categories; wire Prisma services; validate all inputs with Zod; handle errors consistently; and unit-test core logic so the API contract is stable before frontend integration.

**Deliverable:** All `/api/*` endpoints return correctly shaped JSON envelopes; unit tests pass; manual `curl` verification succeeds against seeded data.

---

## Task List

### 2.1 Implement `slugify.ts` utility and unit tests
- File: `server/lib/slugify.ts`
  - `slugify(title)` — normalize to lowercase, trim, replace spaces/non-alphanumerics with single hyphens, strip leading/trailing hyphens.
  - `generateUniqueSlug(prisma, title)` — generate base slug; if collision exists in `Article`, append `-2`, `-3`, etc.
- File: `server/lib/slugify.test.ts` (Vitest)
  - Cases: normal title, multiple spaces, special chars, leading/trailing punctuation, collision handling with mocked Prisma.

### 2.2 Implement article service layer
- File: `server/services/articleService.ts`
  - `listArticles({ page, limit, search? })` — return paginated article list with `category` and `tags` populated. If `search` is provided, delegate to search service.
  - `getArticleBySlug(slug)` — return single article or `null`.
  - `createArticle(data)` — generate unique slug from title, auto-generate `excerpt` from first 160 chars of content if not provided, create article, connect/create tags, return full article.
  - `updateArticle(slug, data)` — update fields, reconnect tags if `tagNames` provided. Do **not** change slug on update (immutable after creation per design spec).
  - `deleteArticle(slug)` — hard delete (soft-delete deferred to v2). Cascade cleanup via Prisma relations.
- File: `server/services/articleService.test.ts` (Vitest)
  - Use an in-memory or temporary SQLite test database via Prisma (setup/teardown in `vitest.config.ts` or per-file `beforeAll/afterAll`).
  - Test CRUD operations, excerpt generation, tag creation/connect, slug immutability on update, and delete.

### 2.3 Implement search service layer
- File: `server/services/searchService.ts`
  - `searchArticles(query)` — execute raw Prisma query against `ArticleFts` using `MATCH`, join back to `Article` for metadata, order by BM25 rank, limit to 50 results.
  - Return same shape as article list items (title, excerpt, slug, updatedAt, category, tags).
- File: `server/services/searchService.test.ts` (Vitest)
  - Seed articles, run FTS queries, assert ranking relevance (title match should rank above content match), assert empty results, assert 50-result cap.

### 2.4 Implement category service layer
- File: `server/services/categoryService.ts`
  - `listCategories()` — return all categories with article counts.
- File: `server/services/categoryService.test.ts` (Vitest)
  - Verify categories from seed script are returned.

### 2.5 Wire Express routes
- File: `server/routes/articles.ts`
  - `GET /api/articles?search=&page=&limit=` — list articles. If `search` query param is present, call `searchService.searchArticles(query)` instead of `articleService.listArticles()`.
  - `GET /api/articles/:slug` — get single article. Return `404` envelope if not found.
  - `POST /api/articles` — create article. Validate body with `ArticleCreateSchema`. Return `201` with created article.
  - `PUT /api/articles/:slug` — update article. Validate body with `ArticleUpdateSchema`. Return `200` with updated article.
  - `DELETE /api/articles/:slug` — delete article. Return `204` (no body) or `200` with success envelope.
- File: `server/routes/search.ts`
  - `GET /api/search?q=` — dedicated search endpoint. Calls `searchService.searchArticles`. Returns same envelope shape as article list.
- File: `server/routes/categories.ts`
  - `GET /api/categories` — list categories.

### 2.6 Implement validation and error handling middleware
- File: `server/middleware/validate.ts`
  - Generic middleware factory: `(schema: ZodSchema) => (req, res, next)`.
  - On validation failure, call `next()` with a custom `ValidationError` containing Zod `issues` mapped to `{ field, message }`.
- File: `server/middleware/errorHandler.ts`
  - Catch `ValidationError`, Prisma `P2025` (not found), Prisma `P2002` (unique constraint), and generic errors.
  - Return consistent envelope:
    ```json
    { "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
    ```
  - Log unexpected errors to stderr; do not leak stack traces in responses.

### 2.7 Update `server/index.ts`
- Replace placeholder route mounts with real routers from `routes/`.
- Ensure global error handler is the **last** middleware.
- Confirm CORS origin is read from `.env`.

### 2.8 Run unit tests and manual verification
- Run `npm run test:unit:run` — all service and utility tests should pass.
- Manual checks via `curl` or HTTP client:
  - `GET /api/articles` returns seeded articles.
  - `GET /api/search?q=onboarding` returns relevant articles.
  - `POST /api/articles` with valid body creates article and updates FTS index (verify via subsequent search).
  - `PUT /api/articles/:slug` updates without changing slug.
  - `DELETE /api/articles/:slug` removes article and search no longer finds it.
  - Invalid payloads return `400` with field-level error details.
- Commit the iteration.

---

## Iteration-Specific Notes
- **Test database strategy:** Use a separate SQLite file (e.g., `file:./prisma/test.db`) for unit tests. Reset it before each test file by running `prisma migrate deploy` against the test DB URL.
- **FTS5 verification:** Because FTS5 is maintained by triggers, service tests do not need to test trigger logic directly; they only need to assert that `searchArticles` returns expected results after CRUD operations.
- **API contract stability:** The response envelope shape (`{ data, error }`) must be frozen in this iteration. Frontend code in Iterations 3–4 depends on it.
- **Slug immutability:** The design spec §8.4 says "slug is immutable after publish." In v1, since there is no status workflow yet, the rule simplifies to: slug never changes after creation. Enforce this in `updateArticle`.

# Iteration 2 Summary — Data Layer

## What Was Built

The complete server-side data layer for the Internal Knowledge Base app:

- **`src/types/index.ts`** — shared TypeScript types: `ArticleStatus`, `CategoryDTO`, `ArticleDTO`, `ArticleListItem`
- **`src/lib/prisma.ts`** — Prisma client singleton using Prisma 7's `@prisma/adapter-pg` adapter pattern
- **`src/lib/slugify.ts`** — `generateSlug(title, db, excludeId?)` with collision-suffix logic (appends `-2`, `-3`, etc.)
- **`src/lib/excerpt.ts`** — `extractExcerpt(markdown)`: strips Markdown syntax, truncates at word boundary to 200 chars with `…`
- **`src/lib/readingTime.ts`** — `readingTimeMinutes(markdown)`: `Math.ceil(wordCount / 200)`, minimum 1
- **`src/lib/schemas.ts`** — Zod validation schemas: `createArticleSchema`, `updateArticleSchema`, `articleQuerySchema`, `createCategorySchema`, `categorySlugSchema`
- **`src/lib/categories.ts`** — `listCategories`, `getCategoryBySlug`, `createCategory`; includes `buildColorIndexMap` helper for consistent `colorIndex` computation
- **`src/lib/articles.ts`** — `listArticles`, `searchArticles` (PostgreSQL FTS via raw SQL), `getArticleBySlug`, `getArticleById`, `createArticle`, `updateArticle`, `deleteArticle`; defines `NotFoundError` class
- **`src/app/api/articles/route.ts`** — `GET` (list/search) and `POST` (create) handlers
- **`src/app/api/articles/[id]/route.ts`** — `GET`, `PUT`, `DELETE` handlers with 404 on missing article
- **`src/app/api/categories/route.ts`** — `GET` (list) and `POST` (create) handlers with 409 on duplicate name

## Assumptions Made

1. **`z.string().cuid()` removed in Zod v4** — Used `z.string().nullable().optional()` for `categoryId` instead of `.cuid()`. The DB foreign key constraint is the real guard; format validation at this level is redundant.

2. **`colorIndex` consistency** — The iteration spec says `colorIndex` must be the category's position in an alphabetically sorted list of *all* categories, modulo 6. Both `listCategories()` and `toArticleListItem()` call `buildColorIndexMap(allCategories)` from the same helper, ensuring consistent values.

3. **`searchArticles` raw SQL approach** — The architecture spec's raw query returns `Article[]` without the `category` relation. Rather than a complex JOIN + manual type mapping, the implementation does two queries: (1) raw SQL to get IDs in ts_rank order; (2) Prisma `findMany` to get full articles with categories. The result is re-sorted to match the ts_rank order. This is 2 queries vs. the N+1 it avoids.

4. **Prisma 7 adapter pattern** — Consistent with iteration 1: `PrismaClient` imported from `@/generated/prisma/client`, instantiated with `new PrismaPg({ connectionString })`. The singleton is stored on `globalThis` to prevent connection pool exhaustion during hot-reload.

5. **`Prisma.PrismaClientKnownRequestError`** — Used for detecting unique constraint violations (error code `P2002`) in `createCategory`. Imported from the generated client's `Prisma` namespace.

## Verification Results

All endpoints manually verified with curl:

| Endpoint | Result |
|---|---|
| `GET /api/articles` | Returns 7 published articles with full DTO structure |
| `GET /api/articles?q=onboarding` | Returns 1 article (FTS working) |
| `GET /api/articles?category=engineering` | Returns 2 engineering articles only |
| `GET /api/articles/nonexistent-id` | 404 with `{ error, code: 'NOT_FOUND' }` |
| `POST /api/articles` | Returns 201 with created article, slug auto-generated |
| `GET /api/categories` | Returns 5 categories with correct colorIndex values |

A test article was created during verification; run `npm run db:reset && npm run db:seed` to restore a clean seed state.

## Confirmation: App Runs Locally

- Dev server starts at `http://localhost:3000`
- All API endpoints respond correctly
- FTS search returns relevant results, not all articles
- Category colorIndex values are consistent across list and article endpoints

## Decisions Log

| Decision | Rationale |
|---|---|
| Two-query approach for `searchArticles` | Keeps Prisma relation loading (category) separate from raw FTS; avoids manual JOIN result mapping and type gymnastics |
| `buildColorIndexMap` in `categories.ts`, shared by `articles.ts` | Iteration spec requires identical computation; centralizing prevents drift |
| `z.string()` instead of `z.string().cuid()` for categoryId | Zod v4 removed `.cuid()` from string methods; DB constraint is the real guard |
| `NotFoundError` defined in `articles.ts` | Route handlers catch it to return 404; keeps error semantics in the service layer |
| `status` cast via `as ArticleStatus` in `toArticleListItem` | Prisma enum type from generated client doesn't structurally match the union type in `src/types`; cast is safe because DB enforces the valid values |

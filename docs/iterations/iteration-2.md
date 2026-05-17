# Iteration 2 — Data Layer

## Goal

Build the complete server-side data layer: shared TypeScript types, Zod validation schemas, utility functions, the Prisma service layer, and all REST API route handlers. After this iteration every data operation the application needs (list, get, create, update, delete, search articles; list and create categories) is implemented and callable via HTTP. No UI exists yet — verify with curl or a REST client.

## Scope

- Shared TypeScript types (`src/types/index.ts`)
- Prisma client singleton (`src/lib/prisma.ts`)
- Utility functions: slug generation (`src/lib/slugify.ts`), excerpt extraction (`src/lib/excerpt.ts`)
- Zod schemas for articles and categories (`src/lib/schemas.ts`)
- Article service layer (`src/lib/articles.ts`) — CRUD + FTS search
- Category service layer (`src/lib/categories.ts`)
- REST API route handlers: `GET/POST /api/articles`, `GET/PUT/DELETE /api/articles/[id]`, `GET/POST /api/categories`

---

## Task List

### 2.1 — Define shared TypeScript types

Create `src/types/index.ts`. Export the following types derived from the Prisma schema. These are the shapes that cross service → route handler → component boundaries:

```ts
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  colorIndex: number;   // derived at read time, not stored
  createdAt: Date;
};

export type ArticleDTO = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;      // derived, not stored
  status: ArticleStatus;
  category: CategoryDTO | null;
  createdAt: Date;
  updatedAt: Date;
  readingTimeMinutes: number;  // derived, not stored
};

export type ArticleListItem = Omit<ArticleDTO, 'content'>;
// excerpt + readingTimeMinutes are included; content is omitted for list views
```

### 2.2 — Create the Prisma client singleton

Create `src/lib/prisma.ts` exactly as specified in the architecture spec (§4):

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

This singleton pattern prevents connection pool exhaustion during hot-reload in Next.js dev mode.

### 2.3 — Implement slug generation utility

Create `src/lib/slugify.ts`. Requirements:
- Accept a raw title string, return a URL-safe lowercase slug
- Use the `slugify` package with `{ lower: true, strict: true }` options
- Accept a `db` parameter (Prisma client) and an optional `excludeId` to support collision checking on edit
- Implement collision suffix logic: if the base slug exists (ignoring `excludeId`), append `-2`, `-3`, etc. until a unique slug is found
- Check uniqueness against the `Article` table via the passed Prisma client (not the singleton, so it can be mocked in tests)

```ts
// signature
export async function generateSlug(
  title: string,
  prisma: PrismaClient,
  excludeId?: string
): Promise<string>
```

### 2.4 — Implement excerpt extraction utility

Create `src/lib/excerpt.ts`. Requirements:
- Accept a raw Markdown string, return a plain-text excerpt of at most 200 characters
- Strip Markdown syntax (headings `#`, bold `**`, italic `*`, links `[text](url)`, inline code backticks, image syntax) using regex — do not import a full Markdown parser for this
- Truncate at a word boundary (do not cut mid-word) at 200 chars
- Append `…` if the text was truncated
- Return the full stripped text (no ellipsis) if it is under 200 chars

```ts
// signature
export function extractExcerpt(markdown: string): string
```

### 2.5 — Implement reading time utility

Create `src/lib/readingTime.ts`. Requirements:
- Accept a raw Markdown string, return an integer (minutes)
- Formula: `Math.ceil(wordCount / 200)` where wordCount is the number of whitespace-separated tokens in the raw string
- Minimum return value: 1

```ts
// signature
export function readingTimeMinutes(markdown: string): number
```

### 2.6 — Define Zod validation schemas

Create `src/lib/schemas.ts`. Define and export the following schemas. These are the single source of truth for input validation — imported by both API route handlers and Server Actions.

```ts
import { z } from 'zod';

export const categorySlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens');

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  categoryId: z.string().cuid().nullable().optional(),
});

export const updateArticleSchema = createArticleSchema.partial();
// All fields optional for PUT (partial update)

export const articleQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),   // category slug
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});
```

### 2.7 — Implement the category service layer

Create `src/lib/categories.ts`. Functions:

**`listCategories()`**
- Query all categories ordered by `name ASC`
- Attach `colorIndex`: sort the result by `name` alphabetically (stable), then assign index = position in sorted array modulo 6
- Return `CategoryDTO[]`

**`getCategoryBySlug(slug: string)`**
- Return a single `CategoryDTO` or `null`

**`createCategory(data: { name: string })`**
- Generate slug from name via `slugify(name, { lower: true, strict: true })`
- Insert with Prisma; throw on unique constraint violation with a user-readable message
- Return the created `CategoryDTO`

All functions import `prisma` from `src/lib/prisma.ts`.

### 2.8 — Implement the article service layer

Create `src/lib/articles.ts`. Functions:

**`listArticles(opts?: { categorySlug?: string; status?: ArticleStatus })`**
- Default: `status = 'PUBLISHED'`
- If `categorySlug` is provided, join to Category and filter by slug
- Include the full `category` relation in the result
- Order by `updatedAt DESC`
- Map each result to `ArticleListItem` (attach `excerpt` via `extractExcerpt`, `readingTimeMinutes` via `readingTimeMinutes`, `colorIndex` via the category index logic)
- Return `ArticleListItem[]`

**`searchArticles(query: string, opts?: { categorySlug?: string })`**
- Use the raw SQL query from the architecture spec (§5) with `plainto_tsquery` and `ts_rank`
- Filter by `status = 'PUBLISHED'` always
- If `categorySlug` is provided, add `AND "categoryId" = (SELECT id FROM "Category" WHERE slug = ${categorySlug})`
- Limit 50 results
- Map results to `ArticleListItem[]` (same mapping as `listArticles`)

**`getArticleBySlug(slug: string)`**
- Return full `ArticleDTO` (including `content`) or `null`
- Include `category` relation

**`getArticleById(id: string)`**
- Same as above but by `id`
- Used by API route handlers where the URL param is the `id`

**`createArticle(data: z.infer<typeof createArticleSchema>, prismaClient?)`**
- Generate slug via `generateSlug(data.title, prisma)`
- Insert with Prisma
- Return full `ArticleDTO`

**`updateArticle(id: string, data: z.infer<typeof updateArticleSchema>)`**
- If `title` is provided and changed, regenerate slug (pass `excludeId: id`)
- Update with Prisma; throw `NotFoundError` (custom class) if no row is updated
- Return updated `ArticleDTO`

**`deleteArticle(id: string)`**
- Delete by `id`; throw `NotFoundError` if row does not exist
- Return `void`

Define a simple `NotFoundError extends Error` class at the top of the file (used by route handlers to return 404).

### 2.9 — Implement REST API route handlers

#### `src/app/api/articles/route.ts`

**GET** — list or search articles:
1. Parse and validate query params with `articleQuerySchema` (Zod). Return 400 with error detail on validation failure.
2. If `q` param is present: call `searchArticles(q, { categorySlug: category })`.
3. Otherwise: call `listArticles({ categorySlug: category, status })`.
4. Return `{ articles: ArticleListItem[], total: number }` as JSON 200.

**POST** — create article:
1. Parse request body with `createArticleSchema`. Return 400 on failure.
2. Call `createArticle(data)`.
3. Return `201 Created` with the created `ArticleDTO`.

#### `src/app/api/articles/[id]/route.ts`

**GET** — get article by id:
1. Call `getArticleById(params.id)`. Return 404 if not found.
2. Return `ArticleDTO` as JSON 200.

**PUT** — update article:
1. Parse request body with `updateArticleSchema`. Return 400 on failure.
2. Call `updateArticle(params.id, data)`. Return 404 if `NotFoundError`.
3. Return updated `ArticleDTO` as JSON 200.

**DELETE** — delete article:
1. Call `deleteArticle(params.id)`. Return 404 if `NotFoundError`.
2. Return `204 No Content`.

#### `src/app/api/categories/route.ts`

**GET** — list categories:
1. Call `listCategories()`.
2. Return `{ categories: CategoryDTO[] }` as JSON 200.

**POST** — create category:
1. Parse body with `createCategorySchema`. Return 400 on failure.
2. Call `createCategory(data)`. Handle unique constraint violations — return 409 Conflict.
3. Return `201 Created` with `CategoryDTO`.

All route handlers follow the error response format from the architecture spec:
```json
{ "error": "human-readable message", "code": "VALIDATION_ERROR | NOT_FOUND | SERVER_ERROR" }
```

### 2.10 — Verify the data layer

With the dev server running and the database seeded (from iteration 1), verify each endpoint manually:

```bash
# List articles
curl http://localhost:3000/api/articles

# Search articles
curl "http://localhost:3000/api/articles?q=onboarding"

# Filter by category
curl "http://localhost:3000/api/articles?category=engineering"

# Get article by id (use an id from the list response)
curl http://localhost:3000/api/articles/<id>

# Create article
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Article","content":"Hello world","status":"PUBLISHED"}'

# List categories
curl http://localhost:3000/api/categories
```

Confirm:
- List returns all seeded published articles
- Search returns relevant results (not empty, not all articles)
- Category filter returns only articles in that category
- Create returns 201 with the new article and a generated slug
- A GET for a non-existent id returns 404 with the error JSON format

---

## Iteration Notes

- No Prisma client access is allowed in route handler files directly — all DB calls go through the service layer (`src/lib/articles.ts`, `src/lib/categories.ts`). This keeps route files thin and services testable.
- The `colorIndex` computation (category position in alphabetically-sorted list, modulo 6) must be identical in both `listCategories()` and wherever `ArticleListItem` is assembled — centralize this in the category service to avoid drift.
- The raw SQL `searchArticles` query uses Prisma's tagged template literals which sanitize inputs; no raw string interpolation of `query` is allowed.
- `readingTimeMinutes` returns a minimum of 1 — never 0 — so the detail page always shows "1 min read" for very short articles.

# Technical Architecture Spec — Internal Knowledge Base App

> Generated: 2026-05-16  
> Based on: `docs/product-brief.md`

---

## 1. Technology Stack

All versions confirmed via live web search (May 2026).

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 LTS |
| UI runtime | React | 19.2.6 |
| Language | TypeScript | 6.0.3 |
| Styling | Tailwind CSS | 4.3.0 |
| ORM | Prisma | 7.4.2 |
| Database | PostgreSQL | 18.4 |
| Validation | Zod | 4.5.0 |
| Markdown editor | @uiw/react-md-editor | 4.1.0 |
| Markdown renderer | react-markdown + remark-gfm | latest |
| Slug generation | slugify | latest |
| Unit testing | Vitest | 4.1.6 |
| E2E testing | Playwright | 1.59.0 |
| Dev database | Docker Compose (PostgreSQL container) | — |

**Decision:** No separate backend service. Next.js App Router handles both SSR pages and API routes in a single process. This is appropriate for ~100 concurrent users and avoids operational overhead of running two services locally.

---

## 2. Front-End Architecture

### Rendering strategy

Next.js App Router is used throughout. The default is **React Server Components (RSC)** with opt-in Client Components only where browser interactivity is required.

| Page / component | Rendering mode | Reason |
|---|---|---|
| Article list `/articles` | Server Component | Data fetched at request time via Prisma; URL search params read server-side |
| Article detail `/articles/[slug]` | Server Component | Static-ish content; fast TTFB without client hydration |
| Create form `/articles/new` | Server Component shell + Client editor | Editor requires browser APIs |
| Edit form `/articles/[slug]/edit` | Server Component shell + Client editor | Same as above |
| Search bar | Client Component | Debounced user input drives URL param changes |
| Markdown editor | Client Component | `@uiw/react-md-editor` requires `window` |

### State management

No global state store (Redux, Zustand, etc.) is required for v1. State lives in:

- **URL search params** for the search query (`?q=`) and active category filter (`?category=`) — the article list page is a Server Component that reads these params
- **React `useActionState`** for form feedback on create and edit
- **`useState`** in the editor Client Component for editor content before submit

### Data fetching

Server Components call Prisma directly (no HTTP round-trip for reads). Mutations go through **Next.js Server Actions**, which the client invokes via React's `<form action={...}>` or `startTransition`.

**No TanStack Query** is included. The App Router's built-in caching, revalidation, and streaming make it unnecessary for this scope. If real-time collaborative editing becomes a requirement in a future version, TanStack Query or SWR can be added at the component level.

### Routing

```
/                          → redirect to /articles
/articles                  → browse + search (URL: ?q=, ?category=)
/articles/new              → create article
/articles/[slug]           → article detail
/articles/[slug]/edit      → edit article
```

Navigating from list → detail → edit and back uses Next.js `<Link>` with the App Router's built-in scroll restoration.

### Styling

Tailwind CSS 4.3.0. Use the CSS-first config approach introduced in v4 (`@import "tailwindcss"` in the root CSS file; no `tailwind.config.js` required for basic use).

- **Typography:** `@tailwindcss/typography` plugin for rendering the article body (`prose` class wraps `react-markdown` output).
- **Layout:** Single-column on mobile, two-column (sidebar + content) on tablet/desktop using Tailwind's responsive prefixes (`md:`, `lg:`).
- **No component library.** Raw Tailwind gives full control and avoids bundle weight for a simple internal tool.

### Form validation (client side)

Each form component parses its own Zod schema before calling the Server Action. Errors returned from the server action (also Zod-validated) are surfaced inline next to fields using `useActionState`.

---

## 3. Back-End Architecture

### API surface

Next.js Route Handlers under `src/app/api/` serve as the REST API. Server Actions handle form submissions from the UI. External consumers (scripts, integrations) should use the REST API.

```
GET    /api/articles               list articles; accepts ?q=, ?category=, ?status=
POST   /api/articles               create article
GET    /api/articles/[id]          get by id
PUT    /api/articles/[id]          update by id
DELETE /api/articles/[id]          delete by id
GET    /api/categories             list categories
POST   /api/categories             create category
```

All endpoints return `application/json`. Error responses follow:

```json
{ "error": "human-readable message", "code": "VALIDATION_ERROR | NOT_FOUND | SERVER_ERROR" }
```

### Request validation

Every API route handler validates its input (path params, query params, request body) with a Zod schema before touching the database. Validation errors return HTTP 400 with the Zod issue list serialized.

### Server Actions

Used exclusively from UI forms (create, edit, delete). Each action:
1. Validates input via shared Zod schema
2. Calls the Prisma service layer
3. Calls `revalidatePath` to invalidate the relevant cached routes
4. Returns either a success payload or a structured error for `useActionState`

### Service layer

A thin `src/lib/articles.ts` and `src/lib/categories.ts` module wraps all Prisma calls. Route handlers and Server Actions both import from this layer — no Prisma client access in route files directly.

### Authentication

None in v1. The brief explicitly states "basic security assumptions only." All endpoints are open. Add NextAuth.js or Clerk if auth is required in a later version.

---

## 4. Data Model and Persistence Strategy

### Prisma schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Article {
  id         String    @id @default(cuid())
  title      String
  slug       String    @unique
  content    String    // Raw Markdown text
  status     Status    @default(PUBLISHED)
  categoryId String?
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([status])
  @@index([categoryId])
  @@index([updatedAt])
}

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  articles  Article[]
  createdAt DateTime  @default(now())
}

enum Status {
  DRAFT
  PUBLISHED
}
```

### Field notes

| Field | Notes |
|---|---|
| `id` | CUID — collision-safe, URL-safe, sortable by creation time |
| `slug` | Derived from title on create via `slugify`; unique-enforced by DB; if a collision occurs, append `-2`, `-3`, etc. |
| `content` | Raw Markdown. Rendering happens client-side or in RSC via `react-markdown`. Not stored as HTML to avoid XSS and to allow re-rendering with different options. |
| `status` | `DRAFT` or `PUBLISHED`. List page shows only `PUBLISHED` by default; editors can toggle. Feature 5 from brief. |
| `categoryId` | Nullable FK. `onDelete: SetNull` preserves articles when a category is deleted. Feature 4 from brief. |
| `excerpt` | Not stored. Derived at read time by stripping Markdown and taking the first 200 characters. Done in the service layer. |

### Prisma client singleton (`src/lib/prisma.ts`)

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Persistence notes

- PostgreSQL 18.4 is the only database supported. Do not abstract the DB layer for other providers; it adds complexity with no benefit for this scope.
- Prisma migrations are committed to the repo under `prisma/migrations/`. The initial migration includes the GIN index for full-text search (see §5).
- No Redis, no in-memory cache. PostgreSQL query performance is more than sufficient for a small-to-medium article set with 100 concurrent users.

---

## 5. Feature-Specific Architecture Decisions

### Feature: Full-Text Search

**Scope:** Required (feature 2 from brief). Search across article titles and content.

**Implementation:** PostgreSQL built-in full-text search using `tsvector` and `tsquery`. A GIN index on `to_tsvector('english', title || ' ' || content)` is created via a raw SQL migration.

**Why not a search service (Typesense, Algolia, Meilisearch)?** The brief favors local-first simplicity and a small-to-medium article set. PostgreSQL FTS handles thousands of articles with sub-100ms response times. Adding a separate search service would mean two more processes to run locally and a sync pipeline to maintain.

**GIN index migration (added to initial Prisma migration):**

```sql
-- Run after prisma migrate creates the "Article" table
CREATE INDEX "Article_search_idx"
  ON "Article"
  USING GIN (to_tsvector('english', title || ' ' || content));
```

Add to `prisma/migrations/0001_init/migration.sql` after the table DDL.

**Search query (in `src/lib/articles.ts`):**

```ts
export async function searchArticles(query: string) {
  return prisma.$queryRaw<Article[]>`
    SELECT *
    FROM "Article"
    WHERE status = 'PUBLISHED'
      AND to_tsvector('english', title || ' ' || content)
          @@ plainto_tsquery('english', ${query})
    ORDER BY
      ts_rank(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', ${query})
      ) DESC
    LIMIT 50
  `;
}
```

**List page behavior:** The `/articles` Server Component checks for `searchParams.q`. If present, it calls `searchArticles`; otherwise it calls `listArticles` (standard Prisma query). No separate `/search` page — search results appear inline in the browse list view, driven by the URL.

**Search bar UX:** A Client Component with a 300 ms debounce that calls `router.push` to update `?q=` in the URL. The Server Component re-renders with the new param.

---

### Feature: Markdown Editor with Preview

**Scope:** Required (editing expectation from brief). WYSIWYG or Markdown with preview; simple and reliable.

**Implementation:** `@uiw/react-md-editor` 4.1.0. It is a self-contained React component with split-pane editor + preview, no build-time configuration, and no server-side rendering issues when wrapped in `dynamic(() => import(...), { ssr: false })`.

**Why not Tiptap?** Tiptap 3.x is a rich WYSIWYG editor better suited for collaborative document editing. The brief asks for simplicity. `@uiw/react-md-editor` is purpose-built for Markdown, requires zero configuration, and its bundle footprint is smaller.

**Dynamic import (required — component uses `window`):**

```ts
// src/components/ArticleEditor.tsx
"use client";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
```

**Content rendering on detail page:** `react-markdown` with `remark-gfm` renders the stored Markdown as HTML inside a `<div className="prose">` (Tailwind typography). This is a Server Component rendering step — no client JS needed for the detail view.

**XSS:** `react-markdown` does not set `dangerouslySetInnerHTML`; it builds a React tree. Disable raw HTML pass-through by not including `rehype-raw` unless explicitly needed.

---

### Feature: Category Organization (Feature 4 — included in data model; full UI is v2)

**Scope:** Data model and API are implemented in v1 so articles can be created with a category. The browse-by-category filter (`?category=`) is included in the list page. Full category management UI (create, rename, delete categories) is deferred to v2.

**Seed data:** A small set of default categories is seeded via `prisma/seed.ts` so the app is non-empty on first run.

---

### Feature: Article Status (Feature 5 — included in data model; basic UI in v1)

**Scope:** `DRAFT` / `PUBLISHED` enum is in the schema. The edit form includes a status toggle. The browse list page filters to `PUBLISHED` by default. Draft articles are accessible at their URL directly (no auth guard in v1).

---

## 6. Front-End / Back-End Integration

### Read flows (Server Components → Prisma)

```
Browser request
  → Next.js App Router
  → Server Component
  → src/lib/articles.ts (Prisma query)
  → PostgreSQL
  → RSC renders HTML
  → streamed to browser
```

No HTTP round-trip for reads. The component and the database call are co-located on the server. `next: { revalidate: 60 }` is set on fetch calls in layout boundaries to allow ISR-style cache warming in production.

### Write flows (Client → Server Action → Prisma)

```
User submits form
  → Client Component calls Server Action via form action prop
  → Server Action: validate (Zod) → service layer → Prisma → revalidatePath
  → Redirect or return error map to useActionState
  → Client re-renders with success/error state
```

### API routes (external access)

Used for scripts or future integrations. All route handlers mirror the same service layer functions. No business logic lives in route files.

### API contract examples

**`GET /api/articles?q=onboarding&category=engineering&status=PUBLISHED`**

```json
{
  "articles": [
    {
      "id": "clw123abc",
      "title": "Engineering Onboarding",
      "slug": "engineering-onboarding",
      "excerpt": "This guide walks new engineers through...",
      "status": "PUBLISHED",
      "category": { "id": "clw456def", "name": "Engineering", "slug": "engineering" },
      "createdAt": "2026-04-01T10:00:00Z",
      "updatedAt": "2026-05-10T14:30:00Z"
    }
  ],
  "total": 1
}
```

**`POST /api/articles`** — request body:

```json
{
  "title": "Engineering Onboarding",
  "content": "# Engineering Onboarding\n\nThis guide...",
  "status": "PUBLISHED",
  "categoryId": "clw456def"
}
```

Response: `201 Created` with the created article object.

**`PUT /api/articles/:id`** — partial update; all fields optional. Returns updated article.

**`DELETE /api/articles/:id`** — returns `204 No Content`.

---

## 7. Repository Structure and Developer Workflow

### Repo tree

```
knowledge-base/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, global nav
│   │   ├── page.tsx                    # / → redirect to /articles
│   │   ├── globals.css                 # @import "tailwindcss"
│   │   ├── articles/
│   │   │   ├── page.tsx                # Browse list + search
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Create form
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Article detail
│   │   │       └── edit/
│   │   │           └── page.tsx        # Edit form
│   │   └── api/
│   │       ├── articles/
│   │       │   ├── route.ts            # GET list, POST create
│   │       │   └── [id]/
│   │       │       └── route.ts        # GET, PUT, DELETE
│   │       └── categories/
│   │           └── route.ts            # GET list, POST create
│   ├── components/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleEditor.tsx           # Client Component, dynamic import
│   │   ├── ArticleRenderer.tsx         # Server Component, react-markdown
│   │   ├── CategoryBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Nav.tsx
│   │   ├── SearchBar.tsx               # Client Component
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── prisma.ts                   # Singleton Prisma client
│   │   ├── articles.ts                 # Article service (CRUD + search)
│   │   ├── categories.ts               # Category service
│   │   ├── slugify.ts                  # Title → unique slug
│   │   └── excerpt.ts                  # Strip MD, truncate to 200 chars
│   ├── actions/
│   │   ├── article.ts                  # Server Actions for article mutations
│   │   └── category.ts                 # Server Actions for category mutations
│   └── types/
│       └── index.ts                    # Shared TS types (ArticleDTO, CategoryDTO)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                         # Default categories + sample articles
│   └── migrations/
│       └── 0001_init/
│           └── migration.sql
├── tests/
│   ├── unit/
│   │   ├── slugify.test.ts
│   │   ├── excerpt.test.ts
│   │   └── articles.service.test.ts    # Uses Vitest + Prisma mock
│   └── e2e/
│       ├── browse.spec.ts
│       ├── search.spec.ts
│       └── edit.spec.ts
├── .env.example
├── docker-compose.yml
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── docs/
    ├── product-brief.md
    └── architecture.md
```

### Branch and commit conventions

- `main` — always deployable
- Feature branches: `feat/<name>`, bug fixes: `fix/<name>`
- Commits: conventional commits style (`feat:`, `fix:`, `chore:`)

### Package scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "generate": "prisma generate"
  }
}
```

---

## 8. Testing Strategy

### Unit tests — Vitest 4.1.6

**What to test:**
- `src/lib/slugify.ts` — slug generation, collision suffix logic
- `src/lib/excerpt.ts` — Markdown stripping, truncation at word boundary
- `src/lib/articles.ts` — service functions using a mocked Prisma client (`vitest-mock-extended` or manual mocks with `vi.fn()`)
- Zod schemas for articles and categories — valid inputs pass, invalid inputs produce correct error paths

**Vitest config (`vitest.config.ts`):**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

**No database in unit tests.** Prisma client is always mocked. Integration tests against a real database are handled by E2E tests.

### E2E tests — Playwright 1.59.0

**Critical user journeys to cover (per the brief):**

1. **Browse** — visit `/articles`, see article list, click into a detail page
2. **Search** — type in the search bar, see filtered results, clear search and see all articles
3. **Edit** — open an article, navigate to edit, change content, save, verify the change on the detail page
4. **Create** — create a new article with title + content, verify it appears in the list
5. **Empty state** — search for a term with no matches; verify the empty state UI is shown

**Config (`playwright.config.ts`):**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

E2E tests run against a local PostgreSQL instance pre-seeded with `prisma/seed.ts`. In CI, `docker-compose up -d` starts PostgreSQL, then `npm run db:migrate && npm run db:seed` initializes it before Playwright runs.

---

## 9. Local Development and Run Instructions

### Prerequisites

- Node.js ≥ 22 (for TypeScript 6.0 compatibility)
- Docker Desktop (for PostgreSQL container)

### First-time setup

```bash
# 1. Clone and install
git clone <repo>
cd knowledge-base
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Copy env and configure
cp .env.example .env
# .env already points to the Docker Compose DB by default

# 4. Run migrations and seed
npm run db:migrate
npm run db:seed

# 5. Generate Prisma client
npm run generate

# 6. Start dev server
npm run dev
```

App is available at `http://localhost:3000`.

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: kb_user
      POSTGRES_PASSWORD: kb_pass
      POSTGRES_DB: knowledge_base
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### `.env.example`

```
DATABASE_URL="postgresql://kb_user:kb_pass@localhost:5432/knowledge_base"
NODE_ENV="development"
```

### Stopping and resetting

```bash
# Stop the DB
docker compose down

# Full reset (drops all data)
npm run db:reset && npm run db:seed
```

---

## 10. Non-Functional Architecture Decisions

### Performance

- **Server Components by default** eliminates JS hydration cost for read-heavy pages (list, detail).
- **GIN index** on the FTS expression keeps search queries under 20 ms even with thousands of articles.
- **Turbopack** (Next.js 16 default) cuts dev cold-start from ~10s to ~1s for iterative development.
- **No `react-markdown` on the list page.** Excerpt is plain text; avoid running the Markdown parser for each card.

### Scalability path

The app is built as a standard Next.js + PostgreSQL stack. Scaling options require no architectural overhaul:
- Deploy to Vercel (zero config) or a single EC2/VPS for 100 users
- Add a read replica for PostgreSQL if read throughput becomes a bottleneck
- Add a search service (Meilisearch, Typesense) behind the same `searchArticles` interface if FTS is insufficient

### Responsive layout

- Desktop (≥ 1024 px): two-column — fixed 240 px sidebar (nav + category filter), fluid main content area
- Tablet (768–1023 px): same two-column but sidebar collapses to icon-only
- Mobile (< 768 px): single column, sidebar hidden behind a hamburger

Implemented with Tailwind responsive utilities (`md:flex`, `lg:w-60`).

### Accessibility (baseline, not full audit — per brief)

- All form inputs have associated `<label>` elements
- Color contrast meets WCAG AA for text (verified manually at design time)
- Focus-visible rings retained (Tailwind's `focus-visible:ring-2`)
- Article heading hierarchy: `h1` for article title, `h2`/`h3` for article section headings in content
- Empty states use `role="status"` and descriptive text

### Security

- **No raw HTML injection.** `react-markdown` builds a React tree; `rehype-raw` is not included.
- **Prisma parameterized queries** everywhere; the one raw query (`searchArticles`) uses tagged template literals which Prisma sanitizes.
- **Zod validates all external inputs** at both the API route and Server Action layers.
- **No secrets in client bundle.** `DATABASE_URL` is server-only; Next.js enforces this when accessed in Server Components.

---

## 11. Schema Migration Example

### Initial migration (`prisma/migrations/0001_init/migration.sql`)

```sql
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PUBLISHED',
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_idx" ON "Article"("status");
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");
CREATE INDEX "Article_updatedAt_idx" ON "Article"("updatedAt");

-- Full-text search GIN index
CREATE INDEX "Article_search_idx"
  ON "Article"
  USING GIN (to_tsvector('english', title || ' ' || content));

-- AddForeignKey
ALTER TABLE "Article"
  ADD CONSTRAINT "Article_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 12. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Single repo, no monorepo tooling | Plain Next.js project | No separate frontend/backend services; Nx/Turborepo adds overhead not justified at this scale |
| Next.js App Router over Pages Router | App Router | RSC, Server Actions, Turbopack — all stable in 16.x; Pages Router is in maintenance mode |
| No separate backend API service | Next.js Route Handlers | 100 concurrent users does not require horizontal scaling of a separate API process |
| PostgreSQL FTS over dedicated search | Built-in tsvector + GIN | Eliminates external dependency; adequate for small-to-medium corpus; search interface is isolated for future swap |
| Markdown storage (not HTML) | Raw Markdown in `content` | Avoids XSS from stored HTML; allows re-rendering with different plugins; smaller diffs |
| `@uiw/react-md-editor` over Tiptap | @uiw/react-md-editor 4.1.0 | Brief asks for simple, not enterprise-heavy; textarea-based, zero server-side config, self-contained preview |
| Vitest over Jest | Vitest 4.1.6 | Native ESM, faster cold start, integrates with Vite's module resolution; Next.js 16 supports it natively |
| No auth in v1 | Open access | Brief explicitly says "basic security assumptions only"; auth should be added as a discrete feature when required |
| No global state store | URL params + React state | App Router's server-centric model makes global client state unnecessary for this read-heavy app |
| CUID over UUID for IDs | `cuid()` | URL-safe, lexicographically sortable by time, no hyphens |
| Status and Category in v1 data model | Schema-level yes, full UI deferred to v2 | Avoids a painful migration later; data model cost is low, UI can be added incrementally |

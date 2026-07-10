# Technical Architecture Spec — Simplified Knowledge Base App

**Version:** 1.0  
**Date:** 2026-07-10  
**Source of truth:** [`docs/product-brief.md`](./product-brief.md)

---

## 1. Purpose and scope

This document is the implementation-ready technical architecture for the **Simplified Knowledge Base App**: an internal tool for a small team to create, browse, search, edit, and organize documentation.

A developer should be able to implement v1 from this spec **without making major architectural decisions**.

### 1.1 Product goals (from brief)

| Goal | Implication |
|------|-------------|
| Find answers quickly | Search-first UX; fast list + detail routes |
| Keep knowledge current | Low-friction edit flow; draft/published status |
| ~100 concurrent users (read + edit) | Single Node process + SQLite is enough; design for easy Postgres later |
| Finish in 1–2 sessions | Local-first monorepo; one process; minimal services |
| Calm, readable UI | Tailwind + simple layout system; no design system framework |

### 1.2 Feature scope for architecture

| # | Feature | v1 status | Architectural impact |
|---|---------|-----------|----------------------|
| 1 | Article browsing + detail | **Required** | Routes, list queries, SSR |
| 2 | Search titles + content | **Required** | FTS index, search API |
| 3 | Basic editing | **Required** | Editor, mutations, validation |
| 4 | Categories / tags | **In v1** | Relational model, filters, empty states |
| 5 | Draft / published status | **In v1** | Enum field, list defaults, publish UX |

**Rationale for including 4 and 5 in v1:** Both are low-cost in a SQLite schema, map directly to NFR empty states (“missing categories”), and avoid a painful migration later. If session time is tight, implement in this order: 1 → 3 → 2 → 5 → 4.

### 1.3 Explicit assumptions

These fill gaps not specified in the brief:

| ID | Assumption |
|----|------------|
| A1 | **No authentication in v1.** Any local user can read and edit all articles. Matches “basic security assumptions only.” Add session auth later behind an `AUTH_ENABLED` flag. |
| A2 | **Single-tenant, single deployment.** One team, one database file. |
| A3 | **English-only UI and content indexing** (SQLite FTS5 `unicode61` tokenizer). |
| A4 | **Editor content stored as HTML** from TipTap (not Markdown source of truth). Markdown import/export is out of scope. |
| A5 | **No real-time collaborative editing.** Last-write-wins with `updatedAt` optimistic concurrency. |
| A6 | **Seed data** ships with 8–12 sample articles so empty-state and search paths are testable immediately. |
| A7 | **Package manager:** npm (ships with Node; lowest friction). |
| A8 | **Runtime:** Node.js **24.x Active LTS** (verified 2026-07-10: v24.18.0). |

---

## 2. Technology stack (pinned versions)

Versions verified via npm / official release channels on **2026-07-10**. Pin with `^` in `package.json` unless noted.

| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Runtime | Node.js | **24.x LTS** (≥ 24.18.0) | Active LTS; Playwright + Next support |
| Language | TypeScript | **7.0.2** | Latest stable on npm |
| Framework | Next.js (App Router) | **16.2.10** | Full-stack React, SSR, Route Handlers, Server Actions |
| UI library | React / React DOM | **19.2.7** | Required peer of Next 16 |
| Styling | Tailwind CSS | **4.3.2** | Utility-first; calm dense UI without CSS-in-JS |
| Tailwind PostCSS | `@tailwindcss/postcss` | **4.3.2** | Official PostCSS integration for Next |
| ORM | Prisma | **7.8.0** | Typed schema, migrations, SQLite + later Postgres |
| Prisma client | `@prisma/client` | **7.8.0** | Same major as CLI |
| SQLite adapter | `@prisma/adapter-better-sqlite3` | **7.8.0** | Required driver adapter in Prisma 7 |
| SQLite driver | `better-sqlite3` | **12.11.1** | Sync, fast, local-first |
| Validation | Zod | **4.4.3** | Shared client/server schemas |
| Rich text | `@tiptap/react` + starter-kit | **3.27.3** | Maintained WYSIWYG; simple toolbar |
| Icons | `lucide-react` | **1.24.0** | Lightweight, consistent icons |
| Unit tests | Vitest | **4.1.10** | Fast, Vite-aligned, works with Next TS |
| E2E tests | Playwright (`@playwright/test`) | **1.61.1** | Brief-aligned; Chromium for CI |
| Types | `@types/node` | **24.x** or **26.1.1** | Match Node 24; latest 26.x typings acceptable |
| Env loading | `dotenv` | **latest stable** | Prisma scripts / seed |

### 2.1 Rejected alternatives

| Option | Rejected because |
|--------|------------------|
| Separate Express/FastAPI API | Extra process and CORS for no benefit at this size |
| PostgreSQL in v1 | Heavier local setup; SQLite meets 100 concurrent users for this workload |
| MongoDB | Weak fit for relational tags/categories and FTS |
| Markdown-only editor | TipTap HTML gives preview-in-place without dual-pane complexity |
| Auth0 / NextAuth | Explicitly out of scope for v1 |
| Redux / Zustand global store | Server Components + URL state + form state suffice |
| Turborepo monorepo | Single app; monorepo tooling adds cost without multi-package need |

---

## 3. System overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (desktop / tablet)                                 │
│  React 19 + Tailwind 4 + TipTap (client islands)            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (same origin)
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js 16 App Router (Node 24)                            │
│  ├── Server Components (list, detail, search SSR)           │
│  ├── Client Components (editor, search input, filters)      │
│  ├── Server Actions (create / update / delete)              │
│  └── Route Handlers (JSON search API for typeahead)         │
│              │                                              │
│              ▼                                              │
│  Prisma Client 7 + better-sqlite3 adapter                   │
│              │                                              │
│              ▼                                              │
│  SQLite file: prisma/dev.db                                 │
│  ├── articles, categories, tags, article_tags               │
│  └── articles_fts (FTS5 virtual table)                      │
└─────────────────────────────────────────────────────────────┘
```

**Single deployable unit:** one Next.js app. No Redis, no message queue, no separate API service.

---

## 4. Front-end architecture

### 4.1 Rendering model

| Page / surface | Strategy | Rationale |
|----------------|----------|-----------|
| `/` article list | Server Component + `searchParams` | SEO-ready internal links; fast first paint |
| `/articles/[slug]` detail | Server Component | Readable content SSR; no client fetch waterfalls |
| `/articles/new`, `/articles/[slug]/edit` | Client island for TipTap; server action for save | Editor must be client-only |
| Global search box | Client Component; debounced fetch to `/api/search` | Instant feedback without full navigation |
| Search results page `/search?q=` | Server Component | Shareable URLs; works without JS |

### 4.2 App Router structure

```
src/app/
  layout.tsx                 # Shell: header, search, nav
  page.tsx                   # Home = article list (published by default)
  search/page.tsx            # Full search results
  articles/
    new/page.tsx             # Create form
    [slug]/
      page.tsx               # Detail
      edit/page.tsx          # Edit form
  api/
    search/route.ts          # GET ?q=&limit= JSON typeahead
  globals.css                # Tailwind v4 entry (@import "tailwindcss")
```

### 4.3 Component inventory

```
src/components/
  layout/
    AppHeader.tsx            # Logo, primary nav, SearchBox
    AppShell.tsx             # Max-width container, sidebar optional
  articles/
    ArticleList.tsx          # List of ArticleListItem
    ArticleListItem.tsx      # Title, excerpt, category, status badge, updated
    ArticleDetail.tsx        # Title, meta, HTML body (prose)
    ArticleForm.tsx          # Shared create/edit: title, slug, category, tags, status, body
    EmptyState.tsx           # No articles / no results / no categories
    StatusBadge.tsx          # draft | published
  search/
    SearchBox.tsx            # Debounced input + dropdown
    SearchResults.tsx        # Result rows with title + snippet
  editor/
    RichTextEditor.tsx       # TipTap wrapper + toolbar
    EditorToolbar.tsx        # Bold, italic, H2, lists, link, code
  ui/
    Button.tsx, Input.tsx, Textarea.tsx, Select.tsx, Badge.tsx, Label.tsx
```

**Convention:** Presentational components receive data as props. Data fetching lives in Server Components or Server Actions, not in `useEffect` for primary page data.

### 4.4 Styling system

- **Tailwind CSS 4.3.2** via `@import "tailwindcss"` in `globals.css` and `@tailwindcss/postcss`.
- **Typography:** native CSS or a minimal `.prose` class set for article body (no `@tailwindcss/typography` required if a small custom prose block is defined — either is fine; prefer a **small custom prose block** in `globals.css` to avoid an extra dependency).
- **Layout:** max content width `max-w-5xl` for list/detail; editor `max-w-3xl` for readable line length.
- **Breakpoints:** mobile-first; primary targets **desktop and tablet** (brief). Stack filters below `md`.
- **Color:** neutral zinc/slate palette; one accent (e.g. sky or indigo) for links and primary buttons. WCAG AA contrast for body text.
- **Motion:** none beyond `transition-colors` on interactive elements.

### 4.5 Client state

| Concern | Approach |
|---------|----------|
| Search query | URL `?q=` + controlled input |
| Filters (category, status, tag) | URL `searchParams` |
| Editor document | TipTap internal state; form submits serialized HTML |
| Form validation errors | Zod result mapped to field errors (server action return) |
| Toast / save feedback | Local React state or simple inline success banner |

No global client store in v1.

### 4.6 Accessibility (v1 baseline)

- Semantic landmarks: `header`, `main`, `nav`
- Form labels associated with controls
- Focus-visible rings on interactive elements
- Status badges not color-only (include text)
- Skip to content link in layout  
**Not MVP:** full a11y audit suite (per brief).

---

## 5. Back-end architecture

### 5.1 Application style

**Next.js full-stack monolith:**

- **Reads:** Server Components call `src/lib/db.ts` (Prisma) directly.
- **Writes:** Server Actions in `src/lib/actions/articles.ts` (and related).
- **JSON API:** only where the client needs progressive enhancement without navigation — primarily search typeahead.

### 5.2 Server Actions (mutations)

All mutations use `"use server"` modules. Example surface:

| Action | Input | Behavior |
|--------|-------|----------|
| `createArticle` | `CreateArticleInput` | Validate → insert → sync FTS → revalidate → redirect to detail |
| `updateArticle` | `id` + `UpdateArticleInput` + `expectedUpdatedAt` | Validate → optimistic concurrency check → update → sync FTS → revalidate |
| `deleteArticle` | `id` | Delete article (cascade tags) → remove FTS row → revalidate |
| `createCategory` | `{ name, slug }` | Validate unique slug → insert |
| `createTag` | `{ name, slug }` | Validate unique slug → insert |

**Concurrency:** `updateArticle` requires `expectedUpdatedAt` (ISO string from form load). If DB `updatedAt` differs, return `{ error: "CONFLICT", message: "..." }` and keep the user on the edit page with a reload prompt. Last-write-wins only when the client confirms overwrite (optional v1.1; v1 can hard-fail on conflict).

### 5.3 Route Handlers

#### `GET /api/search`

```http
GET /api/search?q=onboarding&limit=8
```

**Success `200`:**

```json
{
  "query": "onboarding",
  "results": [
    {
      "id": "clx...",
      "slug": "new-hire-onboarding",
      "title": "New Hire Onboarding",
      "excerpt": "...getting started checklist...",
      "status": "PUBLISHED",
      "category": { "name": "HR", "slug": "hr" }
    }
  ]
}
```

**Rules:**

- `q` min length 1 after trim; empty → `{ results: [] }`
- Default `limit=10`, max `20`
- Search **published** articles only for typeahead (edit screens can use full list SSR)
- Rank by FTS5 `bm25` (lower is better)

#### Intentionally no REST CRUD API in v1

CRUD goes through Server Actions to keep one validation path and automatic revalidation. If a future mobile client appears, extract the same service functions into Route Handlers.

### 5.4 Service layer

```
src/lib/
  db.ts                      # Prisma singleton + adapter
  fts.ts                     # ensureFtsSchema, syncArticleToFts, searchArticles
  validation/
    article.ts               # Zod schemas
    category.ts
    tag.ts
  actions/
    articles.ts
    categories.ts
    tags.ts
  queries/
    articles.ts              # listArticles, getArticleBySlug, etc.
  utils/
    slugify.ts
    excerpt.ts               # strip HTML → plain text excerpt
    revalidate.ts            # path helpers
```

**Rule:** Server Components and Server Actions call `queries/*` and `actions/*` only — never raw Prisma in page files except trivial one-liners during spike (prefer queries module always).

### 5.5 Revalidation

After create/update/delete:

```ts
revalidatePath("/");
revalidatePath("/search");
revalidatePath(`/articles/${slug}`);
revalidatePath(`/articles/${slug}/edit`);
```

If slug changes on update, revalidate both old and new slug paths.

---

## 6. Data model and persistence

### 6.1 Database

- **Engine:** SQLite 3 via `better-sqlite3` **12.11.1**
- **File path:** `prisma/dev.db` (gitignored); test DB `prisma/test.db`
- **ORM:** Prisma **7.8.0** with `@prisma/adapter-better-sqlite3`
- **Migrations:** Prisma Migrate (`prisma migrate dev`)
- **FTS:** managed outside Prisma schema via raw SQL migration / bootstrap SQL (see §6.4)

### 6.2 Prisma schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  articles  Article[]
}

model Tag {
  id        String       @id @default(cuid())
  name      String
  slug      String       @unique
  createdAt DateTime     @default(now())
  articles  ArticleTag[]
}

model Article {
  id          String        @id @default(cuid())
  title       String
  slug        String        @unique
  contentHtml String        // TipTap HTML
  excerpt     String        // denormalized plain text, max ~240 chars
  status      ArticleStatus @default(DRAFT)
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tags        ArticleTag[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([status, updatedAt])
  @@index([categoryId])
}

model ArticleTag {
  articleId String
  tagId     String
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([articleId, tagId])
  @@index([tagId])
}
```

### 6.3 Field dictionary

| Entity | Field | Type | Constraints / notes |
|--------|-------|------|---------------------|
| Article | `id` | string (cuid) | PK |
| Article | `title` | string | 1–200 chars |
| Article | `slug` | string | 1–120 chars; `^[a-z0-9]+(?:-[a-z0-9]+)*$`; unique |
| Article | `contentHtml` | string | sanitized subset of HTML (see §9.3) |
| Article | `excerpt` | string | auto from plain text of body; max 240 |
| Article | `status` | enum | `DRAFT` \| `PUBLISHED` |
| Article | `categoryId` | string? | optional FK |
| Article | `createdAt` / `updatedAt` | DateTime | Prisma managed |
| Category | `name` | string | 1–80 chars |
| Category | `slug` | string | unique, same slug rules |
| Tag | `name` | string | 1–40 chars |
| Tag | `slug` | string | unique |
| ArticleTag | `(articleId, tagId)` | composite PK | many-to-many |

### 6.4 Full-text search (FTS5)

Prisma does not model FTS5 virtual tables. Manage via SQL:

```sql
-- prisma/sql/fts_init.sql (run from seed / migrate script)

CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  article_id UNINDEXED,
  title,
  content,
  tokenize = 'unicode61'
);

-- Keep FTS in sync from application code after CUD:
-- DELETE FROM articles_fts WHERE article_id = ?;
-- INSERT INTO articles_fts(article_id, title, content) VALUES (?, ?, ?);
```

**Plain-text extraction for FTS `content`:** strip tags from `contentHtml` (use a small `stripHtml` util — regex strip is acceptable for v1 trusted HTML; prefer `node-html-parser` only if needed).

**Search query:**

```sql
SELECT a.id, a.slug, a.title, a.excerpt, a.status, a.categoryId,
       snippet(articles_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet,
       bm25(articles_fts) AS rank
FROM articles_fts
JOIN Article AS a ON a.id = articles_fts.article_id
WHERE articles_fts MATCH ?
  AND a.status = 'PUBLISHED'   -- omit filter when searching in admin list if desired
ORDER BY rank
LIMIT ?;
```

**Query escaping:** wrap user tokens; escape FTS special characters (`"`, `*`, etc.) in `src/lib/fts.ts` via a dedicated `toFtsQuery(raw: string): string` that:

1. Trims and lowercases
2. Splits on whitespace
3. Strips characters outside `[a-z0-9_-]`
4. Joins tokens with ` AND ` and suffix `*` for prefix match (`onboard*` → onboarding)

If no tokens remain, return empty results.

### 6.5 Prisma client singleton

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 6.6 Environment

```bash
# .env
DATABASE_URL="file:./prisma/dev.db"
```

```bash
# .env.test
DATABASE_URL="file:./prisma/test.db"
```

### 6.7 Migration example

```bash
npx prisma migrate dev --name init_articles
```

Generated migration will create `Category`, `Tag`, `Article`, `ArticleTag`. Then run FTS bootstrap:

```ts
// prisma/seed.ts (excerpt)
await prisma.$executeRawUnsafe(`
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    article_id UNINDEXED,
    title,
    content,
    tokenize = 'unicode61'
  );
`);
// insert seed categories, tags, articles; call syncArticleToFts for each
```

### 6.8 Scaling path (not v1)

| When | Change |
|------|--------|
| Multi-instance deploy | Move to PostgreSQL; Prisma datasource `postgresql`; replace FTS5 with Postgres `tsvector` or Meilisearch |
| >10k articles / heavy search | External search (Meilisearch/Typesense) |
| Auth required | Add Auth.js (Auth.js v5) with credentials or OIDC |

Schema stays relational; only the driver and search backend change.

---

## 7. Feature-specific architecture

### 7.1 Article browsing and detail

**Approach**

- Home `page.tsx` loads articles via `listArticles({ status, categorySlug, tagSlug, page, pageSize })`.
- Default filter: `status=PUBLISHED` for the public-facing list; toggle “Show drafts” via `?status=all` or `?status=DRAFT` for content owners (no auth gate in v1 — anyone can toggle).
- Pagination: offset/limit, `pageSize=20`.
- Detail by **slug** (`/articles/[slug]`), not id (readable URLs).
- 404 via `notFound()` if missing.

**Technical choices**

- SSR with `export const dynamic = "force-dynamic"` **or** time-based revalidation — prefer **on-demand revalidation** after mutations (default dynamic for simplicity with SQLite writes).
- Excerpt shown on cards; full `contentHtml` only on detail (`dangerouslySetInnerHTML` only after sanitization — §9.3).

**Constraints / tradeoffs**

- Listing all statuses on one page without auth is acceptable for internal v1; document the risk.
- No infinite scroll — simpler pagination or “Load more” button using URL page param.

### 7.2 Search

**Approach**

1. **Typeahead:** `SearchBox` debounces 250ms → `GET /api/search?q=`
2. **Full results:** navigate to `/search?q=` (Enter key or “View all”)
3. Backend uses SQLite FTS5 over title + plain content

**Technical choices**

- FTS5 over `LIKE %q%` for ranking and performance with growth
- Snippets via FTS `snippet()` for result context
- Title-only fallback: if FTS returns empty, optional secondary `title LIKE` is **not** required if token prefix `*` is used correctly

**Constraints / tradeoffs**

- FTS virtual table is outside Prisma migrations’ mental model — document bootstrap in README and seed
- Multi-language stemming not supported — acceptable per A3
- SQLite FTS is process-local; fine for single Node instance

**Libraries**

- No external search service
- `src/lib/fts.ts` owns all raw SQL

### 7.3 Editing (create / update)

**Approach**

- TipTap **3.27.3** with `@tiptap/starter-kit` (+ Link extension)
- Store **HTML** in `contentHtml`
- Shared `ArticleForm` for create and edit
- Server Action validates with Zod; returns field errors or redirects

**Toolbar (v1 minimum)**

- Bold, italic, strike  
- Heading 2, heading 3  
- Bullet list, ordered list  
- Link  
- Code block  
- Undo / redo (starter-kit)

**Validation (Zod 4.4.3)**

```ts
// src/lib/validation/article.ts
import { z } from "zod";

export const articleStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const articleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  contentHtml: z.string().min(1, "Content is required").max(200_000),
  status: articleStatusSchema,
  categoryId: z.string().cuid().nullable().optional(),
  tagIds: z.array(z.string().cuid()).max(20).default([]),
  expectedUpdatedAt: z.string().datetime().optional(), // edit only
});

export type ArticleFormInput = z.infer<typeof articleFormSchema>;
```

**Slug UX**

- Auto-generate from title on create (`slugify`) until user edits slug field
- On edit, slug is editable; enforce uniqueness

**Constraints / tradeoffs**

- HTML storage couples display to TipTap schema; switching to Markdown later needs a converter
- No autosave in v1 — explicit Save button
- Optimistic concurrency via `expectedUpdatedAt` prevents silent overwrites

**Supporting packages**

```
@tiptap/react@3.27.3
@tiptap/starter-kit@3.27.3
@tiptap/extension-link@3.27.3
@tiptap/pm@3.27.3
```

### 7.4 Categories and tags

**Approach**

- Categories: single optional FK on article (mutually exclusive primary grouping)
- Tags: many-to-many via `ArticleTag`
- Filter chips on home: category list + popular tags
- Manage categories/tags: minimal — create-on-the-fly from ArticleForm (combobox) **or** seed-only + select existing in v1

**v1 decision:** **Seed categories/tags; allow selecting existing on the form.** Inline create of category/tag can be a small Server Action if time permits (`createCategory`, `createTag`). No separate admin CRUD pages in v1 (keeps scope finishable).

**Empty states**

- No categories in DB → show “No categories yet” in filter rail with hint to seed or create
- Article with null category → display “Uncategorized”

### 7.5 Draft / published status

**Approach**

- Enum on `Article`
- List default: published only
- Detail page: drafts still reachable by direct URL (internal app); show `Draft` badge
- Form: radio or select for status; “Publish” sets `PUBLISHED` and saves

**Search:** typeahead and default `/search` only return `PUBLISHED` so drafts do not pollute team search. Optional `?includeDrafts=1` for owners later.

---

## 8. Front-end / back-end integration

### 8.1 Data flow examples

**Browse**

```
Browser → GET / → Server Component listArticles() → Prisma → HTML
```

**Search typeahead**

```
SearchBox → GET /api/search?q=foo → fts.search() → JSON → dropdown
```

**Edit save**

```
ArticleForm → server action updateArticle(formData)
           → Zod parse → concurrency check → Prisma + FTS sync
           → revalidatePath → redirect /articles/[slug]
```

### 8.2 Error contract (Server Actions)

```ts
type ActionResult<T = void> =
  | { ok: true; data?: T }
  | {
      ok: false;
      code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "UNIQUE" | "INTERNAL";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
```

Client forms branch on `ok` and map `fieldErrors` to inputs.

### 8.3 API contract summary

| Endpoint / action | Method | Auth | Notes |
|-------------------|--------|------|-------|
| `listArticles` (RSC) | server | none | Filters via searchParams |
| `getArticleBySlug` (RSC) | server | none | 404 if missing |
| `createArticle` | Server Action | none | Redirect on success |
| `updateArticle` | Server Action | none | Conflict detection |
| `deleteArticle` | Server Action | none | Confirm dialog client-side |
| `GET /api/search` | GET | none | JSON typeahead |

### 8.4 Content sanitization

Before persist **and** before render:

- Allowlist tags: `p, h2, h3, strong, em, s, ul, ol, li, a, code, pre, blockquote, br`
- Allowlist attrs: `href` on `a` (http/https/mailto only), `class` optional
- Implementation: small allowlist sanitizer in `src/lib/utils/sanitize.ts` (implement with DOMPurify **isomorphic** package **only if** needed; prefer a minimal allowlist using `node-html-parser` or a well-maintained isomorphic sanitizer)

**v1 pick:** `isomorphic-dompurify` latest stable (add at implement time; verify npm version during install). Sanitize on write so stored HTML is safe.

---

## 9. Non-functional architecture

### 9.1 Performance

| Target | Approach |
|--------|----------|
| List page TTFB | Indexed queries; limit 20; no N+1 (include category + tags in Prisma `include`) |
| Search | FTS5; debounce 250ms; limit 10–20 |
| Editor | Dynamic `import()` TipTap so list/detail bundles stay small |
| Concurrent users ~100 | Node 24 + SQLite single writer; reads dominate; WAL mode |

Enable SQLite WAL in bootstrap:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

### 9.2 Security (basic)

- No auth (A1) — bind to localhost in dev; do not expose publicly without auth
- Zod validation on all writes
- HTML sanitization on write
- Server Actions CSRF protection (Next.js built-in)
- Parameterized SQL for FTS (`$queryRaw` with bound params where possible; FTS query string built only from sanitized tokens)
- No file uploads in v1

### 9.3 Reliability

- Prisma migrations for schema
- Seed script for reproducible local state
- Optimistic concurrency on edit
- Graceful empty states (no results, no articles, no categories)

### 9.4 Observability

- v1: `console.error` in action catch blocks; Next.js error.tsx boundary for uncaught UI errors
- Optional: simple `src/lib/logger.ts` wrapping console with levels

### 9.5 Accessibility & responsive

- Responsive grid: list single column on small screens; optional two-column (filters | list) from `md`
- Touch-friendly controls ≥ 40px height for primary actions
- Full a11y audits deferred (brief)

---

## 10. Repository structure

```
.
├── docs/
│   ├── product-brief.md
│   └── architecture.md          # this file
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   ├── sql/
│   │   └── fts_init.sql
│   ├── dev.db                   # gitignored
│   └── test.db                  # gitignored
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── search/page.tsx
│   │   ├── articles/
│   │   │   ├── new/page.tsx
│   │   │   └── [slug]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── api/search/route.ts
│   ├── components/              # see §4.3
│   └── lib/                     # see §5.4
├── e2e/
│   ├── smoke.spec.ts
│   └── article-journey.spec.ts
├── tests/
│   ├── unit/
│   │   ├── slugify.test.ts
│   │   ├── fts-query.test.ts
│   │   ├── excerpt.test.ts
│   │   └── article-schema.test.ts
│   └── setup.ts
├── playwright.config.ts
├── vitest.config.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### 10.1 Key `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

Configure Prisma seed in `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Dev dependency: `tsx` (latest stable) for running seed TypeScript.

---

## 11. Testing strategy

### 11.1 Unit tests (Vitest 4.1.10)

| Area | Examples |
|------|----------|
| `slugify` | spaces, unicode strip, collapse hyphens |
| `toFtsQuery` | empty, special chars, multi-token prefix |
| `excerpt` / `stripHtml` | tags removed, length cap |
| Zod `articleFormSchema` | missing title, bad slug, max lengths |
| (optional) pure mappers | DTO shaping |

**Config:** `vitest.config.ts` with `environment: "node"`, path alias `@/*` → `src/*`.

**Not unit-tested in MVP:** TipTap React components, full Prisma integration (covered lightly in E2E).

### 11.2 E2E tests (Playwright 1.61.1)

**Critical journey (MVP):** browse → search → edit

```ts
// e2e/article-journey.spec.ts (outline)
// 1. Open home — expect article list or empty state
// 2. Click first article — expect title + body
// 3. Use search box — type known seed term — expect result
// 4. Open edit — change title — save — expect updated title on detail
// 5. Create new article draft — appear when filter includes drafts
```

**Playwright config essentials:**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared SQLite file
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "file:./prisma/test.db",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

**E2E data:** before suite, run migrations + seed against `prisma/test.db`. Document as `npm run db:reset` with test env or a `pretest:e2e` script.

### 11.3 What is not MVP

- Full accessibility audits
- Exhaustive E2E edge cases
- Visual regression
- Load testing for 100 users (manual reasoning + WAL is enough for v1)

---

## 12. Local development and run instructions

### 12.1 Prerequisites

- Node.js **24.x** (Active LTS)
- npm **10+**
- macOS / Linux / WSL (better-sqlite3 native build tools: Xcode CLT on macOS)

### 12.2 First-time setup

```bash
# 1. Clone and enter repo
cd <repo>

# 2. Install deps
npm install

# 3. Env
cp .env.example .env
# DATABASE_URL="file:./prisma/dev.db"

# 4. Migrate + seed (FTS init included in seed)
npx prisma migrate dev
npm run db:seed

# 5. Dev server
npm run dev
# → http://localhost:3000
```

### 12.3 Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next dev server |
| `npm run build && npm start` | Production mode locally |
| `npm run db:studio` | Browse SQLite data |
| `npm run db:reset` | Wipe + migrate + seed |
| `npm test` | Vitest unit tests |
| `npx playwright install` | One-time browser binaries |
| `npm run test:e2e` | Playwright E2E |

### 12.4 `.env.example`

```bash
DATABASE_URL="file:./prisma/dev.db"
```

### 12.5 Troubleshooting

| Issue | Fix |
|-------|-----|
| `better-sqlite3` build fails | Ensure Node 24; reinstall build tools; `npm rebuild better-sqlite3` |
| FTS errors “no such table” | Re-run `npm run db:seed` or FTS init SQL |
| Port 3000 in use | `next dev -p 3001` |
| Stale Prisma client | `npx prisma generate` |

---

## 13. Seed data requirements

Seed must create:

- **≥ 3 categories** (e.g. Engineering, Product, HR)
- **≥ 5 tags** (e.g. onboarding, runbook, rfc, faq, process)
- **8–12 articles** mix of DRAFT and PUBLISHED
- At least one article whose title/body contains distinctive terms for search tests (`onboarding`, `deploy`, `vacation`)
- All published articles indexed in `articles_fts`

---

## 14. Implementation order (for the implementing developer)

1. Scaffold Next.js 16 + Tailwind 4 + TypeScript  
2. Prisma schema + migrate + seed + FTS bootstrap  
3. Queries: list + detail  
4. UI: shell, list, detail, empty states  
5. Article form + TipTap + create/update actions + validation  
6. Status + category/tag fields on form and filters  
7. FTS search API + SearchBox + `/search` page  
8. Sanitize HTML; conflict check on update  
9. Vitest unit tests for pure utils + Zod  
10. Playwright critical journey  
11. README polish  

---

## 15. Decisions log

| ID | Decision | Alternatives considered | Tradeoff |
|----|----------|-------------------------|----------|
| D1 | Next.js 16 App Router monolith | Vite SPA + separate API; Remix | One process, SSR, Server Actions; less flexible multi-client API |
| D2 | SQLite + Prisma 7 + better-sqlite3 | Postgres from day one; Drizzle | Fastest local DX; single-writer limits; easy migrate path to Postgres |
| D3 | FTS5 for search | `LIKE`; Meilisearch | Zero extra services; FTS setup slightly manual outside Prisma |
| D4 | TipTap HTML editor | Markdown textarea + preview; Lexical | Better default UX; HTML as source of truth |
| D5 | No auth in v1 | Auth.js / basic password | Matches brief; must not expose publicly |
| D6 | Categories + tags + status in v1 schema | Defer features 4–5 | Small schema cost; avoids migration churn; may slip UI if time-boxed |
| D7 | Server Actions for writes | REST Route Handlers only | Less boilerplate; couples to Next; extract services if API needed later |
| D8 | Vitest + Playwright | Jest + Cypress | Faster unit DX; Playwright is brief-aligned and modern |
| D9 | npm only | pnpm / yarn | Lowest friction for evaluators and clean installs |
| D10 | Optimistic concurrency via `updatedAt` | Blind last-write-wins; CRDT | Prevents silent clobber; no collab complexity |
| D11 | URL `searchParams` for filters | Client-only state | Shareable links; SSR-friendly |
| D12 | Sanitize on write | Sanitize on read only | Safer DB contents; must keep sanitizer in sync with TipTap schema |

---

## 16. Out of scope (explicit)

- Authentication / authorization / multi-tenancy  
- Real-time collaborative editing  
- File / image uploads  
- Comments, version history, audit log  
- Multi-language i18n  
- Production deployment manifests (Docker optional stretch)  
- Full accessibility audit automation  
- GraphQL  

---

## 17. Success criteria for “architecture complete”

A developer can:

1. Create the repo layout above and install pinned dependencies  
2. Run migrations + seed and open a working list/detail UI  
3. Implement search and edit without choosing a different stack  
4. Add unit + E2E tests per §11  
5. Explain every major tradeoff from §15  

This document is the binding technical source of truth for v1 implementation alongside [`product-brief.md`](./product-brief.md).

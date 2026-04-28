# Technical Architecture Spec: Simplified Knowledge Base App

## 1. Overview

This document defines the complete technical architecture for a small-team internal knowledge-base application. It covers v1 features (article browsing, full-text search, basic editing) and forward-models v2 features (categories/tags, article status) so that the schema and APIs can grow without breaking changes.

### Source of truth
- Product brief: `docs/product-brief.md`

---

## 2. Technology Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Runtime | Node.js | **22.14.0 LTS** (Jod) | Active LTS, good ESM/TypeScript support, widely supported by tooling |
| Front-end framework | React | **19.1.0** | Latest stable; strong ecosystem, SSR-friendly if we later adopt a meta-framework |
| Front-end build | Vite | **6.3.0** | Fast HMR, native ESM, excellent DX, used by React Router v7 scaffolding |
| Router | React Router | **7.14.2** | Declarative routing, data APIs, stable v7 with Vite integration |
| Styling | Tailwind CSS | **4.2.4** | Utility-first, responsive by default, low-friction theming |
| Back-end framework | Express | **5.2.1** | Mature, minimal, excellent middleware ecosystem, easy to containerize later |
| Language | TypeScript | **5.8.3** | Stable release matching Node 22; stricter checks than 5.7, less churn than 6.0 beta |
| ORM / Migrations | Prisma | **7.8.0** | Latest stable; schema-first, type-safe client, handles SQLite and PostgreSQL |
| Validation | Zod | **3.25.0** (latest 3.x) | TypeScript-first schema validation, tiny footprint, works on client and server |
| Markdown rendering | react-markdown | **10.1.0** | Secure by default, pluggable, supports remark plugins for syntax highlighting |
| Unit testing | Vitest | **3.2.0** | Vite-native, fast watch mode, Jest-compatible API, ESM-first |
| E2E testing | Playwright | **1.52.0** | Auto-wait, resilient locators, cross-browser, trace viewer, designed for CI |
| Database (local) | SQLite | **3.46+** | Zero-config local dev, file-based, Prisma supports it natively |
| Database (future prod) | PostgreSQL | **16.x** | Prisma schema is compatible; switchable via `DATABASE_URL` |

---

## 3. Front-end Architecture

### 3.1 Build & Development
- **Vite** is the build tool and dev server.
- Entry point: `src/main.tsx`
- `vite.config.ts` configures the React plugin, Tailwind CSS Vite plugin, and path aliases (`@/` → `src/`).
- Development server runs on `http://localhost:5173`.
- Production build emits static assets to `dist/`.

### 3.2 Routing
- **React Router v7** in SPA mode.
- Routes:
  - `/` — Article list (search + browse)
  - `/articles/:slug` — Article detail
  - `/articles/:slug/edit` — Article editor
  - `/articles/new` — Create new article
- Route loaders and actions (where appropriate) fetch/mutate data via a thin API client.

### 3.3 Component & State Model
- **Local component state** via `useState`/`useReducer` for UI concerns (modals, form drafts).
- **Server state** fetched via a lightweight `fetch` wrapper in route loaders; no heavy client-side cache library is required for v1 because article sets are small and writes are simple.
- If server-state complexity grows later, introduce **TanStack Query** (currently out of scope).

### 3.4 Styling
- **Tailwind CSS v4** using the `@tailwindcss/vite` plugin.
- No custom CSS file unless absolutely necessary; rely on Tailwind utilities and a small `theme` extension in `vite.config.ts` (or `tailwind.config.ts` if v4 plugin requires it).
- Responsive breakpoints:
  - `sm` (640px) — mobile landscape
  - `md` (768px) — tablet
  - `lg` (1024px) — desktop

### 3.5 Editor Experience
- A split-pane Markdown editor:
  - Left pane: `<textarea>` with basic Tailwind styling.
  - Right pane: live preview rendered with `react-markdown` + `remark-gfm`.
- No WYSIWYG library; Markdown keeps the implementation simple, portable, and version-control-friendly.
- Autosave draft to `localStorage` on the edit page so accidental refreshes do not lose work.

### 3.6 Accessibility
- Use semantic HTML (`<main>`, `<article>`, `<nav>`, `<search>`).
- All interactive elements have visible focus rings (`focus:outline focus:outline-2 focus:outline-offset-2`).
- Form inputs have associated `<label>` elements.
- Color contrast meets WCAG 2.1 AA minimums (verified via Tailwind default palette or manual checks).

---

## 4. Back-end Architecture

### 4.1 Server Structure
- **Express 5.2.1** application in `server/`.
- Entry point: `server/index.ts`
- Runs on `http://localhost:3001`.
- Organized by domain:
  - `server/routes/` — route handlers
  - `server/services/` — business logic / data access (thin wrappers around Prisma)
  - `server/middleware/` — error handling, request validation, logging
  - `server/lib/` — shared utilities (e.g., slug generation)

### 4.2 Middleware Stack
1. `express.json()` — parse JSON bodies
2. `cors` — allow `localhost:5173` in development (restrict to origin in production)
3. Request logging (`morgan` or tiny custom logger)
4. Route mounting (`/api/articles`, `/api/search`, `/api/categories`)
5. Global error handler — catches Zod validation errors and Prisma exceptions, returns structured JSON errors

### 4.3 API Design
RESTful JSON API with these conventions:
- `GET /api/articles?search=&category=` — list articles (supports search query param)
- `GET /api/articles/:slug` — get single article
- `POST /api/articles` — create article
- `PUT /api/articles/:slug` — update article
- `DELETE /api/articles/:slug` — delete article (soft-delete not required in v1)
- `GET /api/search?q=` — dedicated search endpoint (returns same shape as article list)
- `GET /api/categories` — list categories (preparation for v2)

All request bodies for `POST`/`PUT` are validated with Zod before reaching service logic.
All responses use a consistent envelope:
```json
{ "data": { ... }, "error": null }
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### 4.4 Search Implementation
- **SQLite FTS5** virtual table for full-text search.
- Prisma does not natively manage FTS5 tables, so they are created via a raw SQL migration (`prisma/migrations/...`) and kept in sync via Prisma middleware or explicit service-layer updates.
- When an article is created/updated/deleted, the service layer updates the corresponding row in the FTS5 virtual table.
- Search endpoint queries the FTS5 table with `MATCH` and joins back to the Article table for metadata.
- **Tradeoff**: FTS5 is SQLite-only. If we migrate to PostgreSQL later, we replace the raw FTS5 queries with Prisma’s `search` (if using Prisma Postgres) or raw `to_tsvector`/`to_tsquery`. The API contract remains identical.

---

## 5. Data Model & Persistence Strategy

### 5.1 Database
- **Local development**: SQLite file (`prisma/dev.db`).
- **Future production**: PostgreSQL (same Prisma schema, different connection string).

### 5.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Article {
  id          Int      @id @default(autoincrement())
  slug        String   @unique
  title       String
  content     String
  excerpt     String   @default("")
  status      ArticleStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  categoryId  Int?
  category    Category? @relation(fields: [categoryId], references: [id])
  tags        Tag[]
}

model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String   @default("")
  articles    Article[]
}

model Tag {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  articles Article[]
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

**Schema rationale**:
- `Category` and `Tag` are included now (v1) so that v2 features do not require a migration, but the UI for managing them can be deferred.
- `slug` is the external identifier for URLs; it is derived from the title on creation and is immutable after publish (or editable with collision checks).
- `excerpt` is auto-generated from the first 160 characters of content if not provided.
- `status` supports the v2 status workflow but defaults to `DRAFT` so that v1 behavior (all articles visible) can be implemented by simply not filtering on status yet.

### 5.3 FTS5 Virtual Table (Raw SQL)

```sql
-- Run inside a Prisma migration or a dedicated `fts-setup.sql` script
CREATE VIRTUAL TABLE ArticleFts USING fts5(
  title,
  content,
  content_rowid=rowid,
  content=Article
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER article_fts_insert AFTER INSERT ON Article BEGIN
  INSERT INTO ArticleFts(rowid, title, content)
  VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER article_fts_update AFTER UPDATE ON Article BEGIN
  UPDATE ArticleFts SET title = new.title, content = new.content
  WHERE rowid = new.id;
END;

CREATE TRIGGER article_fts_delete AFTER DELETE ON Article BEGIN
  INSERT INTO ArticleFts(ArticleFts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;
```

### 5.4 Environment Configuration
- `.env` file in repo root:
```
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
CORS_ORIGIN=http://localhost:5173
```
- `prisma/.env` should **not** be used; keep a single `.env` at repo root.

---

## 6. Feature-specific Architecture Decisions

### 6.1 Article Browsing & Detail
- **Implementation**: List page fetches `/api/articles` and renders cards with title, excerpt, and last-updated timestamp. Detail page fetches `/api/articles/:slug`.
- **Pagination**: Cursor-based or offset-based? **Offset-based** (`?page=&limit=`) for v1 because article volume is small and implementation is trivial. Cursor-based pagination can be added later without breaking the list API if we version endpoints.
- **Empty state**: A dedicated `<EmptyState>` component rendered when the list is empty or search returns no results.

### 6.2 Search
- **Implementation**: Front-end search input debounced at 300 ms. Queries `GET /api/search?q=...`.
- **Back-end**: Queries the `ArticleFts` virtual table, ranks results by BM25, and returns top 50 matches.
- **Tradeoff**: FTS5 is SQLite-specific. The API contract hides this detail, so a future PostgreSQL migration only changes the internal SQL, not the front-end or route handlers.

### 6.3 Editing
- **Implementation**: Split-pane Markdown editor.
- **Validation**: Zod schema on the client for immediate feedback, identical Zod schema on the server for integrity.
- **Conflict handling**: Last-write-wins for v1 (no versioning or optimistic locking). If concurrency becomes an issue later, add an `updatedAt` check or ETag.
- **Autosave**: `localStorage` key `draft:<slug>` (or `draft:new`) stores the textarea value every 2 seconds. On successful save, the draft is cleared.

### 6.4 Categories & Tags (Schema-ready, UI-deferred)
- **Rationale**: Including `Category` and `Tag` in the v1 schema means no migration is needed when the UI ships in v2.
- **Constraints**: Articles can belong to **one** category (simplifies browsing) and **many** tags (enables filtering).
- **API**: `GET /api/categories` already exists. `POST /api/articles` accepts optional `categoryId` and `tagNames` arrays, creating tags on the fly if they do not exist.

### 6.5 Article Status (Schema-ready, UI-deferred)
- **Rationale**: `ArticleStatus` enum is present and defaults to `DRAFT`.
- **v1 behavior**: All articles are visible regardless of status. In v2, the list endpoint will filter to `PUBLISHED` by default and show drafts only in an admin view.
- **Migration cost**: Zero; the field already exists.

---

## 7. Front-end / Back-end Integration

### 7.1 API Client
A thin `fetch` wrapper in `src/lib/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error);
  return json.data;
}
```

### 7.2 Type Sharing
- Prisma generates types into `node_modules/@prisma/client`.
- A shared package (`packages/types`) is **not** used for v1 to avoid monorepo complexity.
- Instead, Zod schemas in `shared/schemas.ts` are imported by both front-end and back-end. TypeScript types are inferred from Zod using `z.infer<typeof ArticleSchema>`.

### 7.3 CORS
- In development, Express allows `localhost:5173`.
- In production, the static `dist/` folder is served by the same Express server (or a reverse proxy), so CORS is unnecessary.

---

## 8. Repository Structure & Developer Workflow

```text
repo-root/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── 20250427_init/
│           └── migration.sql
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── articles.ts
│   │   ├── search.ts
│   │   └── categories.ts
│   ├── services/
│   │   ├── articleService.ts
│   │   └── searchService.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── validate.ts
│   └── lib/
│       └── slugify.ts
├── shared/
│   └── schemas.ts          # Zod schemas shared between client and server
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── Home.tsx
│   │   ├── ArticleDetail.tsx
│   │   └── ArticleEdit.tsx
│   ├── components/
│   │   ├── ArticleCard.tsx
│   │   ├── SearchInput.tsx
│   │   ├── MarkdownEditor.tsx
│   │   └── EmptyState.tsx
│   ├── lib/
│   │   └── api.ts
│   └── styles/
│       └── index.css
├── e2e/
│   └── specs/
│       ├── browse.spec.ts
│       ├── search.spec.ts
│       └── edit.spec.ts
└── docs/
    ├── product-brief.md
    └── architecture.md
```

### 8.1 Developer Workflow
1. Clone repo.
2. `npm install`
3. `cp .env.example .env`
4. `npx prisma migrate dev` — sets up SQLite DB and runs migrations
5. `npm run dev` — starts Vite dev server (`localhost:5173`) and Express API (`localhost:3001`) concurrently via `concurrently`.
6. `npm run test` — runs Vitest unit tests.
7. `npm run test:e2e` — runs Playwright E2E tests (requires `npm run dev` or `npm run build && npm run preview` first).

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)
- **Target coverage**: Core business logic and utilities.
- **What to test**:
  - `slugify.ts` — normalization, collision avoidance logic
  - `articleService.ts` — CRUD operations, excerpt generation, status transitions
  - `searchService.ts` — FTS query construction and result ranking
  - Zod schemas — valid/invalid payload cases
- **What NOT to test**:
  - React components in isolation (defer to E2E for critical UI paths to keep velocity high)
  - Express route wiring (tested implicitly via E2E)

### 9.2 E2E Tests (Playwright)
- **Framework**: Playwright 1.52.0
- **Critical user journeys**:
  1. Browse → view article detail
  2. Search → select result → view article
  3. Create article → fill form → save → verify detail page
  4. Edit article → modify content → save → verify updated content
- **Fixtures**: A seeded database (`prisma/seed.ts`) runs before E2E suite so tests have deterministic data.
- **Configuration**:
  - `playwright.config.ts` uses `baseURL: http://localhost:5173`
  - Run against Chromium, Firefox, and WebKit in CI; local default is Chromium only for speed.
- **Trace & artifacts**: Enabled on first retry. Screenshots on failure.

### 9.3 CI Checklist (future)
- `npm run lint` (ESLint + Prettier)
- `npm run typecheck` (`tsc --noEmit` for both `src/` and `server/`)
- `npm run test:unit`
- `npm run test:e2e`
- `npm run build` (ensures production bundle succeeds)

---

## 10. Local Development & Run Instructions

### Prerequisites
- Node.js **22.14.0 LTS** (recommend using `nvm` or `fnm`)
- npm 10+ (bundled with Node 22)

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env

# 3. Initialize database
npx prisma migrate dev

# 4. Seed sample data (optional)
npx tsx prisma/seed.ts

# 5. Start dev servers (concurrently)
npm run dev
#   Vite:  http://localhost:5173
#   API:   http://localhost:3001

# 6. Run tests
npm run test:unit       # Vitest (watch mode)
npm run test:unit:run   # Vitest (CI mode)
npm run test:e2e        # Playwright
```

### Build for Production

```bash
npm run build        # Vite production build -> dist/
npm run start        # Express serves dist/ + API on PORT (default 3001)
```

---

## 11. Non-functional Architecture Decisions

### 11.1 Performance
- **Database**: SQLite handles thousands of articles easily. FTS5 ensures sub-100ms search queries.
- **Front-end**: Vite code-splitting by route (`React.lazy`). No heavy state library means small bundle.
- **Asset sizing**: Images are not a v1 concern (Markdown-only content).

### 11.2 Scalability Path
- Current target: ~100 concurrent users.
- SQLite is fine for this load on a single Node process. If load grows:
  1. Replace SQLite with PostgreSQL (same Prisma schema, new `DATABASE_URL`).
  2. Add a Redis cache in front of article list endpoints if needed.
  3. Scale horizontally behind a load balancer; stateless Express servers share the PostgreSQL backend.

### 11.3 Security
- **No auth in v1** per product brief. If auth is added later, plug in Passport.js or Lucia with session cookies.
- **Input sanitization**: Zod validates all inbound JSON. `react-markdown` does not render raw HTML by default, preventing XSS in article content.
- **CORS**: Restricted to known origins.
- **Helmet** (optional, recommended): Add `helmet` middleware for security headers in production.

### 11.4 Observability
- Request logging with `morgan` (common format).
- Structured JSON logging can replace `morgan` later using `pino`.
- No external APM in v1; rely on logs and Playwright traces for debugging.

---

## 12. Decisions Log

| Date | Decision | Context | Tradeoff |
|------|----------|---------|----------|
| 2026-04-27 | SQLite + FTS5 for search | Local-first, zero-config dev; Prisma supports it natively | SQLite FTS5 is not portable to PostgreSQL without query changes, but the API contract insulates the front-end |
| 2026-04-27 | Include Category/Tag/Status in v1 schema | Avoids a breaking migration when v2 features ship | Schema is slightly larger than strictly necessary for v1 |
| 2026-04-27 | Markdown editor instead of WYSIWYG | Simpler implementation, no heavy library, content is portable | Non-technical users may prefer WYSIWYG; can be swapped later |
| 2026-04-27 | React Router v7 (SPA) instead of Next.js | Keeps build simple, avoids SSR complexity, easy to containerize | No SSR means slightly slower first paint; acceptable for internal tool |
| 2026-04-27 | No auth in v1 | Product brief explicitly says basic security only | Articles are editable by anyone with network access in v1 |
| 2026-04-27 | Shared Zod schemas instead of Prisma-generated types on client | Zod gives us runtime validation + inferred types without a monorepo or build-step coupling | Slight duplication of field definitions; kept minimal by design |
| 2026-04-27 | Playwright for E2E | Required by brief; best-in-class auto-wait and tracing | Slightly heavier than Cypress for simple cases, but more reliable |

---

## 13. Appendix: Example API Contracts

### Create Article
```http
POST /api/articles
Content-Type: application/json

{
  "title": "Onboarding Checklist",
  "content": "## Day 1\n- Set up laptop...",
  "categoryId": 1,
  "tagNames": ["onboarding", "hr"]
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "id": 7,
    "slug": "onboarding-checklist",
    "title": "Onboarding Checklist",
    "content": "## Day 1\n- Set up laptop...",
    "excerpt": "## Day 1 - Set up laptop...",
    "status": "DRAFT",
    "createdAt": "2026-04-27T20:00:00.000Z",
    "updatedAt": "2026-04-27T20:00:00.000Z",
    "categoryId": 1,
    "tags": [{ "id": 3, "name": "onboarding" }, { "id": 4, "name": "hr" }]
  },
  "error": null
}
```

### Search Articles
```http
GET /api/search?q=onboarding

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": 7,
      "slug": "onboarding-checklist",
      "title": "Onboarding Checklist",
      "excerpt": "## Day 1 - Set up laptop...",
      "updatedAt": "2026-04-27T20:00:00.000Z"
    }
  ],
  "error": null
}
```

---

*End of Architecture Spec*

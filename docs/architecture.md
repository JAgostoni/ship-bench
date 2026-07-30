# Technical Architecture Specification

**Project:** Simplified Knowledge Base App (v1)

---

## 1. Overview
A small‑team internal knowledge‑base web application supporting article browsing, full‑text search, and markdown editing. Target ~100 concurrent users, responsive UI, and easy local development.

---

## 2. Front‑end Architecture
| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Framework | **React 19.2.8** (via Next.js) | Latest stable release, component model, SSR/SSG for SEO, built‑in routing.
| Rendering | **Next.js 16.2.12** (App Router) | File‑system routing, API routes, incremental static regeneration, zero‑config TypeScript.
| Language | **TypeScript 6.0.3** | Strong typing, aligns with Next.js defaults.
| UI Library | **Tailwind CSS 4.3.3** (JIT mode) | Utility‑first, fast compile, responsive design, no runtime CSS.
| Editor | **React‑MDE (Markdown Editor) v2.2.0** (lightweight) with **remark‑html** for preview. | Simple markdown editing with live preview, no heavy WYSIWYG.
| State Management | **React Query (TanStack Query) v5** for server data, **Zustand** for UI UI. | Cache, background refetch, minimal boilerplate.
| Routing | Next.js App Router (React Server Components) | Future‑proof, improves performance for article list/detail.
| Testing | **Jest** + **React Testing Library** for unit; **Playwright** v1.44.0 for E2E. | Popular, fast, covers critical flows.
| Build Tool | **Next.js built‑in webpack/Swc** (no extra config). | Fast dev server, production optimizations.
| Accessibility | Use **Headless UI** components + ARIA attributes. | Guarantees baseline WCAG compliance.

---

## 3. Back‑end Architecture
| Aspect | Decision |
ationale |
|--------|----------|-----------|
| Runtime | **Node.js 26.5.1 (Current)** | Latest LTS, ES2024 features, async/await performance.
| Web Framework | **Next.js API Routes** (Node) | Co‑located with front‑end, eliminates separate server repo.
| Language | **TypeScript 6.0.3** | Consistency with front‑end.
| Database | **SQLite 3.45** (file‑based) via **Prisma 5.10.0** ORM | Zero‑config, easy local dev, supports migrations, sufficient for ~100 users.
| ORM | **Prisma** | Type‑safe queries, migrations, auto‑generated TS types.
| Search | **SQLite FTS5** virtual table for full‑text search on title & content. | No external service needed, fast for small‑to‑medium dataset.
| Authentication | Simple **session cookie** using **next‑auth v5** with **Credentials Provider** (username/password stored hashed). | Lightweight, easy to replace later with SSO.
| Validation | **Zod v3.23.8** schemas for request bodies. | Declarative, type‑inferred.
| Logging | **pino v9** (JSON) + **morgan** for HTTP request logging. | Low overhead, structured logs.
| Testing | **Jest** for unit, **Supertest** for API integration, **Playwright** for E2E (same as front‑end). | Unified test stack.

---

## 4. Data Model & Persistence

### 4.1 Prisma Schema (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Article {
  id          Int      @id @default(autoincrement())
  title       String
  content     String   @db.LongText
  status      Status   @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tags        Tag[]    @relation("ArticleTags")
}

model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  articles   Article[] @relation("ArticleTags")
}

enum Status {
  DRAFT
  PUBLISHED
}
```

### 4.2 Full‑Text Search Table (SQLite FTS5)
```sql
CREATE VIRTUAL TABLE article_fts USING fts5(
  title,
  content,
  articleId UNINDEXED,
  tokenize = "unicode61"
);

-- Trigger to keep FTS in sync
CREATE TRIGGER article_ai AFTER INSERT ON Article BEGIN
  INSERT INTO article_fts(rowid, title, content, articleId) VALUES (new.id, new.title, new.content, new.id);
END;

CREATE TRIGGER article_ad AFTER DELETE ON Article BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content, articleId) VALUES ('delete', old.id, old.title, old.content, old.id);
END;

CREATE TRIGGER article_au AFTER UPDATE ON Article BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content, articleId) VALUES ('delete', old.id, old.title, old.content, old.id);
  INSERT INTO article_fts(rowid, title, content, articleId) VALUES (new.id, new.title, new.content, new.id);
END;
```

---

## 5. Feature‑Specific Architecture Decisions
### 5.1 Article Browsing & Detail
- **Route**: `/articles` (list) and `/articles/[id]` (detail) using Next.js App Router.
- **Data fetching**: Server‑Side Rendering (SSR) for list (fast first paint) and **Incremental Static Regeneration** for detail pages (revalidate every 60 s).
- **Cache**: React Query on client for subsequent navigation.

### 5.2 Search
- **Endpoint**: `GET /api/search?query=…`
- **Implementation**: SQLite FTS5 `MATCH` query with ranking (`bm25`).
- **Front‑end**: Debounced input (300 ms) → React Query → display results list.

### 5.3 Editing
- **Editor**: React‑MDE (markdown) with live preview using `remark`.
- **API**: `POST /api/articles` (create) and `PUT /api/articles/:id` (update).
- **Validation**: Zod schema ensures non‑empty title, content length ≤ 10 KB.
- **Optimistic UI**: React Query mutation with rollback on error.

### 5.4 Tag Organization (Stretch, but implemented minimally)
- **Data**: Many‑to‑many via Prisma `Tag` model.
- **UI**: Multi‑select dropdown (Headless UI) on edit page.
- **Filtering**: `GET /api/articles?tag=slug` – Prisma `where` clause.

### 5.5 Article Status
- **Enum**: `DRAFT` | `PUBLISHED`.
- **UI**: Toggle switch on edit page; list view shows badge.
- **API**: Status field persisted; published articles are searchable by default.

---

## 6. Front‑end / Back‑end Integration
- **API contracts** – JSON over HTTP, OpenAPI‑like definitions (inline in docs).
- **Auth** – Session cookie (`next-auth.session`) sent automatically; protected API routes check `req.session`.
- **Error handling** – Standard shape `{ error: string, details?: any }`.
- **CORS** – Not needed (same origin). Production can be hosted on Vercel with same domain.

---

## 7. Repository Structure & Developer Workflow
```
/ (repo root)
├─ prisma/
│   └─ schema.prisma
├─ src/
│   ├─ app/               # Next.js App Router pages
│   │   ├─ layout.tsx
│   │   ├─ page.tsx
│   │   ├─ articles/
│   │   │   ├─ page.tsx          # list
│   │   │   ├─ [id]/page.tsx     # detail
│   │   │   └─ edit/page.tsx      # edit UI
│   ├─ api/               # API route handlers
│   │   └─ articles/…
│   ├─ components/        # UI components (Header, ArticleCard, SearchBox, …)
│   ├─ lib/               # prisma client, auth helpers, validation schemas
│   └─ styles/            # globals.css (Tailwind import)
├─ public/
├─ tests/
│   ├─ unit/            # Jest + React Testing Library
│   └─ e2e/             # Playwright specs
├─ .env.example
├─ next.config.mjs
├─ tailwind.config.cjs
├─ tsconfig.json
└─ package.json
```

**Workflow**
1. `npm install` (installs dependencies). 2. `npm run dev` – starts Next.js dev server on `http://localhost:3000`. 3. `npm run test` – Jest unit tests. 4. `npm run test:e2e` – Playwright headless.

---

## 8. Testing Strategy
- **Unit**: Jest + React Testing Library for components; Prisma client mocked with `@prisma/client/runtime`.
- **Integration**: Supertest against Next.js API routes (run with `npm run test:api`).
- **E2E**: Playwright v1.44.0 covering:
  - User logs in → browses article list → opens detail → edits → saves → sees updated content.
  - Search returns correct results.
- **Coverage**: Aim ≥ 80 % for core modules.

---

## 9. Local Development & Run Instructions
```bash
# 1. Clone repo (already done)
# 2. Install dependencies
npm ci

# 3. Set up SQLite DB & migrations
npx prisma migrate dev --name init   # creates dev.db in ./prisma

# 4. Create .env (copy from .env.example)
cp .env.example .env
#   - Edit DATABASE_URL if needed (default: file:./dev.db)

# 5. Run dev server
npm run dev

# 6. Run tests
npm run test          # unit
npm run test:e2e      # Playwright (headless)
```

---

## 10. Non‑Functional Architecture Decisions
| Concern | Decision |
|---------|----------|
| **Scalability** | Stateless Next.js API routes; can be deployed to Vercel or any Node platform behind a load balancer. SQLite can be swapped for Postgres with minimal code change (Prisma). |
| **Performance** | SSR for list, ISR for detail; FTS5 indexed search; React Query caching. |
| **Security** | HTTPS enforced by hosting platform; session cookie `httpOnly`, `sameSite=strict`; password hashing with `bcryptjs` (12 rounds). |
| **Observability** | Pino JSON logs streamed to stdout; optional integration with Vercel logs. |
| **Maintainability** | Type‑safe Prisma models, Zod validation, isolated UI components, linting with ESLint 9 + Prettier 3. |
| **Accessibility** | Headless UI + ARIA attributes; colour contrast via Tailwind built‑in palette. |
| **Developer Ergonomics** | `npm run dev` hot reload, `npm run lint:fix`, `npm run format`. |

---

## 11. Decisions Log
- **React 19** – latest stable at time of writing (July 2026) – provides server components.
- **Next.js 16** – supports App Router and edge runtime; aligns with React 19.
- **SQLite + Prisma** – zero‑config, fits ≤ 100 concurrent users, easy local dev; Prisma abstracts DB for future migration.
- **Tailwind 4** – JIT mode gives instant CSS updates; no runtime CSS overhead.
- **Playwright** – cross‑browser E2E, integrates with CI, matches stack.
- **Auth** – simple credentials provider; satisfies MVP security without external IdP.
- **Search** – SQLite FTS5 avoids external search service; sufficient for small‑to‑medium article sets.

---

*All versions were verified via live web searches at the time of writing.*

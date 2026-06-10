# Technical Architecture Spec — Simplified Knowledge Base App (v1)

**Status:** Approved for implementation
**Date:** 2026-06-10
**Source of truth:** `docs/product-brief.md`

This spec is written so a developer can begin implementation immediately without making major architectural decisions. Where the brief was silent, assumptions are stated explicitly in §12.

---

## 1. Stack summary (exact versions)

All versions verified by live web search on 2026-06-10.

| Layer | Technology | Version | Role |
|---|---|---|---|
| Runtime | Node.js | **24.x (Active LTS)** | Server runtime (Node 26 is Current, not LTS until Oct 2026 — use 24) |
| Framework | Next.js (App Router) | **16.2.7** | Full-stack: SSR pages + API route handlers in one process |
| UI library | React | **19.2.x** (bundled with Next 16) | Components |
| Language | TypeScript | **6.0.3** | Strict mode everywhere |
| Styling | Tailwind CSS | **4.3.0** | Utility CSS, CSS-first `@theme` config |
| Database | SQLite (via better-sqlite3) | **better-sqlite3 12.10.0** (SQLite 3.53.x, FTS5 built in) | Persistence + full-text search |
| ORM | Drizzle ORM + drizzle-kit | **drizzle-orm 0.45.2**, drizzle-kit `^0.31` | Typed schema, queries, migrations |
| Validation | Zod | **4.4.3** | Shared client/server form + API validation |
| Markdown render | react-markdown + remark-gfm | **10.1.0** / `^4.0.0` | Preview + article rendering (safe by default, no raw HTML) |
| Unit tests | Vitest | **4.1.8** | Unit/integration tests for server logic |
| E2E tests | Playwright | **1.60.0** | Critical journey: browse → search → edit |

**Why this stack:** one process, one repo, one database file. It satisfies "easy to run locally" and "~100 concurrent users" (SQLite in WAL mode comfortably handles read-heavy workloads at this scale), while Drizzle gives a near-free migration path to PostgreSQL if scaling is ever needed.

---

## 2. Front-end architecture

- **Next.js App Router with React Server Components (RSC) for reads.** Article list, article detail, and search results pages are server-rendered. Server components call the data layer (`src/lib/repo/*`) directly — no HTTP hop for reads.
- **Client components only where interactivity demands it:**
  - `SearchBox` (debounced search-as-you-type, calls `GET /api/search`)
  - `ArticleEditor` (Markdown textarea + live preview, form state, validation)
  - `DeleteArticleButton` (confirm dialog)
- **No client-side state library.** React `useState`/`useTransition` plus URL search params (`?q=`) are sufficient. Do not add Redux/Zustand/TanStack Query.
- **Styling:** Tailwind CSS 4 with a small design-token layer in `globals.css` via `@theme` (font scale, spacing, two-color neutral palette + one accent). No component library; build ~6 small primitives (`Button`, `Input`, `Card`, `EmptyState`, `Badge`, `PageHeader`) in `src/components/ui/`. This keeps the "calm, readable, information-dense" design goal under direct control.
- **Routes (pages):**

| Route | Type | Purpose |
|---|---|---|
| `/` | RSC | Article list (all articles, newest-updated first) + search box; redirects nothing — this is home |
| `/articles/[id]` | RSC | Article detail (rendered Markdown) |
| `/articles/new` | RSC shell + client editor | Create article |
| `/articles/[id]/edit` | RSC shell + client editor | Edit article |
| `/search?q=…` | RSC | Full search results page (shareable URL); `SearchBox` also shows inline top-5 dropdown |

- **Layout:** single shared `app/layout.tsx` with a slim header (app name, search box, "New article" button). Responsive at two breakpoints: desktop (≥1024px, list uses two-column card grid) and tablet (≥768px, single column). Mobile is not a target but must not break (Tailwind defaults handle this).
- **Empty states** are first-class components: no articles yet (with "Create your first article" CTA), no search results (with query echoed + "clear search"), article not found (404 page via `not-found.tsx`).
- **Accessibility (v1 scope per brief):** semantic landmarks (`main`, `nav`), labeled form controls, visible focus rings, WCAG AA contrast on the chosen palette, `aria-live="polite"` on search-result count. Full audit is explicitly out of scope.

---

## 3. Back-end architecture

- **Next.js Route Handlers** (`app/api/**/route.ts`) provide a small REST API used by client components for mutations and live search. Reads for full pages bypass HTTP (RSC → repo).
- **Layering (strict):**
  1. `app/api/**` — HTTP concerns only: parse, validate with Zod, call repo, map errors to status codes.
  2. `src/lib/repo/articles.ts` — all SQL/Drizzle queries. The only module that touches the DB.
  3. `src/lib/db/` — Drizzle client (singleton, WAL mode enabled on open), schema, migration runner.
  4. `src/lib/validation/article.ts` — Zod schemas shared by API handlers and client forms.
- **No auth in v1** (brief: "basic security assumptions only"). The app trusts its network. Mitigations that are still in scope: Zod validation on every write, parameterized queries via Drizzle (no SQL injection), react-markdown's default HTML-stripping (no stored XSS), 100 KB request body limit on write endpoints.
- **Error contract:** all API errors return `{ "error": { "code": string, "message": string, "fieldErrors"?: Record<string,string[]> } }` with appropriate status (400 validation, 404 missing, 500 unexpected). Unexpected errors are logged server-side with `console.error` (sufficient for local-first v1).
- **Concurrency:** better-sqlite3 is synchronous; SQLite runs in WAL mode (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`). Reads never block reads; writes serialize, which is fine at this scale (writes are human-paced edits).

---

## 4. Data model and persistence

### 4.1 Entities

**v1 ships exactly one entity (`articles`) plus an FTS index.** Categories/tags and draft/published status are features 4–5 in the brief and are *not required* for v1; the schema below leaves clean extension points (see §10 decisions log).

**`articles`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, autoincrement | Used in URLs (`/articles/123`) |
| `title` | TEXT | NOT NULL, 1–200 chars (enforced by Zod) | |
| `content` | TEXT | NOT NULL, Markdown source, ≤ 100,000 chars | Empty string allowed? No — min 1 char |
| `created_at` | INTEGER | NOT NULL, unix epoch ms, default `Date.now()` set in app code | |
| `updated_at` | INTEGER | NOT NULL, unix epoch ms, updated on every write | List sort key (DESC) |

**`articles_fts`** — SQLite FTS5 virtual table (`title`, `content`), contentless-delete=0, `content='articles'`, `content_rowid='id'`, tokenizer `porter unicode61`. Kept in sync by three SQL triggers (insert/update/delete) — see migration in §11.

### 4.2 Drizzle schema (`src/lib/db/schema.ts`)

```ts
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
```

The FTS5 table and triggers cannot be modeled by Drizzle; they live as raw SQL in the generated migration (drizzle-kit supports custom SQL migrations via `drizzle-kit generate --custom`). See §11.

### 4.3 Persistence strategy

- DB file: `./data/kb.sqlite` (gitignored; `data/.gitkeep` committed). Test runs use `./data/kb-test.sqlite` or `:memory:` (unit tests), selected by `DATABASE_PATH` env var.
- Migrations run automatically on server boot via Drizzle's `migrate()` in the DB singleton (idempotent, journal table tracked). No separate migrate step for the happy path; `npm run db:migrate` exists for CI/tests.
- Seed script `npm run db:seed` inserts 12 realistic sample articles (only if table is empty) so the app demos well immediately.
- **Scale-out path (deliberate, not built):** swap `drizzle-orm/better-sqlite3` for `drizzle-orm/node-postgres` and replace FTS5 with Postgres `tsvector` — both isolated behind `src/lib/repo/articles.ts`, the only file that would change.

---

## 5. Feature-specific architecture decisions

Only the two required features with material technical implications are covered. (Article browsing is plain CRUD/RSC rendering — no special architecture needed.)

### 5.1 Search across titles and content

- **Approach:** SQLite **FTS5** with external-content table + triggers (no double storage of content; index stays transactionally consistent with `articles`).
- **Query construction:** user input is **not** passed raw to FTS5 (its query syntax errors on stray `"` or `-`). The repo sanitizes input into a safe prefix query: split on non-alphanumerics, drop empties, wrap each term as `"term"*`, join with implicit AND. Example: `deploy serv` → `"deploy"* "serv"*`. This gives search-as-you-type prefix matching.
- **Ranking & excerpts:** order by FTS5 `bm25(articles_fts, 5.0, 1.0)` (title weighted 5×), and return `snippet(articles_fts, 1, '<mark>', '</mark>', '…', 20)` for highlighted result excerpts. The snippet HTML is constrained (only `<mark>` injected by us) and rendered with a tiny whitelist renderer, never `dangerouslySetInnerHTML` on user-controlled markup — split on the known `<mark>` tokens instead.
- **UX wiring:** `SearchBox` debounces 200 ms, calls `GET /api/search?q=…&limit=5` for the dropdown; Enter navigates to `/search?q=…` which runs the same repo function server-side for the full list. One implementation, two surfaces.
- **Tradeoff:** FTS5 prefix queries are fast at this corpus size (hundreds–thousands of articles) with zero extra infrastructure; the alternative (LIKE '%…%') was rejected as unrankable and slow, and external search (Meilisearch etc.) rejected as enterprise-heavy for v1.

### 5.2 Markdown editing with live preview

- **Approach (chosen per brief's "Markdown editor with preview" option):** split-pane editor — a plain `<textarea>` (monospace, auto-growing) on the left, live preview on the right rendered by **react-markdown 10.1.0 + remark-gfm** (tables, task lists, strikethrough). On tablet widths the panes become tabbed (Write / Preview).
- **Why a plain textarea, not CodeMirror/TipTap:** the brief explicitly prefers "simple, reliable, and easy to run locally, rather than enterprise-heavy or highly customized." A textarea has zero dependencies, perfect a11y/IME behavior, and trivial testability. A WYSIWYG (TipTap) was rejected: heavier, schema-coupled content, harder to diff/store.
- **Security:** react-markdown does not render raw HTML by default — embedded `<script>` in article content renders as literal text. No sanitizer dependency needed. Do not add `rehype-raw`.
- **Form behavior:** controlled form, Zod schema `articleInput` (`title: 1–200 chars trimmed`, `content: 1–100k chars`) validated on blur/submit client-side and re-validated server-side from the same schema. Submit via `fetch` to the REST API; on success `router.push` to the detail page (with `router.refresh()` to bust RSC cache). Unsaved-changes guard: `beforeunload` listener when dirty.
- **Preview parity:** detail page and editor preview use the same `<ArticleBody>` component, so what you preview is exactly what readers see.

---

## 6. Front-end / back-end integration

### 6.1 Pattern

- **Reads (full pages):** RSC → `repo` directly. Pages are dynamic (`export const dynamic = "force-dynamic"`) — content freshness beats caching for an internal KB.
- **Writes + live search:** client components → REST route handlers → `repo`. Server Actions were rejected: REST handlers are independently testable with Playwright's `request` fixture and make the API contract explicit.

### 6.2 API contract

All bodies are JSON. All timestamps are unix epoch ms.

| Method & path | Purpose | Success |
|---|---|---|
| `GET /api/articles` | List (id, title, updatedAt only) | `200 { "articles": [...] }` |
| `GET /api/articles/{id}` | Fetch one (full content) | `200 { "article": {...} }` |
| `POST /api/articles` | Create | `201 { "article": {...} }` |
| `PUT /api/articles/{id}` | Full update (title + content) | `200 { "article": {...} }` |
| `DELETE /api/articles/{id}` | Delete | `204` empty |
| `GET /api/search?q={q}&limit={n}` | Search (limit default 20, max 50) | `200 { "results": [...], "total": number }` |

**Examples**

```http
POST /api/articles
{ "title": "Deploy checklist", "content": "# Steps\n1. ..." }

201
{ "article": { "id": 7, "title": "Deploy checklist", "content": "# Steps\n1. ...",
  "createdAt": 1760000000000, "updatedAt": 1760000000000 } }
```

```http
POST /api/articles  (invalid)
{ "title": "", "content": "x" }

400
{ "error": { "code": "VALIDATION", "message": "Invalid article",
  "fieldErrors": { "title": ["Title is required"] } } }
```

```http
GET /api/search?q=deploy&limit=5

200
{ "results": [ { "id": 7, "title": "Deploy checklist",
    "snippet": "…before every <mark>deploy</mark>, run…", "updatedAt": 1760000000000 } ],
  "total": 3 }
```

`GET /api/articles/{id}` with unknown id → `404 { "error": { "code": "NOT_FOUND", "message": "Article 99 not found" } }`. Same for PUT/DELETE.

### 6.3 Shared types

`src/lib/validation/article.ts` exports the Zod schemas; API response types are derived (`z.infer`) and imported by both route handlers and client components. No codegen, no OpenAPI — the app is too small to justify it.

---

## 7. Repository structure and developer workflow

### 7.1 Repo tree

```
.
├── docs/                        # brief, this spec, UX spec, backlog, decisions
├── data/                        # SQLite files (gitignored, .gitkeep committed)
├── drizzle/                     # generated SQL migrations (committed)
│   └── 0000_init.sql
├── e2e/
│   ├── journey.spec.ts          # browse → search → edit
│   └── fixtures.ts              # seeded-DB fixture
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css          # Tailwind 4 @theme tokens
│   │   ├── page.tsx             # article list (home)
│   │   ├── not-found.tsx
│   │   ├── search/page.tsx
│   │   ├── articles/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── api/
│   │       ├── articles/route.ts            # GET list, POST
│   │       ├── articles/[id]/route.ts       # GET, PUT, DELETE
│   │       └── search/route.ts
│   ├── components/
│   │   ├── ui/                  # Button, Input, Card, EmptyState, Badge, PageHeader
│   │   ├── ArticleBody.tsx      # react-markdown wrapper (shared detail/preview)
│   │   ├── ArticleEditor.tsx    # client: form + split-pane preview
│   │   ├── SearchBox.tsx        # client: debounced dropdown
│   │   └── DeleteArticleButton.tsx
│   └── lib/
│       ├── db/
│       │   ├── client.ts        # singleton, WAL pragmas, auto-migrate
│       │   └── schema.ts
│       ├── repo/articles.ts     # all queries incl. FTS search + sanitizer
│       ├── validation/article.ts
│       └── seed.ts
├── drizzle.config.ts
├── next.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json                # strict: true
├── package.json
└── README.md
```

### 7.2 Workflow

- **Package manager:** npm (lockfile committed). Node version pinned via `"engines": { "node": ">=24 <25" }` and `.nvmrc` → `24`.
- **Branching:** trunk-based; short-lived branches → PR → squash-merge to `main`.
- **Quality gates (run locally, no CI required by brief):** `npm run check` = typecheck + ESLint (`eslint-config-next` 16.x flat config) + Prettier check + Vitest. Run before every PR.
- **Scripts (`package.json`):**

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` / `start` | `next build` / `next start` |
| `db:migrate` | `tsx src/lib/db/migrate.ts` |
| `db:seed` | `tsx src/lib/seed.ts` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `check` | `tsc --noEmit && eslint . && prettier --check . && vitest run` |

---

## 8. Testing strategy

### 8.1 Unit / integration — Vitest 4.1.8

Target: the logic that can actually be wrong, not coverage theater.

- `lib/repo/articles.test.ts` — CRUD against an **in-memory SQLite** (`new Database(":memory:")` + run migrations in `beforeEach`): create/read/update/delete, updatedAt bumps, list ordering.
- `lib/repo/search.test.ts` — FTS behavior: prefix match, title-over-content ranking, snippet contains `<mark>`, **sanitizer cases** (`"`, `-`, `*`, empty, emoji input must never throw).
- `lib/validation/article.test.ts` — Zod boundaries (empty title, 201-char title, 100k+1 content, whitespace trimming).
- One component test (Vitest browser-less + `@testing-library/react`): `ArticleEditor` shows validation errors and renders preview from typed Markdown.

### 8.2 E2E — Playwright 1.60.0

Playwright is chosen because it is the brief's named example, first-class with Next.js, and its `webServer` option owns the app lifecycle.

- `playwright.config.ts`: `webServer: { command: "npm run build && npm run start", port: 3000, env: { DATABASE_PATH: "data/kb-e2e.sqlite" } }`; project: Chromium only (brief scope); `reporter: html`.
- Global setup deletes + reseeds `kb-e2e.sqlite` for determinism.
- **Critical journey spec (required by brief):** home shows seeded articles → type query in search box → dropdown shows match → open result → click Edit → change title + body → save → detail shows updated content → search finds the new title.
- Secondary specs: create-from-empty-state, delete with confirm, 404 page, validation error display.
- **Not in scope:** cross-browser matrix, visual regression, a11y audit automation.

### 8.3 Verification notes deliverable

Each run records `docs/verification.md`: commands run, pass/fail output, and screenshots of the journey (Playwright traces/screenshots on failure are kept in `playwright-report/`).

---

## 9. Local development and run instructions

Prereqs: Node 24.x, npm 10+. Windows/macOS/Linux all fine (better-sqlite3 ships prebuilds for Node 24/26).

```bash
git clone <repo> && cd <repo>
npm install
npm run db:seed       # creates data/kb.sqlite, runs migrations, inserts 12 sample articles
npm run dev           # http://localhost:3000
```

- Migrations auto-apply on boot; `db:seed` is optional but recommended for first run.
- `npm test` (unit, no server needed) · `npx playwright install chromium` once, then `npm run test:e2e`.
- Production-style local run: `npm run build && npm start`.
- Env vars (all optional, `.env.example` committed): `DATABASE_PATH` (default `data/kb.sqlite`), `PORT` (default 3000).
- Reset the world: delete `data/kb.sqlite`, run `npm run db:seed`.

---

## 10. Non-functional architecture decisions

| Concern | Decision |
|---|---|
| ~100 concurrent users | Single Node process; SQLite WAL + `busy_timeout=5000`. Read-heavy KB traffic is well within capacity; verified assumption: writes are rare human edits. |
| Performance (small–medium corpus) | FTS5 index for search; list endpoint selects only `id,title,updated_at`; RSC streaming HTML; no client JS on read-only pages beyond the search box. |
| Future scaling | All DB access behind `repo/`; Drizzle dialect swap → Postgres; stateless app layer → horizontal scale behind a proxy. No code written for this now. |
| Responsive | Tailwind breakpoints `md`(768)/`lg`(1024); editor collapses to tabs below `lg`. |
| Validation | One Zod schema, enforced on both sides; server is authoritative. |
| Security (v1 scope) | No auth (internal trust, per brief). Parameterized queries, FTS input sanitizer, no raw-HTML Markdown rendering, body-size cap. Revisit if app leaves the trusted network. |
| Accessibility (v1 scope) | Semantic HTML, labels, focus-visible rings, AA contrast tokens, `aria-live` search count. Full audit deferred (design-only per brief). |
| Empty states | Dedicated `EmptyState` component used in all three brief-mandated cases. |
| Observability | `console.error` + Next.js dev overlay locally. No APM — out of scope. |

---

## 11. Migration example

`drizzle/0000_init.sql` (generated by `drizzle-kit generate`, then FTS section appended via `drizzle-kit generate --custom`):

```sql
CREATE TABLE `articles` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE VIRTUAL TABLE `articles_fts` USING fts5(
  `title`, `content`,
  content='articles', content_rowid='id',
  tokenize='porter unicode61'
);
--> statement-breakpoint
CREATE TRIGGER `articles_ai` AFTER INSERT ON `articles` BEGIN
  INSERT INTO articles_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_ad` AFTER DELETE ON `articles` BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER `articles_au` AFTER UPDATE ON `articles` BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, content)
  VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO articles_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
```

Search query shape used by `repo/articles.ts`:

```sql
SELECT a.id, a.title, a.updated_at,
       snippet(articles_fts, 1, '<mark>', '</mark>', '…', 20) AS snippet
FROM articles_fts
JOIN articles a ON a.id = articles_fts.rowid
WHERE articles_fts MATCH ?         -- e.g. '"deploy"* "serv"*'
ORDER BY bm25(articles_fts, 5.0, 1.0)
LIMIT ?;
```

---

## 12. Assumptions

1. **No authentication or user identity in v1** — the brief specifies "basic security assumptions only"; every visitor can read and edit everything (matches "basic editing for all articles").
2. **Categories/tags and draft/published status are out of v1 scope** — brief marks only features 1–3 as required. Schema/UI leave room (a `status` column or `tags` join table are additive migrations).
3. **English-language content** — porter stemming tokenizer; acceptable default for an internal team KB.
4. **Single-writer editing is acceptable** — no concurrent-edit conflict resolution (last write wins); article edits by a small team rarely collide. A future `updatedAt` optimistic-concurrency check is a one-field addition to `PUT`.

---

## 13. Decisions log

| # | Decision | Alternatives rejected | Why |
|---|---|---|---|
| 1 | Next.js 16 full-stack, single process | Vite+React SPA + separate Express/Fastify API | One repo/process/port = lowest local-run friction; RSC removes a whole class of fetch/loading code; scaling path unaffected |
| 2 | SQLite + better-sqlite3 + WAL | Postgres in Docker | Zero external services to run; 100 users read-heavy is squarely in SQLite's lane; Drizzle keeps Postgres exit cheap |
| 3 | Drizzle ORM 0.45.2 (stable) | Prisma; Drizzle 1.0-RC | Drizzle is lighter and SQL-transparent; 1.0 is still RC — don't build a benchmark on a release candidate |
| 4 | FTS5 + triggers for search | `LIKE %…%`; Meilisearch | LIKE can't rank and scans full content; external engine violates local-first simplicity |
| 5 | Markdown textarea + react-markdown preview | TipTap/CodeMirror WYSIWYG | Brief asks for simple & reliable; textarea is dependency-free and fully accessible; preview reuses the reader's renderer |
| 6 | REST route handlers for writes, RSC-direct for reads | Server Actions everywhere | Explicit, independently testable API contract (Playwright `request`); reads skip HTTP entirely |
| 7 | Integer ids in URLs | Slugs | Slug uniqueness/renaming adds complexity with no v1 payoff for an internal tool |
| 8 | No auth, no status field, no tags in v1 | Building features 4–5 | Brief requires only features 1–3; finishability in 1–2 sessions is a hard constraint |
| 9 | TypeScript 6.0.3 | 5.9.x | Latest stable per brief mandate; 6.0 is the stable stepping-stone release (7.0 is beta — avoided) |
| 10 | Vitest + Playwright | Jest + Cypress | Both are the current ecosystem defaults for this stack; Playwright named in brief; Vitest shares the TS/ESM toolchain |

---

## 14. Version sources (live search, 2026-06-10)

- Next.js 16.2.7: [endoflife.date/nextjs](https://endoflife.date/nextjs), [nextjs.org/blog](https://nextjs.org/blog)
- Node.js 24 LTS / 26 Current: [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases), [endoflife.date/nodejs](https://endoflife.date/nodejs)
- Drizzle ORM 0.45.2 (1.0.0-rc available): [npmjs.com/package/drizzle-orm](https://www.npmjs.com/package/drizzle-orm)
- better-sqlite3 12.10.0: [github.com/WiseLibs/better-sqlite3/releases](https://github.com/WiseLibs/better-sqlite3/releases)
- Tailwind CSS 4.3.0: [tailwindcss.com/blog](https://tailwindcss.com/blog), [versionlog.com/tailwind-css](https://versionlog.com/tailwind-css/)
- TypeScript 6.0.3: [npmjs.com/package/typescript](https://www.npmjs.com/package/typescript), [devblogs.microsoft.com/typescript](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- Zod 4.4.3: [npmjs.com/package/zod](https://www.npmjs.com/package/zod)
- react-markdown 10.1.0: [npmjs.com/package/react-markdown](https://www.npmjs.com/package/react-markdown)
- Vitest 4.1.8: [npmjs.com/package/vitest](https://www.npmjs.com/package/vitest)
- Playwright 1.60.0: [github.com/microsoft/playwright/releases](https://github.com/microsoft/playwright/releases)

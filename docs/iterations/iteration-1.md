# Iteration 1 — Foundation (environment, structure, data layer)

**Goal:** Establish a runnable local full-stack project: Next.js app shell, pinned dependencies, Prisma/SQLite schema, FTS bootstrap, seed data, core pure utilities, design tokens, and setup documentation so every later iteration can build on a working baseline.

**Scope:** Scaffold + configuration + persistence + seed + shell skeleton. **No** article list queries UI, editor, or search product features yet (placeholder UI only).

**Sources:** architecture §§2, 6, 10, 12, 13; design §5 (tokens), §2.1 (shell layout).

---

## Exit criteria

- [ ] `npm install` succeeds on Node 24.x  
- [ ] `cp .env.example .env` → `npx prisma migrate dev` → `npm run db:seed` produces `prisma/dev.db` with categories, tags, articles, and `articles_fts` rows  
- [ ] `npm run dev` serves `http://localhost:3000` with app shell (header wordmark + placeholder search + New article link) and a simple home placeholder  
- [ ] Core utils exist and are importable (`slugify`, `excerpt`/`stripHtml` stubs or complete pure functions)  
- [ ] README documents first-time setup commands  

---

## Task list

### T1.1 — Scaffold Next.js App Router project

1. Initialize the app at repo root (or promote scaffold into root) using **Next.js 16.2.x**, **React 19.2.x**, **TypeScript**, App Router, `src/` directory.
2. Configure `tsconfig.json` with path alias `@/*` → `src/*`.
3. Add `next.config.ts` (default fine; no special experimental flags required).
4. Ensure Node engine note: **24.x** (document in README).

**Deliverable:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` compiling under `npm run dev`.

---

### T1.2 — Tailwind CSS 4 + PostCSS

1. Install `tailwindcss@^4.3.2` and `@tailwindcss/postcss@^4.3.2`.
2. Add `postcss.config.mjs` with the Tailwind PostCSS plugin.
3. In `src/app/globals.css`: `@import "tailwindcss";` plus design tokens from design-spec §5.1 (`:root` CSS variables for colors, radii, spacing, type, motion).
4. Map tokens into Tailwind v4 `@theme` (or documented utility aliases) so components can use semantic classes / CSS vars consistently.
5. Add `.prose-article` rules per design §5.2 (even if unused until detail page).
6. Respect `prefers-reduced-motion: reduce` (transitions none).

**Deliverable:** Home page can use utility classes and CSS variables; background uses `--color-bg`.

---

### T1.3 — Dependencies and package scripts

Install and pin per architecture §2 (use `^` ranges):

| Package | Role |
|---------|------|
| `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`, `better-sqlite3` | DB |
| `zod` | Validation (used from It. 3; install now) |
| `lucide-react` | Icons |
| `dotenv` | Env for Prisma scripts |
| `tsx` | Seed runner |
| `vitest` | Unit tests (config can be minimal stub; tests filled in It. 6) |
| `@playwright/test` | E2E (install; full config in It. 6 is OK) |
| `isomorphic-dompurify` (or chosen sanitizer) | HTML sanitize (wired in It. 3; install now if preferred) |
| TipTap packages | May defer install to It. 3 if you want a thinner first install — **prefer install in It. 3** to keep this iteration focused |

Add scripts from architecture §10.1:

```json
"dev", "build", "start", "lint", "test", "test:watch", "test:e2e",
"db:migrate", "db:seed", "db:reset", "db:studio", "postinstall": "prisma generate"
```

Configure Prisma seed:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

**Deliverable:** `package.json` complete; `npm run` lists expected scripts.

---

### T1.4 — Environment, gitignore, env example

1. Create `.env.example`:

   ```bash
   DATABASE_URL="file:./prisma/dev.db"
   ```

2. Create `.env` locally (gitignored) with the same default.
3. Optionally add `.env.test` with `file:./prisma/test.db` for later E2E.
4. `.gitignore`: `node_modules`, `.next`, `prisma/dev.db`, `prisma/test.db`, `.env`, Playwright artifacts, etc.

**Deliverable:** Fresh clone can copy env and not commit databases.

---

### T1.5 — Prisma schema and initial migration

1. Create `prisma/schema.prisma` exactly as architecture §6.2:
   - Enums: `ArticleStatus` (`DRAFT`, `PUBLISHED`)
   - Models: `Category`, `Tag`, `Article`, `ArticleTag`
   - Indexes on `[status, updatedAt]`, `categoryId`, `tagId`
2. Run `npx prisma migrate dev --name init_articles`.
3. Implement `src/lib/db.ts` Prisma singleton with `@prisma/adapter-better-sqlite3` per architecture §6.5.
4. On bootstrap (seed or first connection helper), enable:

   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA foreign_keys = ON;
   ```

**Deliverable:** Migrated empty schema; `npx prisma studio` opens.

---

### T1.6 — FTS5 bootstrap SQL

1. Add `prisma/sql/fts_init.sql` (architecture §6.4):

   ```sql
   CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
     article_id UNINDEXED,
     title,
     content,
     tokenize = 'unicode61'
   );
   ```

2. Create `src/lib/fts.ts` with:
   - `ensureFtsSchema()` — runs the CREATE VIRTUAL TABLE IF NOT EXISTS
   - `syncArticleToFts(articleId, title, plainContent)` — delete + insert row
   - `removeArticleFromFts(articleId)` — delete
   - `toFtsQuery(raw: string): string` — trim, lowercase, split, strip non `[a-z0-9_-]`, join with ` AND ` and suffix `*` (architecture §6.4)
   - Stub or full `searchArticles` can wait for It. 5; at minimum implement sync + ensure + `toFtsQuery`

**Deliverable:** FTS helpers module; ensure callable from seed.

---

### T1.7 — Pure utilities

Implement under `src/lib/utils/`:

| File | Behavior |
|------|----------|
| `slugify.ts` | Lowercase, strip non-url-safe, collapse hyphens; suitable for article/category/tag slugs |
| `excerpt.ts` | `stripHtml(html)` + `makeExcerpt(html, max=240)` plain text |
| `sanitize.ts` | Allowlist sanitizer stub or full impl (tags/attrs per architecture §8.4); **must be complete before detail HTML render in It. 2–3** — complete full allowlist here or first task of It. 3 before render |

Prefer completing `slugify` + `excerpt`/`stripHtml` fully in this iteration. Completing `sanitize` here is strongly recommended so It. 2 detail can render safely.

**Deliverable:** Importable pure functions with no Next runtime coupling.

---

### T1.8 — Seed script

Create `prisma/seed.ts` that:

1. Calls `ensureFtsSchema()` and WAL/foreign_keys pragmas.
2. Upserts **≥ 3 categories** (e.g. Engineering, Product, HR) with stable slugs.
3. Upserts **≥ 5 tags** (e.g. onboarding, runbook, rfc, faq, process).
4. Creates **8–12 articles**:
   - Mix of `DRAFT` and `PUBLISHED`
   - Varied `categoryId` (including at least one null → Uncategorized)
   - Varied tag links
   - Distinctive searchable terms in title/body: **`onboarding`**, **`deploy`**, **`vacation`**
   - Valid `contentHtml` using allowlisted tags (`p`, `h2`, `ul`, etc.)
   - `excerpt` populated via `makeExcerpt`
5. For every article, call `syncArticleToFts` with plain text body.
6. Is idempotent enough for `db:reset` (clear tables or use migrate reset).

**Deliverable:** `npm run db:seed` (or `db:reset`) yields inspectable, searchable-ready data.

---

### T1.9 — App shell skeleton (no product data)

1. `src/components/layout/AppShell.tsx` — `max-w-5xl mx-auto` content wrapper; `main#main-content`.
2. `src/components/layout/AppHeader.tsx` — sticky header per design §2.1:
   - Wordmark link “Knowledge Base” → `/`
   - Search: non-functional input placeholder “Search articles…” (wire in It. 5) **or** empty `SearchBox` shell
   - Primary “New article” button/link → `/articles/new` (page may 404 until It. 3 — link is fine)
3. Skip link “Skip to content” as first focusable element.
4. Root `layout.tsx` composes skip link + header + children; set `<html lang="en">` and body background.
5. Home `page.tsx`: temporary message e.g. “Knowledge Base — data layer ready” (replaced in It. 2).
6. Optional stub `not-found.tsx` / `error.tsx` can wait for It. 2/6; minimal defaults OK.

**Deliverable:** Calm shell matches design structure; no broken JS.

---

### T1.10 — README local run notes

Document:

- Prerequisites (Node 24, npm 10+, native build tools for `better-sqlite3`)
- First-time setup (architecture §12.2)
- Common commands table
- Troubleshooting (`better-sqlite3` rebuild, FTS missing table → re-seed)

**Deliverable:** Another developer can bootstrap without reading the architecture doc end-to-end.

---

### T1.11 — Minimal Vitest config (optional smoke)

1. Add `vitest.config.ts` with `environment: "node"` and `@/*` alias.
2. Do **not** require a full test suite yet; zero tests or a single placeholder is acceptable.
3. Ensure `npm test` exits 0 (empty suite or trivial assert).

**Deliverable:** Test runner wired for It. 6.

---

## Iteration-specific dependency notes

- **Blocks all later work:** T1.1–T1.8 especially. Do not start list/detail until seed data exists.
- **FTS search queries (It. 5)** depend on T1.6 + seed indexing in T1.8; write-path must call `syncArticleToFts` starting It. 3.
- **TipTap** packages intentionally deferred to It. 3 unless already installed.
- After this iteration the product is not feature-complete; it must still **boot and show the shell** without errors.

## Suggested verification

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
# open /, confirm shell
npx prisma studio
# confirm 8–12 articles, categories, tags
```

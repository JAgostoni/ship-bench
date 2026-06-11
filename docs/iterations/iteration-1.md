# Iteration 1 — Foundation: scaffold, database, seed

**Goal:** stand up the complete project skeleton — repo structure, pinned dependencies, database schema with FTS5 search index, seed data, and all tool configuration — so that every later iteration only adds feature code, never plumbing.

**Scope:** no product features. The end state is a bootable Next.js app with a placeholder home page, a seeded SQLite database, and a passing quality gate.

**References:** architecture §1 (stack/versions), §4 (data model), §7 (repo tree, scripts), §9 (run instructions), §11 (migration SQL).

---

## Tasks

### 1.1 Scaffold the Next.js application

- Run `create-next-app` for **Next.js 16.2.7** with: TypeScript, ESLint, Tailwind CSS, App Router, `src/` directory, no import alias changes (keep `@/*`).
- Target the repo tree in architecture §7.1. Remove starter boilerplate (default page content, logos, demo CSS) — leave `src/app/page.tsx` as a minimal placeholder ("Team KB — coming together") to be replaced in iteration 3.
- Pin Node: `"engines": { "node": ">=24 <25" }` in `package.json`; add `.nvmrc` containing `24`.
- Ensure `tsconfig.json` has `"strict": true`.

### 1.2 Install and pin dependencies

Install the exact versions from architecture §1 (live-verified 2026-06-10). Runtime deps: `drizzle-orm@0.45.2`, `better-sqlite3@12.10.0`, `zod@4.4.3`, `react-markdown@10.1.0`, `remark-gfm@^4.0.0`. Dev deps: `typescript@6.0.3`, `tailwindcss@4.3.0`, `drizzle-kit@^0.31`, `vitest@4.1.8`, `@playwright/test@1.60.0`, `tsx`, `@types/better-sqlite3`, `@testing-library/react` (+ `jsdom` for the iteration-5 component test), `prettier`.

- Commit `package-lock.json`. If npm resolves a newer **patch** of any pinned package, accept it; do not take new minors/majors.

### 1.3 Configure quality tooling and scripts

- ESLint: `eslint-config-next` 16.x flat config. Prettier with default config + `.prettierignore` (`data/`, `drizzle/`, `playwright-report/`, `.next/`).
- Add the scripts table from architecture §7.2 to `package.json`:
  - `dev`, `build`, `start` (Next defaults)
  - `db:migrate` → `tsx src/lib/db/migrate.ts`
  - `db:seed` → `tsx src/lib/seed.ts`
  - `test` → `vitest run`
  - `test:e2e` → `playwright test`
  - `check` → `tsc --noEmit && eslint . && prettier --check . && vitest run`

### 1.4 Drizzle schema and migrations

- `drizzle.config.ts`: sqlite dialect, schema at `src/lib/db/schema.ts`, out dir `drizzle/`.
- `src/lib/db/schema.ts`: the `articles` table exactly as written in architecture §4.2 (id autoincrement PK, title, content, createdAt, updatedAt as integers; export `Article` / `NewArticle` inferred types).
- Generate `drizzle/0000_init.sql` with `drizzle-kit generate`, then append the FTS5 virtual table + three sync triggers via `drizzle-kit generate --custom`, copying the SQL verbatim from architecture §11 (`articles_fts` with `content='articles'`, `content_rowid='id'`, `tokenize='porter unicode61'`; triggers `articles_ai`, `articles_ad`, `articles_au`).
- Commit the `drizzle/` directory.

### 1.5 Database client singleton and migration runner

- `src/lib/db/client.ts`: lazily-created singleton `better-sqlite3` connection.
  - DB path from `process.env.DATABASE_PATH`, default `data/kb.sqlite`; support `:memory:` for tests.
  - On open: `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;`.
  - Auto-run Drizzle `migrate()` (folder `drizzle/`) on first open — idempotent, journal-tracked.
- `src/lib/db/migrate.ts`: standalone entry that opens the client (which migrates) and exits; this is what `npm run db:migrate` runs.
- Create `data/.gitkeep`; gitignore `data/*.sqlite*` (and WAL/SHM sidecars).

### 1.6 Seed script and sample content

- `src/lib/seed.ts`: inserts **12 realistic internal-KB articles** (e.g., "Deploy checklist", "Onboarding guide", "Incident response runbook", "VPN setup", plus 8 more in that register) **only if the `articles` table is empty**. Content is genuine multi-paragraph Markdown exercising headings, lists, a GFM table, inline code, and a code block — this content doubles as demo data and search-test fodder.
- Spread `createdAt`/`updatedAt` values across the past ~60 days so the home list's relative times look real.
- Runnable repeatedly without duplication: `npm run db:seed` twice leaves 12 rows.

### 1.7 Test harness configuration (config only — specs come later)

- `vitest.config.ts`: node environment by default; include `src/**/*.test.ts(x)`; a separate jsdom environment will be selected per-file (`// @vitest-environment jsdom`) for the iteration-5 component test.
- `playwright.config.ts` per architecture §8.2: Chromium only, `reporter: 'html'`, `webServer: { command: "npm run build && npm run start", port: 3000, env: { DATABASE_PATH: "data/kb-e2e.sqlite" } }`. Leave `e2e/` with an empty `.gitkeep` (specs land in iteration 6).
- Add one trivial smoke unit test (e.g., open `:memory:` DB, run migrations, assert `articles` and `articles_fts` tables exist) so `npm run check` exercises the whole chain.

### 1.8 Developer docs and environment

- `README.md`: prereqs (Node 24.x, npm 10+) and the exact run steps from architecture §9 (`npm install` → `npm run db:seed` → `npm run dev`), test commands, and the "reset the world" note (delete `data/kb.sqlite`, reseed).
- `.env.example` with `DATABASE_PATH=data/kb.sqlite` and `PORT=3000` (both optional), committed.

---

## Iteration-specific notes

- **Sequencing within the iteration:** 1.1 → 1.2 → 1.3 can be one pass; 1.4 must precede 1.5 (the client migrates from `drizzle/`); 1.5 must precede 1.6 and 1.7's smoke test.
- The FTS5 migration SQL in architecture §11 is normative — copy it, don't re-derive it. Getting the external-content triggers wrong corrupts search silently; the smoke test's `articles_fts` existence check plus iteration 2's search tests are the safety net.
- Do **not** build any repo functions, API routes, or UI here beyond the placeholder page. Resist pre-work — iteration 2 owns the data layer.

## Definition of done

- `npm install && npm run db:seed && npm run dev` on a clean clone boots http://localhost:3000 (placeholder page) with `data/kb.sqlite` created, migrated, and holding 12 articles.
- `npm run db:seed` a second time does not duplicate rows.
- `npm run check` passes (typecheck, lint, prettier, smoke test).
- Repo tree matches architecture §7.1 for everything that exists so far.

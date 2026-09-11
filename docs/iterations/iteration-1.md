# Iteration 1 — Foundation: repo, toolchain, database, seed

**Goal.** A fresh clone runs `npm install && npm run db:setup && npm run dev`, renders a styled page at `http://localhost:3000`, and `npm run verify` passes. The data layer is real: migrated, FTS5-bootstrapped, seeded, and queryable from a script.

**Scope.** Scaffold, pinned dependencies, all config files, Tailwind tokens, Drizzle schema + migration, database client modules, environment validation, idempotent seed, `db:*` scripts, the `verify` gate, and the CI skeleton.

**Out of scope.** Any React component beyond the shell placeholder, any repository, any route other than the placeholder `/`.

**Reference.** `architecture.md` §3, §5.1, §6.6, §8, §12, §14; `design-spec.md` §8.1.

---

## Tasks

### 1.1 Scaffold the repository and pin the toolchain

Create `package.json` at the repository root (the Next.js app lives at the root — `architecture.md` §5.1) with `"type": "module"`, `engines.node` = `">=24.21.0 <25"`, and **every dependency from `architecture.md` §3.2 and §3.3 pinned to the exact version listed — no `^`, no `~`**.

Include the full `scripts` block from `architecture.md` §12.2 verbatim, including `"postinstall": "playwright install --with-deps chromium webkit"`.

Also create:

- `.nvmrc` containing `24.21.0`
- `.gitignore` covering `node_modules/`, `.next/`, `data/*` with a `!data/.gitkeep` negation, `.env.local`, `playwright-report/`, `test-results/`, `coverage/`, `*.tsbuildinfo`
- `data/.gitkeep`

Then run `npm install`.

> **Do not install `typescript@7.0.2`.** `typescript-eslint@8.70.0` declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"` and npm 11 fails resolution. Pin `typescript@6.0.3` (`architecture.md` §3.3, D13).

**Done when:** `node -v` reports 24.21.x, `npm ls typescript` reports 6.0.3, and `node -e "const D=require('better-sqlite3');const d=new D(':memory:');console.log(d.pragma('compile_options').length)"` runs without a native build error.

---

### 1.2 Configure TypeScript, ESLint, Prettier, PostCSS, and Next.js

Create the four config files.

- **`tsconfig.json`** — `"strict": true`, `"target": "ES2022"`, `"module": "esnext"`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`, `"noEmit": true`, `"incremental": true`, and the `paths` alias `"@/*": ["./src/*"]`. Include the Next.js plugin entry.
- **`eslint.config.mjs`** — ESLint 10 flat config extending `eslint-config-next`. **`next lint` was removed in Next.js 16**, so the script is `eslint .` (`architecture.md` §3.4). Add a `no-restricted-imports` rule that fails the build when `drizzle-orm` or `better-sqlite3` is imported outside `src/server/db/**` and `src/server/repositories/**` (this is the structural rule from §4, item 1, and it is what enforces the `server-only` boundary given D26).
- **`prettier.config.mjs`** — print width 100, single quotes, trailing commas `all`, semicolons on, and the `prettier-plugin-tailwindcss` plugin.
- **`postcss.config.mjs`** — exactly `export default { plugins: { '@tailwindcss/postcss': {} } };`
- **`next.config.ts`** — copy the `nextConfig` object from `architecture.md` §12.6 verbatim, including `reactStrictMode: true`, `serverExternalPackages: ['better-sqlite3', 'pino', 'pino-pretty']`, the five security headers, and the CSP. Leave `cacheComponents` **off** (D14).

**Done when:** `npx tsc --noEmit` succeeds (with no source files yet, it must not error), and `npx eslint .` runs and reports no configuration errors.

---

### 1.3 Implement the Tailwind v4 token system and the root shell

Create `src/app/globals.css` containing the **complete token block from `design-spec.md` §8.1, copied verbatim** — the `@import "tailwindcss"`, the `@plugin "@tailwindcss/typography"`, the `@custom-variant dark`, the full `@theme { … }` block, the full `.dark { … }` block, and the `@layer base { … }` block including the `prefers-reduced-motion` collapse.

**There is no `tailwind.config.js` and there must never be one** (`design-spec.md` §10.6 rule 1). Every theme token is a CSS custom property.

Then create:

- **`src/app/layout.tsx`** — the root RSC layout. Renders `<html lang="en" suppressHydrationWarning>` with `<body>`; sets `metadata.title` from `NEXT_PUBLIC_APP_NAME`; wraps children in `ThemeProvider` from `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; renders `<SkipLink />` as the first focusable element and `<main id="main" tabIndex={-1}>`. Import `globals.css`.
- **`src/app/page.tsx`** — a temporary RSC that renders `<h1 className="text-3xl font-semibold text-ink">Knowledge Base</h1>` and a paragraph using `text-ink-muted`. This file is replaced in iteration 4.
- **`src/components/layout/skip-link.tsx`** — an `<a href="#main">` with copy `Skip to content`, visually hidden until focused (`sr-only focus:not-sr-only focus:absolute focus:z-50 …`).
- **`src/components/layout/theme-provider.tsx`** — a `'use client'` thin wrapper re-exporting `next-themes`' `ThemeProvider` (the provider itself is a client component, so it cannot be used directly from an RSC).

**Done when:** `npm run dev` renders the page, `bg-surface`, `text-ink`, `text-ink-muted`, and `rounded-card` all resolve to real values in devtools, and toggling the `dark` class on `<html>` visibly changes the surface and ink colors.

---

### 1.4 Add environment validation

Create `src/lib/env.ts` with the exact Zod schema from `architecture.md` §12.3 (`DATABASE_FILE`, `LOG_LEVEL`, `E2E_TEST_MODE`, `NODE_ENV`), exported as `env`.

> **This file must NOT begin with `import 'server-only'`.** It is loaded directly by `tsx` scripts and by Vitest, which do not set the `react-server` export condition (`architecture.md` §4 rule 5, D26).

Create `.env.example` with the four variables from §12.3 verbatim, and copy it to `.env.local` for local development (`.env.local` is gitignored).

**Done when:** `npx tsx -e "import {env} from './src/lib/env'; console.log(env.DATABASE_FILE)"` prints `./data/kb.db`, and setting `LOG_LEVEL=bogus` in `.env.local` makes it throw a Zod error naming the field.

---

### 1.5 Define the Drizzle schema and produce the initial migration

Create `src/server/db/schema.ts` containing the **exact schema from `architecture.md` §8.3** — the `timestamp` helper, `categories` (with the `lower(name)` expression unique index), `ARTICLE_STATUSES`, `articles` (with all four indexes including `articles_status_updated_idx` and `articles_category_idx`), and `articleRevisions` (with both indexes and `ON DELETE cascade`).

Create `drizzle.config.ts` from `architecture.md` §8.5 verbatim (`dialect: 'sqlite'`, `strict: true`, `verbose: true`).

Run `npm run db:generate` to produce `drizzle/0000_init.sql` and `drizzle/meta/`.

Then, **before applying the migration for the first time**:

1. Hand-edit `drizzle/0000_init.sql` so the `status` column reads `` `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','published','archived')) `` — SQLite cannot add a `CHECK` to an existing table without a rebuild (`architecture.md` §8.5 `[DECISION]`).
2. Add `drizzle/0001_article_constraints.sql` containing `CREATE INDEX \`articles_title_idx\` ON \`articles\` (\`title\` COLLATE NOCASE);`.
3. Run `npm run db:generate` once more so `drizzle/meta/0000_snapshot.json` matches the hand-edited SQL.

**Done when:** the generated SQL matches `architecture.md` §8.5 line for line (including `ON DELETE set null` and `ON DELETE cascade`), the `lower("name")` expression index is present, and both migration files are committed.

---

### 1.6 Implement the database client modules and the FTS5 bootstrap

Create six modules under `src/server/db/`. The `server-only` placement is exact and is not negotiable:

| File | `import 'server-only'`? | Contents |
|---|---|---|
| `create.ts` | **No** | `createDatabase(file)` — opens `better-sqlite3`, sets the five PRAGMAs from `architecture.md` §8.4 (`journal_mode = WAL`, `foreign_keys = ON`, `synchronous = NORMAL`, `busy_timeout = 5000`, `cache_size = -32000`), returns `{ sqlite, db: drizzle(sqlite, { schema }) }`. Export `type Database`. |
| `current.ts` | **No** | `getDb()` / `setDb(db)` seam (`architecture.md` §8.1). `getDb()` throws a clear error when unset. |
| `client.ts` | **Yes** | The process-wide singleton. Uses the `globalForDb.__kbDb ??=` pattern so Next.js dev HMR does not open a second handle, then calls `setDb(connection.db)`. |
| `search-index-ddl.ts` | **No** | `export const FTS5_DDL` — the exact DDL constant from `architecture.md` §8.6: the external-content virtual table plus the three triggers (`articles_search_ai`, `articles_search_ad`, `articles_search_au`). Zero imports. |
| `search-index.ts` | **Yes** | `ensureSearchIndex({ rebuild })` — runs `db.run(sql.raw(FTS5_DDL))` and, when `rebuild` is true, `INSERT INTO article_search(article_search) VALUES ('rebuild')`. Re-exports `FTS5_DDL`. |
| `migrate.ts` | **Yes** | `runMigrations({ rebuildSearch })` — `migrate(db, { migrationsFolder: './drizzle' })` then `ensureSearchIndex({ rebuild: rebuildSearch })`. |

Also create **`src/instrumentation.ts`** with the `register()` function from `architecture.md` §8.6 verbatim: it returns early unless `process.env.NEXT_RUNTIME === 'nodejs'`, then dynamically imports and calls `runMigrations()`.

**Why the `('delete', …)` trigger form matters.** For an external-content FTS5 table, a plain `DELETE FROM article_search` corrupts the index. All three triggers must use the exact form in §8.6.

**Done when:** `npx tsx -e "import {createDatabase} from './src/server/db/create'; import {FTS5_DDL} from './src/server/db/search-index-ddl'; const {sqlite}=createDatabase(':memory:'); sqlite.exec(FTS5_DDL); console.log(sqlite.prepare(\"select count(*) c from sqlite_master where name like 'articles_search%'\").get())"` prints `{ c: 4 }` (the virtual table plus three triggers).

---

### 1.7 Write the idempotent seed content

Create `src/server/db/seed.ts` exporting `seed(db)`.

> **No `import 'server-only'`** — this module is imported by `scripts/seed.ts` and by tests (`architecture.md` §4 rule 5).

The function must be **idempotent**: delete and re-insert a fixed dataset keyed by slug, so `npm run db:seed` is safe to re-run.

Seed exactly the dataset `architecture.md` §14.2 specifies:

- **4 categories**: `Engineering`, `Product`, `People`, `Operations` — each with a short description.
- **9 articles**: 7 `published` + 2 `draft`, with **stable titles** (Playwright asserts on them in iteration 7).
- At least one article must satisfy all three of:
  - contain the word **`deploy`** in its **title** (this is the deterministic top hit for `search.spec.ts`; `architecture.md` §12.4 expects exactly **3** results for `deploy`),
  - contain a fenced code block, a GFM table, and a task list (exercises the Markdown rendering pipeline),
  - have **2+ revisions** (so the History UI has content in iteration 6).
- At least one article must have `category_id = NULL` (so the `Uncategorized` sidebar row has a count).
- Article `summary` values are set for some and left `NULL` for at least one (so the card's excerpt fallback is exercised).

Because the FTS triggers are `AFTER INSERT`/`AFTER UPDATE` on `articles`, inserting through Drizzle automatically indexes the content. Do not write to `article_search` directly.

**Done when:** `npm run db:seed` twice in a row leaves exactly 4 categories and 9 articles (verify with `sqlite3` or Drizzle Studio), and `SELECT count(*) FROM article_search` returns 9.

---

### 1.8 Add the database setup, seed, and backup scripts

Create `scripts/db-setup.ts` matching `architecture.md` §14.1 — flags `--fresh`, `--reindex`, `--check`, `--seed`; `mkdirSync(dirname(file), { recursive: true })`; uses `createDatabase` from `src/server/db/create.ts` (**not** `client.ts`); drops `article_search`, `article_revisions`, `articles`, `categories`, `__drizzle_migrations` on `--fresh`; runs `migrate` then `sqlite.exec(FTS5_DDL)`; runs the integrity + foreign-key checks on `--check` and exits non-zero on failure.

Create `scripts/backup.ts` — `VACUUM INTO './data/backups/kb-<ISO>.db'`, creating the directory first.

Create `scripts/seed.ts` — loads `dotenv/config`, creates the database with `createDatabase`, and calls `seed(db)`.

**Done when:** `npm run db:setup` prints "Database ready", `npm run db:check` prints `integrity_check: ok` and `foreign_key_check: clean` and exits 0, and `npm run db:reset` followed by `npm run db:setup` both succeed.

---

### 1.9 Wire the `verify` gate and the CI skeleton

Confirm `npm run verify` runs the exact chain from `architecture.md` §12.2: `typecheck && lint && format:check && test:run && build`.

Create `.github/workflows/ci.yml` from `architecture.md` §12.7 verbatim — checkout → setup-node 24.21.0 with npm cache → `npm ci` → typecheck → lint → format:check → `test:run -- --coverage` → build with `DATABASE_FILE=./data/kb.ci.db` → `db:migrate` with the same variable → `playwright install --with-deps chromium webkit` → `test:e2e` → upload the Playwright report artifact.

> `test:run` will report "no test files found" at this point. Create `src/test/setup.ts` from `architecture.md` §11.2 (the `vi.mock('server-only', () => ({}))` alias plus `@testing-library/jest-dom/vitest`) and `vitest.config.ts` from §11.2 (the two-project `node`/`components` split with `extends: true`), and add a single placeholder test in `src/lib/` so the gate is meaningful from iteration 1 onward. Iteration 2 replaces the placeholder with the real suite.

Create `.github/pull_request_template.md` with the five questions from `architecture.md` §5.3 item 5.

**Done when:** `npm run verify` exits 0 locally, and the workflow file is syntactically valid YAML.

---

## Iteration notes

**Sequencing.** 1.1 → 1.2 → 1.3 → 1.4 are independent of each other after 1.1 and can be done in any order. 1.5 must precede 1.6 (the client imports the schema) and 1.7 (the seed inserts into the tables). 1.8 depends on 1.5–1.7. 1.9 depends on everything.

**The one irreversible mistake to avoid.** If you run `npm run db:migrate` before hand-editing the `CHECK` into `0000_init.sql`, adding it later requires a table rebuild. Delete `data/kb.db` and the `drizzle/` folder and regenerate if this happens in iteration 1 — it is free now and expensive later.

**Files created by the framework.** Next.js 16.3+ may auto-generate `AGENTS.md` and `CLAUDE.md` on first `next dev`. **Commit both** (`architecture.md` §5.3 item 7) so the working tree stays clean.

**Not in this iteration.** No repositories, no `src/test/db.ts`, no domain types, no Zod payload schemas beyond `env.ts`, no components beyond the shell placeholder. Those are iterations 2 and 3.

---

## Definition of done

- [ ] `npm install` completes on a clean clone with no native-build step and no peer-resolution error.
- [ ] `npm run db:setup` creates `./data/kb.db`, applies both migrations, bootstraps FTS5, and seeds 4 categories + 9 articles.
- [ ] `npm run db:check` reports `integrity_check: ok` and `foreign_key_check: clean`.
- [ ] `npm run db:seed` run twice leaves the dataset unchanged.
- [ ] `SELECT count(*) FROM article_search` returns 9.
- [ ] `npm run dev` renders a styled page using `--color-surface` / `--color-ink` tokens, and dark mode works.
- [ ] `npm run verify` exits 0.
- [ ] `data/` is gitignored except `.gitkeep`; `.env.local` is not committed.
- [ ] Committed: `package.json`, all config files, `drizzle/**`, `src/server/db/**`, `src/lib/env.ts`, `src/instrumentation.ts`, `scripts/**`, `src/app/{layout,page,globals.css}`, `.github/workflows/ci.yml`, `AGENTS.md`.

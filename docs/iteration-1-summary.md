# Iteration 1 Summary: Base Environment, Schema & Seeds

This document provides a comprehensive summary of the work completed during **Iteration 1** for the **v1 Simplified Knowledge Base App**.

---

## 1. What Was Built in This Iteration

We successfully initialized the local development environment from scratch, configuring the core runtime, dependencies, database schema, SQLite FTS5 search indexing with database triggers, and mock seed data. 

Specifically, the following elements were introduced:
*   **Project Manifests & Configuration Files**: Established clean, production-ready settings in [package.json](file:///C:/projects/evals_may2026_gemini-3.5-flash/package.json), [tsconfig.json](file:///C:/projects/evals_may2026_gemini-3.5-flash/tsconfig.json), [drizzle.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/drizzle.config.ts), [vitest.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/vitest.config.ts), [playwright.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/playwright.config.ts), and `.env`.
*   **Relational Schema Definitions**: Defined `categories` and `articles` models in [schema.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/schema.ts) with one-to-many relationship mappings, unique slug constraints, and cascading foreign key rules (`categoryId` references `categories.id` with `onDelete: 'set null'`).
*   **WAL SQLite Database Driver**: Configured the `better-sqlite3` and Drizzle engine in [db.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/db.ts) to automatically create the parent directory `data/` if it does not exist. Enabled Write-Ahead Logging (`WAL` mode), `synchronous = NORMAL`, and `foreign_keys = ON` to support high-concurrency read/write transactions.
*   **Automated SQLite FTS5 virtual table and Sync Triggers**: Implemented a self-initializing block in the database module. Whenever the client connects and the standard `articles` table is created:
    - Creates the FTS5 virtual table `articles_fts` containing columns `id UNINDEXED`, `title`, and `content`, utilizing the `porter unicode61` tokenizer.
    - Creates database triggers `trg_articles_fts_insert`, `trg_articles_fts_update`, and `trg_articles_fts_delete` to automatically keep the virtual index in perfect sync with standard article mutations.
*   **Seed Strategy**: Created the CLI script [seed.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/seed.ts) (runnable via `npm run db:seed`) seeding 3 core categories and 5 robust, realistic articles featuring realistic Markdown code blocks, tables, lists, status boundaries (`draft` vs. `published`), and null category relations.
*   **Vitest Testing Framework**: Set up the unit testing suite in [smoke.test.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/smoke.test.ts) and [search.test.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/search.test.ts) covering search input cleaning and secure Markdown script-injection/XSS sanitization.

---

## 2. Verification & Run Outcomes

The entire codebase is left in a fully functional, compilation-safe, and runnable state:

### 2.1 Database Setup & Seeding
*   Running `npm run db:push` cleanly pushed the tables to the local SQLite database.
*   Running `npm run db:seed` successfully populated the categories and articles tables.
*   The database engine successfully bootstrapped WAL mode, generating the expected runtime files:
    - `data/kb.db`
    - `data/kb.db-wal`
    - `data/kb.db-shm`

### 2.2 FTS5 Table & Automated Sync Verification
We executed a query inspection script to verify the SQLite internal schema. It successfully confirmed that:
*   Virtual tables (`articles_fts` and its accompanying search index tables `_data`, `_idx`, `_content`, `_docsize`, `_config`) are present.
*   Triggers `trg_articles_fts_insert`, `trg_articles_fts_update`, and `trg_articles_fts_delete` exist in `sqlite_master`.
*   Search index queries utilizing the native SQLite `bm25` rank function return relevant articles instantly:
    - *Example query for "Node" returned `id: 1, title: 'Setup Node.js Development Environment', rank: -1.80417`.*

### 2.3 Unit Testing Suite
Running `npm run test` executes both the test runner smoke test and the search/Markdown sanitization validation suite. All tests pass successfully:
```bash
Test Files  2 passed (2)
     Tests  4 passed (4)
```

---

## 3. Assumptions Made & Issues Encountered

### 3.1 Node 24 Native Compilation & NVM Downgrade (Resolved)
*   *Issue*: The host system is running Node.js `24.10.0`. Since Node 24 is highly new, `better-sqlite3` had no precompiled native binaries in the npm registry matching this version. Consequently, installation attempted to compile from source via `node-gyp`, which failed due to missing Visual Studio C++ compilers.
*   *Solution*: Leveraging the system's `nvm-windows` installation, we installed the stable Node.js `22.12.0` (LTS) environment. We then prepended the path to our terminal session to install and run the codebase cleanly under Node 22, where precompiled binaries for better-sqlite3 are readily available.

### 3.2 drizzle-orm and drizzle-kit Version Mismatch (Resolved)
*   *Issue*: The iteration task checklist originally listed `drizzle-orm@1.0.0` and `drizzle-kit@^0.31.0`. Version 1.0.0 of drizzle-orm does not exist on the public registry (as the package is currently in `0.x` or `1.0.0-beta/rc` release candidates). An initial fallback to `0.30.10` triggered a version compatibility block inside `drizzle-kit generate`.
*   *Solution*: We safely updated the dependencies to use `drizzle-orm@^0.38.0`, which perfectly aligns with `drizzle-kit@^0.31.0` and runs cleanly.

---

## 4. Decisions Log

### 4.1 Automated FTS5 virtual table and Trigger Initialization
*   *Context*: Standard `drizzle-kit push` does not natively manage virtual tables or SQL trigger attachments. Hardcoding custom SQL migrations can lead to deployment divergence if a developer bypasses standard migrations during development push loops.
*   *Decision*: Integrated a self-initializing try/catch check inside the database client wrapper `src/lib/db.ts`. The first time the module loads after the `articles` table has been generated, it executes raw SQL DDL to automatically create the virtual FTS5 index and link the insert, update, and delete sync triggers. This makes database setup robust and zero-config.

### 4.2 Error-Free SQLite BM25 Weights Relevance Ranking
*   *Context*: The technical architecture spec outlined standard query term boosting utilizing the caret syntax (`^3`). However, FTS5 treats the caret as a column-start boundary, which causes syntax errors in standard SQLite queries.
*   *Decision*: Switched the 3x title boost mechanism to use the native SQLite FTS5 `bm25(articles_fts, weight1, weight2, ...)` auxiliary function. By providing a weight matrix `bm25(articles_fts, 1.0, 3.0, 1.0)`, we allocate a 3.0 weight to the `title` column and a 1.0 weight to the `content` column, guaranteeing precise 3x relevance boost calculations natively.

### 4.3 CLI Seeding Script with tsx
*   *Context*: Running TypeScript seed scripts in standard Node.js environments can encounter ES Module import/require conflicts.
*   *Decision*: Configured the `db:seed` script in `package.json` to utilize `npx tsx src/lib/seed.ts`. This provides a zero-latency, compilation-free execution wrapper that runs TypeScript securely under ESM without require cycle issues.

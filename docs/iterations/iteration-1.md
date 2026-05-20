# Iteration 1: Base Environment, Schema & Seeds

## Goal & Scope
Establish the local development workspace from scratch. Configure the core runtime files, install pinned stable versions of dependencies, initialize a WAL-enabled SQLite database using Drizzle ORM, establish the FTS5 virtual search index with automatic database triggers, and seed the schema with mock documents.

At the end of this iteration, the workspace must be in a runnable state with a populated local database file, a running dev server skeleton, and a verified test configuration.

---

## Task Checklist

### 1. Base Workspace Configuration
- [ ] **Create Project Manifests & Configuration Files**:
  Configure standard Next.js, Drizzle, TypeScript, and testing config files in the project root:
  - Create [package.json](file:///C:/projects/evals_may2026_gemini-3.5-flash/package.json) with script definitions.
  - Create [tsconfig.json](file:///C:/projects/evals_may2026_gemini-3.5-flash/tsconfig.json) supporting React 19 / Next.js 16 requirements.
  - Create [drizzle.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/drizzle.config.ts) pointing to SQLite database path and schema locations.
  - Create [vitest.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/vitest.config.ts) and [playwright.config.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/playwright.config.ts).
  - Create [.env.example](file:///C:/projects/evals_may2026_gemini-3.5-flash/.env.example) and copy it to `.env` declaring `DATABASE_URL="data/kb.db"`, `PORT=3000`, and `NODE_ENV="development"`.

### 2. Dependency Management
- [ ] **Install Pinned Production & Developer Packages**:
  Install exact library versions specified in the architecture specification to guarantee stability and prevent version drift:
  - **Dependencies**: `next@16.2.6`, `react@19.2.6`, `react-dom@19.2.6`, `better-sqlite3@^11.0.0`, `drizzle-orm@1.0.0`, `marked@18.0.3`, `isomorphic-dompurify@^2.20.0`, `zod@^3.23.0`
  - **DevDependencies**: `typescript`, `drizzle-kit@^0.31.0`, `@types/better-sqlite3`, `vitest@4.1.6`, `@testing-library/react@16.3.2`, `@playwright/test@1.60.0`

### 3. Relational Schema & WAL Database Client
- [ ] **Define Relational Schema Models**:
  Implement Drizzle SQLite schema models inside [src/lib/schema.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/schema.ts):
  - Model `categories`: Autoincrementing ID, unique name, unique slug, description, and createdAt timestamp.
  - Model `articles`: Autoincrementing ID, title, unique slug, content (markdown), status (`draft` / `published`), categoryId referencing categories (with `onDelete: 'set null'`), createdAt and updatedAt timestamps.
  - Define relations: Category has many Articles, Article has one Category.
- [ ] **Configure the WAL Database Driver**:
  Create the SQLite engine builder in [src/lib/db.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/db.ts):
  - Ensure the `better-sqlite3` instance creates directories automatically.
  - Execute database `PRAGMA` settings to enable high-concurrency WAL mode:
    ```typescript
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('foreign_keys = ON');
    ```
  - Export a configured Drizzle DB client instance.

### 4. SQLite FTS5 Indexing & Triggers
- [ ] **Initialize Database Migrations**:
  Generate base migrations via Drizzle Kit (`npx drizzle-kit generate` or equivalent).
- [ ] **Implement FTS5 & Automatic Index Sync Triggers**:
  Create custom SQL migration scripts or write raw SQLite DDL executions to declare search configurations:
  - Create virtual FTS5 table `articles_fts` containing columns `id UNINDEXED`, `title`, and `content`, utilizing the `porter unicode61` tokenizer.
  - Create database trigger `trg_articles_fts_insert` executing `AFTER INSERT ON articles` to write new titles/contents directly to `articles_fts`.
  - Create database trigger `trg_articles_fts_update` executing `AFTER UPDATE ON articles` to sync modified text on match index.
  - Create database trigger `trg_articles_fts_delete` executing `AFTER DELETE ON articles` to scrub deleted articles from `articles_fts`.

### 5. Seeding Strategy
- [ ] **Write Database Seeder File**:
  Create a CLI seeder script in [src/lib/seed.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/seed.ts) to populate workspace content for visual and functional QA:
  - Seed 3 base categories: `Engineering` (slug: `engineering`), `Product` (slug: `product`), and `Operations` (slug: `operations`).
  - Seed 5 robust, realistic articles:
    - *Article 1 (Engineering, Published)*: Setup guidelines featuring markdown bullet points, tables, and backticked code.
    - *Article 2 (Engineering, Published)*: Architecture summary.
    - *Article 3 (Product, Published)*: Roadmap review.
    - *Article 4 (Product, Draft)*: A draft document verifying status separations.
    - *Article 5 (Uncategorized, Published)*: An article with `categoryId = null` to verify uncategorized query channels.
  - Expose CLI command `npm run db:seed` in `package.json`.

---

## Verification & QA Checkpoints

### 1. Database & Migrations Smoke Test
- Run push scripts and populate seed data:
  ```bash
  npm run db:push
  npm run db:seed
  ```
- Verify the creation of `data/kb.db` along with accompanying `kb.db-wal` and `kb.db-shm` files.
- Run `npm run db:studio` (Drizzle Studio) to visually confirm the existence of mock rows in categories and articles tables.

### 2. Testing Framework Smoke Test
- Write a basic unit test [src/lib/smoke.test.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/smoke.test.ts) asserting standard math or Vitest settings:
  ```typescript
  import { describe, it, expect } from 'vitest';
  describe('Vitest Setup', () => {
    it('should correctly execute assertions', () => {
      expect(1 + 1).toBe(2);
    });
  });
  ```
- Execute `npm run test` and verify that the test runner succeeds.

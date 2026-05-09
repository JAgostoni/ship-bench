# Iteration 1: Environment & Foundation

**Goal:** Establish a fully working local development environment, repository structure, database schema, seed data, and all base configuration needed for subsequent iterations.

**Scope:** MVP foundation — everything in this iteration is required.

---

## Task 1.1: Scaffold Next.js Project

**File:** `package.json`, `next.config.ts`, `tsconfig.json`

Create a new Next.js 16 project using the App Router with TypeScript 6. Tailwind CSS v4 configuration. Install all dependencies:

```
npx create-next-app@latest knowledge-base --typescript --tailwind --eslint --app --src-dir
```

Then install additional packages:

```
npm install prisma@7.8.0 @prisma/client@7.8.0
npm install better-sqlite3@12.9.0
npm install -D @types/better-sqlite3
npm install react-markdown@10.1.0 remark-gfm@4.0.1
npm install zod@4.4.3
npm install lucide-react@1.14.0
npm install clsx@2.1.1
npm install -D vitest@4.1.5 @vitejs/plugin-react
npm install -D @playwright/test@1.59.1
npm install -D tsx  (for running seed script)
```

**What to verify:**
- `npm run dev` starts at http://localhost:3000
- TypeScript compiles without errors
- Tailwind classes work in a test component
- All package versions match what's listed above (the architecture spec versions were verified at time of writing)

---

## Task 1.2: Configure Build & Test Tooling

**Files:** `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json` path aliases

- Configure `next.config.ts` with the Tailwind CSS v4 Vite plugin
- Set up path alias `@/` → `./src/` in tsconfig.json
- Configure `vitest.config.ts` with globals, node environment, and `@/` alias resolution
- Configure `playwright.config.ts` with:
  - Test directory: `./e2e`
  - Web server: `npm run dev` at `http://localhost:3000`
  - `reuseExistingServer: !process.env.CI`
  - Base URL: `http://localhost:3000`

**What to verify:**
- `npx vitest run` executes (even if no tests yet)
- `npx playwright test --list` shows the test file structure
- IDE resolves `@/` imports

---

## Task 1.3: Create Prisma Schema & Migrations

**Files:** `prisma/schema.prisma`, migration files in `prisma/migrations/`

Define the following in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  slug        String    @unique
  description String?
  articles    Article[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Article {
  id         Int       @id @default(autoincrement())
  title      String
  slug       String    @unique
  content    String
  excerpt    String?
  status     String    @default("draft")
  categoryId Int?
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

Run `npx prisma migrate dev --name init` to create the initial migration.

Then create a **second migration** for FTS5. Create it manually as `npx prisma migrate dev --create-only --name add_fts`, then edit the generated migration.sql to add:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(
  title, content, content=Article, content_rowid=id
);

INSERT INTO article_fts(rowid, title, content)
  SELECT id, title, content FROM Article;

CREATE TRIGGER article_fts_insert AFTER INSERT ON Article BEGIN
  INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER article_fts_delete AFTER DELETE ON Article BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER article_fts_update AFTER UPDATE ON Article BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  INSERT INTO article_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
```

Run `npx prisma migrate dev` to apply it.

**What to verify:**
- `npx prisma generate` succeeds
- `prisma/dev.db` file exists
- `npx prisma studio` opens and shows empty Category and Article tables

---

## Task 1.4: Create Seed Script

**File:** `prisma/seed.ts`

Create a seed script that populates the database with sample data:

- 3 categories: "Guides" (slug: `guides`), "Reference" (slug: `reference`), "Policies" (slug: `policies`)
- 4 articles:
  1. "Getting Started with the Knowledge Base" — published, Guides category, substantive Markdown content
  2. "Development Environment Setup" — published, Guides category
  3. "API Reference" — published, Reference category, includes a Markdown table
  4. "Code Review Guidelines" — draft, Policies category

Each article must include a pre-computed excerpt (first ~200 chars of content, Markdown stripped).

Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Add scripts to `package.json`:
```json
"db:migrate": "prisma migrate dev",
"db:studio": "prisma studio",
"db:seed": "prisma db seed",
"db:reset": "prisma migrate reset"
```

**What to verify:**
- `npx prisma db seed` runs without errors
- Database contains 3 categories and 4 articles
- One article has status `draft`, three have `published`
- FTS5 index is populated (searchable via `npx prisma studio` or raw query)

---

## Task 1.5: Configure Design Tokens & Global Styles

**File:** `src/app/globals.css`

Set up Tailwind CSS v4 with the `@tailwindcss/vite` plugin in `next.config.ts`. In `globals.css`:

- Import Tailwind v4: `@import "tailwindcss";`
- Add `@plugin "@tailwindcss/typography";` for prose styles
- Define CSS custom properties under `@layer base`:
  - Font stacks (`--font-sans`, `--font-mono`)
  - Spacing tokens (`--sidebar-width: 260px`, `--header-height: 64px`, `--header-height-mobile: 56px`, `--content-max-width: 960px`)
  - Transition durations (`--transition-fast: 150ms`, `--transition-normal: 200ms`)
  - Z-index scale (`--z-header: 30`, `--z-sidebar-backdrop: 40`, `--z-sidebar-drawer: 50`, `--z-skip-link: 60`)
- Set focus ring defaults: `* { @apply focus:outline-none; }` so components use `focus-visible:ring-2` pattern
- Set base body styles: system font stack, `text-neutral-900`, `bg-white`, `antialiased`

**What to verify:**
- Tailwind classes work in a test page component
- Typography prose plugin renders correctly
- CSS variables are accessible in browser DevTools
- No build warnings

---

## Task 1.6: Create Prisma Client Singleton & Zod Validators

**Files:** `src/lib/prisma.ts`, `src/lib/validators.ts`

**prisma.ts:** Prisma client singleton following Next.js best practices (prevent multiple instances in development due to HMR):

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**validators.ts:** Zod schemas:

- `articleCreateSchema`: title (1-200 chars, required), content (1-100000 chars, required), categoryId (optional number), status (`"draft"` | `"published"`, defaults to `"draft"`)
- `articleUpdateSchema`: Same fields but all optional (partial update)
- `categorySchema`: name (1-100 chars, required), slug (auto-generated from name pattern), description (optional string)
- Export inferred TypeScript types from schemas

**What to verify:**
- Prisma client imports without error
- Zod schemas parse valid data and reject invalid data
- TypeScript types are correctly inferred

---

## Task 1.7: Create CI Workflow

**File:** `.github/workflows/ci.yml`

Workflow with these jobs:
1. **Lint:** `npm run lint`
2. **Type check:** `npx tsc --noEmit`
3. **Unit tests:** `npm run test` (vitest run)
4. **Build:** `npm run build`

Trigger on `push` to `main` and pull requests. Use `actions/setup-node@v4` with Node.js 20.x. Cache npm dependencies.

**What to verify:**
- CI workflow file is valid YAML
- Workflow passes when pushed (lint, type-check, build all succeed with the scaffold)

---

## Iteration 1 Completion Checklist

- [ ] `npm run dev` starts and renders the default Next.js page
- [ ] `npx prisma studio` shows populated Category and Article tables
- [ ] `npx prisma db seed` completes without errors
- [ ] `npm run build` compiles without errors
- [ ] `npm run test` runs Vitest (no tests yet, but runner works)
- [ ] `npm run lint` passes
- [ ] Playwright config is valid
- [ ] All package versions match architecture spec
- [ ] CI workflow file is present and valid

---

## Iteration-Specific Notes

- This is the **only iteration that creates configuration and setup files**. All subsequent iterations add feature code on top of this foundation.
- The Prisma schema includes **both MVP and stretch models** (Article with status, Category). This is intentional — the data model supports all features; stretch features are gated at the application layer.
- Seed data includes both published and draft articles, and articles with and without categories. This provides realistic test data for all features.
- If package version numbers in the architecture spec are outdated at time of implementation, verify latest stable versions via `npm view <package> version` and update accordingly. The brief requires "latest stable libraries."
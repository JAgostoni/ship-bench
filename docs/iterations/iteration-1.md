# Iteration 1 — Project Bootstrap

## Goal

Establish a fully runnable local development environment. After this iteration a developer can start the dev server, run migrations, seed the database, and confirm the app responds at `http://localhost:3000`. No application pages exist yet — this iteration is purely foundational.

## Scope

- Initialize the Next.js 16.2.6 project with App Router and Turbopack
- Install and configure all runtime and dev dependencies at pinned versions
- Configure TypeScript, Tailwind CSS 4.x (CSS-first), and `next.config.ts`
- Set up Docker Compose for the PostgreSQL 18 database container
- Write the Prisma schema with the full data model and initial migration (including GIN index)
- Write the database seed script with default categories and sample articles
- Set up Vitest and Playwright configuration files
- Create environment and developer tooling files (`.env.example`, `package.json` scripts, `.gitignore`)
- Produce the full repo directory structure so all subsequent iterations drop files into known locations

---

## Task List

### 1.1 — Initialize the Next.js project

Run `npx create-next-app@16.2.6` (or equivalent `npm init` + manual setup) with these flags:
- TypeScript: yes
- ESLint: yes
- Tailwind CSS: no (manual setup below — the scaffolder installs Tailwind 3; we need 4)
- App Router: yes
- Turbopack: yes (selected by default in 16.x)
- `src/` directory: yes

Remove any placeholder page content from `src/app/page.tsx` and `src/app/globals.css` — they will be replaced in later iterations.

### 1.2 — Install dependencies

Install all production dependencies at the versions specified in the architecture spec:

```bash
npm install \
  tailwindcss@4.3.0 \
  @tailwindcss/typography \
  @prisma/client@7.4.2 \
  zod@4.5.0 \
  @uiw/react-md-editor@4.1.0 \
  react-markdown \
  remark-gfm \
  slugify \
  lucide-react
```

Install dev dependencies:

```bash
npm install -D \
  prisma@7.4.2 \
  vitest@4.1.6 \
  @vitest/coverage-v8 \
  @playwright/test@1.59.0 \
  tsx \
  @types/node \
  @types/react \
  @types/react-dom
```

After installing `@playwright/test`, run `npx playwright install --with-deps chromium webkit` to install the browser binaries.

### 1.3 — Configure Tailwind CSS 4.x

Replace the generated Tailwind setup with the CSS-first approach:

In `src/app/globals.css`, replace all content with:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

The design token block (CSS custom properties) will be added in iteration 3 when the shell is built. For now this file just bootstraps Tailwind.

In `next.config.ts`, ensure there is no `tailwind.config.js` reference. Tailwind 4 does not require one for basic use.

### 1.4 — Configure TypeScript

Ensure `tsconfig.json` has:
- `"strict": true`
- `"paths": { "@/*": ["./src/*"] }` for the `@/` alias used throughout the codebase
- `"moduleResolution": "bundler"` (required for Next.js 16 + TypeScript 6)
- `"target": "ES2022"` minimum (TypeScript 6 requirement)

### 1.5 — Write `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack is the default dev bundler in Next.js 16; no explicit flag needed
  },
};

export default nextConfig;
```

No additional configuration is needed for v1.

### 1.6 — Create Docker Compose file

Create `docker-compose.yml` at the project root:

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: kb_user
      POSTGRES_PASSWORD: kb_pass
      POSTGRES_DB: knowledge_base
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 1.7 — Create environment files

Create `.env.example`:
```
DATABASE_URL="postgresql://kb_user:kb_pass@localhost:5432/knowledge_base"
NODE_ENV="development"
```

Create `.env` by copying `.env.example`. (`.env` should be in `.gitignore`.)

Update `.gitignore` to include:
```
.env
.env.local
.env.*.local
```

### 1.8 — Initialize Prisma and write the schema

Run `npx prisma init --datasource-provider postgresql`. This creates `prisma/schema.prisma` and updates `.env`.

Replace the generated `prisma/schema.prisma` with the full schema from the architecture spec:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Article {
  id         String    @id @default(cuid())
  title      String
  slug       String    @unique
  content    String
  status     Status    @default(PUBLISHED)
  categoryId String?
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([status])
  @@index([categoryId])
  @@index([updatedAt])
}

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  articles  Article[]
  createdAt DateTime  @default(now())
}

enum Status {
  DRAFT
  PUBLISHED
}
```

### 1.9 — Write the initial migration

Instead of running `prisma migrate dev` to auto-generate the migration (which would miss the GIN index), create the migration file manually:

Create `prisma/migrations/0001_init/migration.sql` with the full DDL from the architecture spec, including:
- `CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED')`
- `CREATE TABLE "Category"` with all columns and constraints
- `CREATE TABLE "Article"` with all columns and constraints
- All `CREATE UNIQUE INDEX` and `CREATE INDEX` statements
- The GIN index: `CREATE INDEX "Article_search_idx" ON "Article" USING GIN (to_tsvector('english', title || ' ' || content))`
- The `ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey"` foreign key

See the architecture spec (§11) for the complete SQL.

After writing the file, run `npx prisma migrate resolve --applied 0001_init` to register the migration as applied without re-running it (since the DB was created from scratch). Then run `npx prisma generate` to generate the Prisma client.

**Alternative**: run `npx prisma migrate dev --name init` and then manually append the GIN index statement to the generated migration file, followed by running the index creation directly against the running DB.

The key requirement: after this task, `npx prisma migrate status` shows 1 migration applied and the `Article_search_idx` GIN index exists in the database.

### 1.10 — Write the seed script

Create `prisma/seed.ts`. The seed must produce:

**Categories (5):**
| name | slug |
|---|---|
| Engineering | engineering |
| Product | product |
| Design | design |
| Operations | operations |
| General | general |

**Articles (6–8 sample articles):** Distribute across categories; include at least:
- 1 DRAFT article (to test the status filter behavior)
- 1 article with no category (to test `categoryId: null`)
- At least 2 articles in "Engineering" (to test category filtering)
- Realistic Markdown content (multi-paragraph, with a heading and a list) so the Markdown renderer can be verified in later iterations

Each article needs a unique slug (use `slugify(title, { lower: true, strict: true })`).

Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run `npm run db:seed` to verify the seed executes without errors.

### 1.11 — Configure package.json scripts

Ensure `package.json` includes all scripts from the architecture spec:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "generate": "prisma generate"
  }
}
```

### 1.12 — Configure Vitest

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### 1.13 — Configure Playwright

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 1.14 — Create the directory scaffold

Create empty placeholder files (or just the directories) for all paths in the repo tree defined in the architecture spec so the structure is visible in git from the start:

```
src/
  app/
    layout.tsx        (placeholder — "export default function RootLayout...")
    page.tsx          (placeholder — "export default function Home() { return null; }")
    globals.css       (from task 1.3)
    articles/
      page.tsx        (placeholder)
      new/page.tsx    (placeholder)
      [slug]/
        page.tsx      (placeholder)
        edit/page.tsx (placeholder)
    api/
      articles/
        route.ts      (placeholder)
        [id]/route.ts (placeholder)
      categories/
        route.ts      (placeholder)
  components/         (empty — files added in iteration 3)
  lib/                (empty — files added in iteration 2)
  actions/            (empty — files added in iteration 5)
  types/
    index.ts          (placeholder — empty export)
tests/
  unit/               (empty)
  e2e/                (empty)
```

Placeholder files should export a minimal valid React component or an empty module so TypeScript does not error on import.

### 1.15 — Verify the bootstrap

Run the full first-time setup sequence and confirm each step succeeds:

```bash
docker compose up -d
npm install
cp .env.example .env     # (if not already done)
npm run db:migrate       # or prisma migrate deploy for the manual migration
npm run generate
npm run db:seed
npm run dev
```

Confirm:
- `http://localhost:3000` responds (200 or redirect — any non-500 response is fine)
- `npx prisma studio` (or a psql query) shows the seeded categories and articles

---

## Iteration Notes

- The GIN index for full-text search must be in the initial migration — not a later one — to avoid a migration squash later.
- The seed script is the authoritative source of fixture data for E2E tests (iteration 7). Do not hardcode article titles or slugs in test files; derive them from the same data the seed inserts.
- Node.js ≥ 22 is required (TypeScript 6.0 compatibility). Confirm with `node --version` before starting.
- Do not run `prisma migrate dev` interactively during subsequent test runs — use `prisma migrate deploy` in CI to apply migrations without prompting.

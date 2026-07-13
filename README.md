# Knowledge Base

Internal Simplified Knowledge Base App — browse, search, edit, and organize team documentation.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · SQLite · TipTap (from Iteration 3)

Spec sources: [`docs/product-brief.md`](./docs/product-brief.md), [`docs/architecture.md`](./docs/architecture.md), [`docs/design-spec.md`](./docs/design-spec.md), [`docs/backlog.md`](./docs/backlog.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 24.x** | Active LTS (architecture pin). Node 25 may work; prefer 24. |
| **npm 10+** | Ships with Node |
| **Native build tools** | Required for `better-sqlite3` (Xcode Command Line Tools on macOS) |

---

## First-time setup

```bash
# 1. Install dependencies (runs prisma generate via postinstall)
npm install

# 2. Environment
cp .env.example .env
# Default: DATABASE_URL="file:./prisma/dev.db"

# 3. Migrate schema + seed sample data (FTS table created in seed)
npx prisma migrate dev
npm run db:seed

# 4. Dev server
npm run dev
# → http://localhost:3000
```

After setup you should see the **Knowledge Base** shell (header wordmark, search placeholder, New article) and a browsable list of seeded articles. Sample data is visible in Prisma Studio (`npm run db:studio`).

**Categories & tags (v1):** Seed-only. There are no admin CRUD pages and no inline create-category/create-tag actions. Assign existing taxonomy on the article form; re-run `npm run db:seed` to reset sample categories/tags.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build && npm start` | Production build + start |
| `npm run db:migrate` | Apply / create Prisma migrations |
| `npm run db:seed` | Seed categories, tags, articles + FTS index |
| `npm run db:reset` | Wipe DB, re-migrate, re-seed |
| `npm run db:studio` | Browse SQLite data in Prisma Studio |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npx playwright install` | One-time browser binaries for E2E |
| `npm run test:e2e` | Playwright E2E (configured fully in Iteration 6) |

---

## Project layout (v1)

```
prisma/           # schema, migrations, seed, FTS SQL
src/app/          # App Router pages + globals.css
src/components/   # UI (layout shell in Iteration 1)
src/lib/          # db, fts, utils
docs/             # product + architecture + design + iterations
tests/unit/       # Vitest (expanded in Iteration 6)
e2e/              # Playwright (Iteration 6)
```

---

## Environment

| File | Purpose |
|------|---------|
| `.env.example` | Template (`DATABASE_URL`) |
| `.env` | Local DB (gitignored) |
| `.env.test` | Optional test DB path for later E2E |

SQLite file paths in `DATABASE_URL` are resolved from the **project root** (e.g. `file:./prisma/dev.db`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `better-sqlite3` build fails | Install Xcode CLT / build essentials; use Node 24; `npm rebuild better-sqlite3` |
| FTS errors “no such table: articles_fts” | Re-run `npm run db:seed` (FTS is bootstrapped in seed, not Prisma migrate) |
| Stale Prisma client | `npx prisma generate` |
| Port 3000 in use | `npx next dev -p 3001` |
| Seed / migrate cannot find DB | Confirm `.env` has `DATABASE_URL="file:./prisma/dev.db"` and you run commands from repo root |

---

## Current status

| Iteration | Status |
|-----------|--------|
| 1 Foundation | Done |
| 2 Browse | Done |
| 3 Edit | Done |
| 4 Organize (categories/tags filters) | Done |
| 5 Search | Pending |
| 6 Verify / tests | Pending |

See [`docs/backlog.md`](./docs/backlog.md) and iteration summaries under `docs/`.

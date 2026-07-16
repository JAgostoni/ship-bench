# Knowledge Base

Internal **Simplified Knowledge Base App** — a small team tool to browse, search, edit, and organize documentation.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · SQLite · TipTap · Zod · Vitest · Playwright

**Specs:** [`docs/product-brief.md`](./docs/product-brief.md) · [`docs/architecture.md`](./docs/architecture.md) · [`docs/design-spec.md`](./docs/design-spec.md) · [`docs/backlog.md`](./docs/backlog.md)

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 24.x** | Active LTS (architecture pin). Prefer 24 over newer majors. |
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

After setup you should see the **Knowledge Base** shell (header wordmark, live search typeahead, New article) and a browsable list of seeded articles. Try seed terms like `onboarding`, `deploy`, or `vacation` in the header search.

**Categories & tags (v1):** Seed-only. There are no admin CRUD pages and no inline create-category/create-tag actions. Assign existing taxonomy on the article form; re-run `npm run db:seed` to reset sample categories/tags.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server (`http://localhost:3000`) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply / create Prisma migrations |
| `npm run db:seed` | Seed categories, tags, articles + FTS index |
| `npm run db:reset` | Wipe DB, re-migrate, re-seed |
| `npm run db:studio` | Browse SQLite data in Prisma Studio |
| `npm test` | Vitest unit tests (core pure logic) |
| `npm run test:watch` | Vitest watch mode |
| `npx playwright install` | **One-time** browser binaries for E2E (Chromium) |
| `npm run test:e2e` | Prepare `prisma/test.db` (migrate + seed) then run Playwright |

`npm run test:e2e` runs `pretest:e2e` first, which migrates and seeds `file:./prisma/test.db`. Playwright starts `npm run dev` against that database (see `playwright.config.ts`).

---

## Testing (MVP scope)

Aligned with the product brief — **not** a full QA program.

| In scope | Out of scope |
|----------|----------------|
| Vitest: `slugify`, `toFtsQuery`, `excerpt`/`stripHtml`, Zod `articleFormSchema` | Full accessibility audit suite |
| Playwright Chromium: browse → search → edit (+ create draft visibility) | Exhaustive E2E edge cases |
| Shared SQLite `prisma/test.db` for E2E | Visual regression, load tests |

```bash
npm test
npx playwright install   # once per machine
npm run test:e2e
npm run build
```

**Local E2E tip:** Stop any existing process on port 3000, or set `CI=1` so Playwright does not reuse a server that might be pointed at `dev.db`.

---

## v1 limitations

- **No authentication** — any local user can read and edit all articles
- **Single-tenant SQLite** — one team, one database file (`prisma/dev.db`)
- **Published-only search** — FTS typeahead and `/search` exclude drafts
- **Seed-only categories/tags** — no admin CRUD UI
- **No autosave / collab** — explicit Save; optimistic concurrency conflict banner on stale edit
- **No file uploads, comments, or version history**

---

## Project layout

```
prisma/           # schema, migrations, seed, FTS SQL
src/app/          # App Router pages, API, error/not-found
src/components/   # layout, articles, search, editor, ui
src/lib/          # db, fts, queries, actions, validation, utils
docs/             # product + architecture + design + iterations
tests/unit/       # Vitest
e2e/              # Playwright critical journey
```

---

## Environment

| File | Purpose |
|------|---------|
| `.env.example` | Template (`DATABASE_URL`) |
| `.env` | Local DB (gitignored) |

SQLite paths in `DATABASE_URL` are resolved from the **project root** (e.g. `file:./prisma/dev.db`). E2E uses `file:./prisma/test.db` (also gitignored).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `better-sqlite3` build fails | Install Xcode CLT / build essentials; use Node 24; `npm rebuild better-sqlite3` |
| FTS errors “no such table: articles_fts” | Re-run `npm run db:seed` (FTS is bootstrapped in seed, not Prisma migrate) |
| Stale Prisma client | `npx prisma generate` |
| Port 3000 in use | `npx next dev -p 3001` (E2E expects 3000 — free the port or stop other servers) |
| Seed / migrate cannot find DB | Confirm `.env` has `DATABASE_URL="file:./prisma/dev.db"` and run from repo root |
| E2E hits wrong data | Ensure no leftover `next dev` on 3000; re-run `npm run test:e2e` so pretest re-seeds `test.db` |
| Playwright browsers missing | `npx playwright install` |

---

## MVP status

| Iteration | Status |
|-----------|--------|
| 1 Foundation | Done |
| 2 Browse | Done |
| 3 Edit | Done |
| 4 Organize (categories/tags filters) | Done |
| 5 Search | Done |
| 6 Verify / tests | Done |

See [`docs/backlog.md`](./docs/backlog.md) and iteration summaries under `docs/`.

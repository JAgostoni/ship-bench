# Team KB

A simplified internal knowledge base: browse, search, and edit Markdown articles. Built with Next.js 16 (App Router), SQLite (FTS5 full-text search), Drizzle ORM, and Tailwind CSS 4.

Project documentation — product brief, architecture spec, design spec, and the iteration backlog — lives in [`docs/`](docs/).

## Prerequisites

- Node.js **24.x** (Active LTS) — an `.nvmrc` is committed, so `nvm use` picks the right version
- npm 10+

## Run it locally

```bash
npm install
npm run db:seed       # creates data/kb.sqlite, runs migrations, inserts 12 sample articles
npm run dev           # http://localhost:3000
```

Migrations apply automatically whenever the app (or any script) opens the database, so `db:seed` on a fresh clone both creates and fills the database. Seeding is idempotent — it only inserts when the articles table is empty.

Production-style local run: `npm run build && npm start`.

## Tests

```bash
npm test              # unit tests (Vitest, no server needed)
npm run test:e2e      # Playwright E2E (run `npx playwright install chromium` once first)
npm run check         # full quality gate: typecheck + ESLint + Prettier + unit tests
```

The E2E suite builds and starts the app itself against a separate database (`data/kb-e2e.sqlite`).

## Scripts

| Script               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Start the dev server                                |
| `npm run build`      | Production build                                    |
| `npm start`          | Serve the production build                          |
| `npm run db:migrate` | Apply pending migrations (also happens on app boot) |
| `npm run db:seed`    | Seed 12 sample articles (no-op if data exists)      |
| `npm test`           | Run unit tests                                      |
| `npm run test:e2e`   | Run Playwright E2E tests                            |
| `npm run check`      | Typecheck, lint, format check, unit tests           |

## Environment variables

All optional; see [`.env.example`](.env.example).

| Variable        | Default          | Purpose                          |
| --------------- | ---------------- | -------------------------------- |
| `DATABASE_PATH` | `data/kb.sqlite` | SQLite file (`:memory:` allowed) |
| `PORT`          | `3000`           | HTTP port                        |

## Reset the world

Local data is disposable: delete `data/kb.sqlite` (plus its `-wal`/`-shm` sidecars if present) and run `npm run db:seed` again.

# Iteration 1 Summary: Dev Environment & Backend Foundation

## What Was Built

- **Repository structure** per architecture spec:
  - `prisma/`, `server/{routes,services,middleware,lib}`, `shared/`, `src/{routes,components,lib,styles}`, `e2e/specs/`
- **Dependency installation** with live-verified versions (npm view):
  - React 19.2.5, Vite 8.0.10, Tailwind CSS 4.2.4, Express 5.2.1, Prisma 7.8.0, Zod 4.3.6, Vitest 4.1.5, Playwright 1.59.1, etc.
- **Prisma schema** with `Article`, `Category`, `Tag`, `ArticleStatus` enum
- **SQLite + FTS5**:
  - Prisma Migrate handles base tables; raw SQL (`prisma/fts-setup.sql`) creates the `ArticleFts` virtual table and sync triggers after migration.
- **Seed script** (`prisma/seed.ts`) creates 4 categories and 10 deterministic articles with deterministic slugs.
- **Express server skeleton** (`server/index.ts`) on port 3001:
  - Middleware: JSON, CORS, Morgan logging
  - Placeholder routes: `/api/articles`, `/api/search`, `/api/categories` returning `501` envelopes
  - Global error handler with Zod validation support
  - Validation middleware skeleton (`validate.ts`)
- **Shared Zod schemas** (`shared/schemas.ts`): `ArticleCreateSchema`, `ArticleUpdateSchema`, derived TypeScript types
- **Utilities**: `server/lib/slugify.ts` with unit tests (3 tests passing)
- **Testing entry points**:
  - Vitest config with path aliases, 3 passing unit tests
  - Playwright config targeting Chromium, 3 placeholder E2E tests passing
- **Vite + Tailwind CSS v4** scaffold (`src/main.tsx`, `src/App.tsx`, `src/styles/index.css`) renders a blank "Knowledge Base" page.

## Assumptions & Issues Encountered

- **Prisma 7 migration**: Prisma 7 no longer supports `url` inside `schema.prisma`. Created `prisma.config.ts` to supply the datasource URL externally.
- **FTS5 virtual tables**: Prisma Migrate drops/recreates virtual table internals on subsequent migrations. To avoid migration failures, FTS5 setup is applied *after* Prisma Migrate via `prisma db execute` using `prisma/fts-setup.sql`. This is a pragmatic workaround documented for future iterations.
- **Prisma Client adapter**: Prisma 7 requires a driver adapter. Used `@prisma/adapter-better-sqlite3` with the `PrismaBetterSqlite3` factory.
- **Zod v4**: Upgraded from the spec's suggested 3.x to the current stable 4.3.6. API is compatible for our usage.
- **lucide-react**: The spec suggested 0.487.0; current stable is 1.12.0, which works the same way.

## Verification

- `npm run db:migrate` + `npm run db:seed` ✅ (4 categories, 10 articles)
- `npm run test:unit:run` ✅ (3 tests passed)
- `npm run test:e2e` ✅ (3 placeholder tests passed)
- `npm run start` ✅ (API server on http://localhost:3001, health endpoint returns `{ data: { status: 'ok' } }`)
- Placeholder routes return proper `501` envelopes.

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Prisma 7 with `prisma.config.ts` | Prisma 7 removed `url` from schema files; config file is the new canonical way. |
| FTS5 via post-migration SQL | Prisma Migrate sees FTS5 internal tables as unmanaged and tries to drop them. Running FTS5 setup after migrate avoids this. |
| `@prisma/adapter-better-sqlite3` | Prisma 7 requires a driver adapter for SQLite; this is the official adapter. |
| Upgrade Zod to v4 | Current stable on npm is 4.3.6; schema API is largely compatible with v3 for our simple schemas. |
| Upgrade lucide-react to 1.12.0 | Latest stable; same icon API. |


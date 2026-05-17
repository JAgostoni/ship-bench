# Iteration 1 Summary — Project Bootstrap

## What Was Built

All foundational infrastructure for the Internal Knowledge Base app was established:

- **Next.js 16.2.6** project with App Router, Turbopack, TypeScript, and `src/` directory layout
- **All dependencies installed** at pinned versions (with one version adjustment — see Assumptions below)
- **Tailwind CSS 4.3.0** configured with the CSS-first approach (`@import "tailwindcss"` in `globals.css`; `@plugin "@tailwindcss/typography"`)
- **TypeScript** with `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`, and `@/*` path alias
- **Docker Compose** running PostgreSQL 18 (with corrected volume mount path — see Decisions)
- **Prisma 7.4.2** schema with full data model: `Article`, `Category`, `Status` enum
- **Initial migration** applied including all indexes and the GIN full-text search index (`Article_search_idx`)
- **Database seed** producing 5 categories and 8 sample articles (1 DRAFT, 1 uncategorized, 2+ Engineering articles)
- **Vitest 4.1.6** and **Playwright 1.59.0** config files created
- **Package.json scripts** complete: `dev`, `build`, `db:migrate`, `db:seed`, `db:reset`, `test`, `test:e2e`, `generate`
- **Directory scaffold** with placeholder pages for all routes defined in the architecture spec

## Assumptions Made

1. **Zod version**: The architecture spec specifies `zod@4.5.0` which does not exist as a stable release (only canary builds). Used `zod@4.4.3` (latest stable) instead.

2. **Prisma 7 adapter pattern**: The architecture spec shows the classic `PrismaClient` singleton pattern with `url = env("DATABASE_URL")` in `schema.prisma`. Prisma 7.4.2 has removed the `url` property from the datasource block in schema files. The correct Prisma 7 approach is:
   - Connection URL configured in `prisma.config.ts` for migrations
   - `PrismaClient` constructed with `new PrismaPg({ connectionString })` adapter from `@prisma/adapter-pg`
   - Prisma client generated to `src/generated/prisma/` (new Prisma 7 default output location)
   
   This affects how `src/lib/prisma.ts` will be written in Iteration 2.

3. **dotenv**: The seed script and any non-Next.js runtime code requires explicit `import 'dotenv/config'` since Next.js's env loading only applies to the Next.js server. `dotenv` was added as a dependency.

## Issues Encountered

1. **PostgreSQL 18 volume path**: The `postgres:18` Docker image changed the data directory convention. The volume must be mounted at `/var/lib/postgresql` (not `/var/lib/postgresql/data` as in older versions). `docker-compose.yml` updated accordingly.

2. **Manual migration approach**: The iteration spec recommended `prisma migrate resolve --applied 0001_init` to register a pre-written migration without running it. This was followed: the SQL was run directly via `docker exec psql`, then the migration was registered with `prisma migrate resolve`. The `Article_search_idx` GIN index is confirmed present.

## Confirmation: App Runs Locally

- `docker compose up -d` starts PostgreSQL 18 successfully
- `npx prisma migrate status` shows: "1 migration found, database schema is up to date"
- `npm run db:seed` completes: 5 categories, 8 articles inserted
- `npm run dev` starts at `http://localhost:3000` (307 redirect to `/articles` — correct)
- GIN index `Article_search_idx` verified present in database
- All 8 articles and 5 categories confirmed in database

## Decisions Log

| Decision | Rationale |
|---|---|
| Used `zod@4.4.3` instead of `4.5.0` | 4.5.0 only exists as a canary; 4.4.3 is the latest stable and API-compatible |
| PostgreSQL 18 volume at `/var/lib/postgresql` | Postgres 18 changed directory convention; old `/data` mount causes startup failure |
| Prisma 7 adapter pattern (`@prisma/adapter-pg`) | Prisma 7 removed `url` from schema datasource; adapter pattern is the new required approach |
| Added `dotenv` package | Needed for seed.ts and future non-Next.js runtime code to load `.env` |
| Migration applied via `psql` + `migrate resolve` | Ensures GIN index is included; auto-generation via `migrate dev` would omit it |

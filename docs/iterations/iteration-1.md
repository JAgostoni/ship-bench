# Iteration 1: Foundation

## Goal
Establish the local development environment, repository structure, base dependencies, and database schema.

## Scope
- Monorepo structure (npm workspaces).
- Dockerized PostgreSQL setup.
- Prisma schema and client initialization.
- API and Web application skeletons.
- Shared types package.

## Tasks
1. **Initialize Monorepo**: Set up `package.json` with npm workspaces (`apps/*`, `packages/*`).
2. **Infrastructure**: Create `docker-compose.yml` for PostgreSQL 17.
3. **Database Package**:
   - Initialize `packages/db` with Prisma 7.8.0.
   - Implement the schema as defined in `architecture.md` (Article, Category, Tag).
   - Create a seeding script in `packages/db/seed.ts` with ~10 sample articles.
4. **Types Package**: Set up `packages/types` to export Zod schemas and TypeScript types shared between API and Web.
5. **API Skeleton**:
   - Initialize `apps/api` with Express 5.2.x.
   - Configure Prisma client and basic middleware (CORS, JSON).
   - Implement a simple "Health Check" endpoint.
6. **Web Skeleton**:
   - Initialize `apps/web` with React 19 and Vite 8.
   - Set up the basic directory structure (`components`, `pages`, `hooks`).
   - Define global CSS variables in `src/index.css` as per `design-spec.md`.

## Notes
- Ensure Node.js 24 is used as per the technical architecture.
- The `db` and `types` packages should be linkable via workspaces so `apps/api` and `apps/web` can import from them directly.

# Iteration 1 Summary: Foundation

## Summary of Work
In this iteration, the core foundation of the Knowledge Base application was established. Key achievements include:
- **Monorepo Structure**: Set up using npm workspaces with `apps/api`, `apps/web`, `packages/db`, and `packages/types`.
- **Infrastructure**: Configured Docker Compose for PostgreSQL 17.
- **Database Layer**: Initialized `packages/db` with Prisma 7.8.0. Implemented the schema (Article, Category, Tag, ArticleTag) and created a comprehensive seeding script with 10 sample articles.
- **Shared Types**: Created `packages/types` using Zod for cross-package type safety.
- **API Skeleton**: Established `apps/api` with Express 5.2.1, including a database-connected health check.
- **Web Skeleton**: Bootstrapped `apps/web` using React 19 and Vite 8 (Rolldown), including global CSS variables based on the design spec.

## Assumptions and Issues
- **Prisma 7 Breaking Changes**: Encountered significant changes in Prisma 7 compared to previous versions. Specifically:
  - Datasource URLs are no longer supported directly in `schema.prisma` for CLI operations; moved to `packages/db/prisma.config.ts`.
  - `PrismaClient` now requires a driver adapter for direct database connections. Integrated `pg` and `@prisma/adapter-pg`.
  - `prisma generate` and `prisma db seed` are no longer automatic during migrations.
- **Port Conflicts**: Port 3000 was in use during verification, causing Vite to shift to port 3002.
- **Peer Dependency Conflicts**: Used `--legacy-peer-deps` during installation to resolve a conflict between `lucide-react` and React 19's peer dependency requirements.

## Verification Results
- **Database**: PostgreSQL 17 container is running, migrations applied, and 10 articles successfully seeded.
- **API**: Health check endpoint (`/api/health`) returns `{"status":"ok","database":"connected"}`.
- **Web**: Development server starts and serves the skeleton application.

## Decisions Log
| ID | Decision | Rationale |
| :--- | :--- | :--- |
| DEC-005 | Prisma 7 Config | Used `prisma.config.ts` in `packages/db` to comply with Prisma 7's new configuration architecture. |
| DEC-006 | PostgreSQL Adapter | Explicitly integrated `@prisma/adapter-pg` to support direct DB connections in Prisma 7. |
| DEC-007 | Symlinked .env | Copied `.env` to sub-packages to ensure CLI tools and runtime have access to the `DATABASE_URL`. |

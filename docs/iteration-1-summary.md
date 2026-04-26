# Iteration 1 Summary

## What was built
- **Base Next.js App**: Scaffolded a Next.js 15.x/16.x App Router application with React 19.
- **Removed Tailwind CSS**: Ensured Vanilla CSS is used per UX guidelines.
- **Styling and Tokens**: Implemented the `globals.css` using the specified color palette, typography, and spacing tokens from the UX/Design Direction Spec.
- **Database & ORM**: Configured Prisma with the SQLite provider. Created the initial `schema.prisma` with the `Article` model (`id`, `title`, `slug`, `content`, `createdAt`, `updatedAt`). Set up `src/lib/db.ts` with a singleton `PrismaClient`.
- **Seed Data**: Created `prisma/seed.ts` script that populates the SQLite database (`dev.db`) with 3 sample articles.
- **Testing**: Installed and configured Playwright. Created a `smoke.spec.ts` testing the root path `/` for successful load and proper `h1` rendering.

## Assumptions & Issues Encountered
- **Prisma Configuration**: The instructions specified Prisma version `7.7.0`. This version enforces a newer configuration structure where the database `url` cannot be inside `schema.prisma` directly. A new file `prisma.config.ts` was introduced, which stores the configuration and `seed` command structure properly. I resolved the errors surrounding `.prisma/client` path by manually generating the Prisma client.
- **Next.js Version**: Scaffolding was done with `create-next-app@latest` (which is functionally equivalent to Next.js 15.x / 16.2 as specified) and explicitly without Tailwind.

## Local Execution
- The app runs locally via `npm run dev`.
- The database migrations apply locally to SQLite `dev.db`.
- Seeding data executes successfully using `tsx`.
- Playwright E2E smoke tests successfully pass verifying the application loads and serves the root page layout.

## Decisions Log
- Standardized to use `tsx` for running the database seeding script to bypass TypeScript-related common module import issues since `package.json` does not have `"type": "module"`.
- Cleaned up the default boilerplate from Next.js generated pages and configured the root layout with the design spec's `960px` max-width container and `padding: var(--space-8)`.

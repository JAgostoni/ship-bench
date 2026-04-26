# Iteration 1: Base Setup & Infrastructure

**Goal:** Establish the local development environment, repository structure, base dependencies, database, and seed data.
**Scope:** Foundation for the application. No user-facing features yet, but results in a working local dev server and testing environment.

## Tasks

1. **Next.js Initialization:** 
   - Scaffold a Next.js 16.2 App Router project using React 19 and Node.js 24.
   - Explicitly disable/remove Tailwind CSS if included by default.
   - Clean up default boilerplate in `app/page.tsx` and `app/layout.tsx`.

2. **CSS & Design Tokens:** 
   - Create or update `src/styles/globals.css`.
   - Implement the CSS Variables (colors, typography, spacing grid, border radius) defined in the UX/Design Direction Spec.

3. **Database & ORM Setup:** 
   - Install `prisma` and `@prisma/client` (version 7.7.0).
   - Initialize Prisma with the SQLite provider.
   - Define the `Article` model in `prisma/schema.prisma` (`id`, `title`, `slug`, `content`, `createdAt`, `updatedAt`). *Note: Omit `Category` and `status` fields for this MVP phase.*
   - Generate the initial Prisma migration (`npx prisma migrate dev --name init`).
   - Create a singleton Prisma client instance in `src/lib/db.ts`.

4. **Seed Data Script:** 
   - Create a `prisma/seed.ts` script to populate the database with 3-5 sample articles containing varied Markdown content (headings, lists, code blocks).
   - Configure `package.json` to run the seed script via `prisma db seed`.

5. **Testing Framework Setup:** 
   - Install Playwright 1.59.1 (`npx playwright install`).
   - Configure `playwright.config.ts` to spin up the local Next.js dev server before running tests.
   - Write a basic smoke test (`tests/smoke.spec.ts`) that simply loads the home page and verifies a successful response.

## Notes on Dependencies & Sequencing
- Completing the Prisma schema and seeding the database is the critical path for Iteration 2. Do not proceed until `npm run dev` and the Playwright smoke test run successfully.
# Iteration 1 Summary: Foundation & Environment

## Summary
Established the core project foundation, including the Next.js 15 environment, TypeScript configuration, and the local-first persistence layer using SQLite and Prisma.

## Built
- **Project Setup**: Next.js 15 (App Router), Tailwind CSS 4, and TypeScript.
- **Data Model**: Implemented `User` and `Article` models in Prisma.
- **Persistence**: Local SQLite database (`dev.db`) with a singleton `PrismaClient` in `src/lib/db.ts`.
- **Seed Data**: Populated the database with an admin user and three sample articles to facilitate development.
- **Environment**: Configured `.env` and project folder structure.

## Assumptions & Issues
- **Prisma Versioning**: Encountered significant breaking changes and constructor requirements with Prisma v7. To maintain stability and speed of development for the MVP, downgraded to Prisma v5.22.0, which provides the expected behavior for local SQLite development without needing complex driver adapters for simple seeding scripts.
- **Project Naming**: Initial `create-next-app` failed due to capital letters in the directory name; resolved by using a temporary directory.

## Verification
- Application boots successfully via `npm run dev`.
- Database migrations applied and seeded successfully.
- Database connectivity verified via successful seed execution.

## Decisions Log
- **Prisma v5 vs v7**: Downgraded to v5 for the MVP to avoid the high overhead and configuration complexity of the new v7 constructor/adapter pattern, which was hindering simple seeding and basic connectivity.
- **Seed Script**: Used a plain JavaScript seed script (`seed_final.js`) to bypass TypeScript compilation overhead during initial DB setup.

# Iteration 1: Foundation & Environment

## Goal
Establish a working local development environment, repository structure, and the base data persistence layer.

## Tasks
- [ ] **Project Initialization**: 
    - Initialize Next.js 15 project with TypeScript, Tailwind CSS 4, and App Router.
    - Configure folder structure: `src/app`, `src/components`, `src/lib`, `src/types`, `prisma/`, `tests/`.
- [ ] **Database Setup**:
    - Install Prisma and initialize SQLite.
    - Implement the `Article` and `User` models in `schema.prisma` as per the Architecture Spec.
    - Create the `lib/db.ts` singleton for `PrismaClient`.
- [ ] **Initial Migration**:
    - Run `npx prisma migrate dev --name init` to create the local SQLite database.
- [ ] **Seed Data**:
    - Create a `prisma/seed.ts` script to populate the database with a few sample articles and users for immediate development.
- [ ] **Environment Configuration**:
    - Setup `.env` with `DATABASE_URL="file:./dev.db"`.
- [ ] **Verification**:
    - Run `npm run dev` to ensure the application boots without errors.
    - Verify database connectivity via `npx prisma studio`.

## Notes
- This iteration provides the "plumbing" for the rest of the project.
- Ensure the SQLite file is ignored in `.gitignore` if necessary, though the brief mentions local-first persistence.

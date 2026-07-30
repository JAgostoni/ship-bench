# Iteration 1 – Environment Setup

## Goal
Establish a reproducible local development environment, project scaffolding, and core tooling.

## Scope
- Initialize Git repository (if not already).
- Add `package.json` with Next.js, Tailwind, Prisma, React‑Query, Zod, next‑auth, React‑MDE, Jest, Playwright, ESLint, Prettier.
- Set up `tsconfig.json` and `next.config.mjs`.
- Create `.gitignore`, `.env.example` (DATABASE_URL, NEXTAUTH_SECRET).
- Install dependencies (`npm ci`).
- Configure Tailwind (tailwind.config.cjs) and global CSS.
- Initialize Prisma schema (basic Article model without tags/status) and run `prisma migrate dev`.
- Add a simple README with run instructions.
- Add lint/format scripts (`npm run lint`, `npm run format`).
- Verify dev server starts (`npm run dev`).

## Tasks
1. `npm init -y` and install core deps.
2. Add Next.js (`next@16.2.12`, `react@19.2.8`, `react-dom@19.2.8`).
3. Install Tailwind (`tailwindcss@4.3.3`, `postcss`, `autoprefixer`).
4. Install Prisma (`prisma@5.10.0`, `@prisma/client`).
5. Install next‑auth (`next-auth@5`).
6. Install React‑Query (`@tanstack/react-query@5`).
7. Install Zod (`zod@3.23.8`).
8. Install React‑MDE (`react-mde@2.2.0`).
9. Install testing libs (`jest@29`, `@testing-library/react`, `playwright@1.44.0`).
10. Create `tailwind.config.cjs` and `postcss.config.cjs`.
11. Create `src/styles/globals.css` with Tailwind directives.
12. Scaffold `src/app/layout.tsx` and root page.
13. Create `prisma/schema.prisma` with Article model (id, title, content, timestamps).
14. Run `npx prisma migrate dev --name init`.
15. Add `.env.example`.
16. Add README with setup steps.
17. Add lint & format scripts in `package.json`.
18. Run `npm run dev` to ensure no errors.

## Notes
- No UI components yet; focus on build pipeline.
- Ensure TypeScript strict mode enabled.
- Commit after each major sub‑step (optional).
# Article MVP

## Setup

1. Clone the repository.
2. Run `npm install` (already done).
3. Copy `.env.example` to `.env` and set `DATABASE_URL` if needed.
4. Run `npx prisma migrate dev --name init` to set up SQLite.
5. Start the dev server: `npm run dev` (or `npm run dev -- --port 3001`).

## Scripts

- `npm run dev` – Start Next.js dev server.
- `npm run build` – Build for production.
- `npm run start` – Run production build.
- `npm run lint` – Run ESLint.
- `npm run format` – Run Prettier.
- `npm test` – Run Jest tests (no tests yet).

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma with SQLite
- React Query
- Zod validation
- Next‑Auth (Credentials Provider)
- React‑MDE (markdown editor)

## Project Structure

```
src/
  app/          # Next.js App Router
    layout.tsx
    page.tsx
  styles/
    globals.css
prisma/
  schema.prisma
`

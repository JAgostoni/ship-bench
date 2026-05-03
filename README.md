# Knowledge Base App

A lightweight Markdown-based knowledge base for teams. Browse articles, search via full-text search (FTS5), create and edit Markdown with live preview, and manage tags and categories.

## Tech Stack

- **Frontend:** React 19 + React Router v7 + Tailwind CSS v4 + Vite
- **Backend:** Express 5 + TypeScript (via `tsx`)
- **Database:** SQLite with Prisma ORM + FTS5 for fast full-text article search
- **UI:** Lucide-React icons, `@tailwindcss/typography` for rendered Markdown
- **Testing:** Vitest (unit) + Playwright (E2E)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Run migrations and seed the database
npm run db:reset

# 4. Start the dev stack (Vite frontend + Express backend)
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server + Express API in watch mode |
| `npm run build` | Production Vite build into `dist/` |
| `npm run start` | Run production Express server (serves `dist/` + API) |
| `npm run db:migrate` | Create / apply Prisma migrations |
| `npm run db:seed` | Run the seed script |
| `npm run db:reset` | Reset database, re-apply migrations, and seed |
| `npm run test:unit:run` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Architecture Overview

- **Database** — SQLite accessed through Prisma Client. FTS5 is added outside Prisma's migration system (raw SQL via `better-sqlite3` in `prisma/seed.ts`) to enable fast article search.
- **API** — Express REST server mounted under `/api`. Each route handler delegates to thin service functions that wrap Prisma calls.
- **Shared schemas** — Zod schemas live in `shared/schemas.ts` and are imported by both server (validation) and client (form validation/shared types).
- **Frontend** — Vite SPA (not SSR). Routing is handled by React Router v7 (`createBrowserRouter`). Global layout (`AppShell`) provides a responsive sidebar/drawer and fixed header.
- **Editor** — A custom `MarkdownEditor` component that shows a split-pane (desktop) or tabbed view (mobile) backed by `react-markdown` + `remark-gfm`.
- **Testing** — Unit tests cover server utilities and services. E2E tests run against the production Express build (port 3001) with a fresh database reset before every suite.

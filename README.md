# Knowledge Base

A lightweight internal team knowledge base built with Next.js 16, featuring article browsing, full-text search, and markdown editing.

## Live Demo

**[Open in GitHub Codespaces](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1022967887)**

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 6 |
| UI | Tailwind CSS 4, React 19 |
| Validation | Zod 4 |
| Database | SQLite (via better-sqlite3) |
| ORM | drizzle-orm |
| Search | SQLite FTS5 (full-text search) |
| Markdown | markdown-it + DOMPurify |
| Notifications | sonner |
| Unit Testing | Vitest 4 + jsdom |
| E2E Testing | Playwright 1.59 |

## Features

- **Article Browsing** — Browse published articles in a clean, card-based layout
- **Markdown Editor** — Create and edit articles with live preview
- **Full-Text Search** — Instant search across article titles and content via SQLite FTS5, with debounced dropdown
- **Categories** — Organize articles into categories
- **Empty States** — Friendly messages when no content exists
- **Responsive Design** — Mobile-first with drawer-based sidebar navigation

## Getting Started (Local Development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Seed Data

Populate the database with sample articles:

```bash
npm run seed
```

### Database Migrations

```bash
npm run db:generate   # Generate migration files
npm run db:push       # Apply migrations
```

## Testing

```bash
npm test              # Run unit tests (Vitest)
npm run test:coverage # Run with coverage report
npm run test:e2e      # Run E2E tests (Playwright, headless)
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:headed # Run E2E tests in headed browser
```

Linting and type-checking:

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript (tsc --noEmit)
```

## Architecture

- `app/` — Next.js App Router pages, layouts, and API routes
- `components/` — Shared React components (article, layout, search, UI primitives)
- `src/db/` — Database connection and Drizzle schema
- `src/lib/` — Business logic (article CRUD, search, validation, utilities)
- `src/actions/` — Next.js server actions
- `data/` — SQLite database file
- `scripts/` — Seed script for sample data
- `tests/` — Vitest unit tests
- `playwright/tests/` — Playwright E2E tests

## License

ISC

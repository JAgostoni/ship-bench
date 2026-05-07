# Iteration 1 Summary — Foundation

## What Was Built

Iteration 1 established the full-stack development environment for the Knowledge Base app.

### 1. Next.js Project Scaffold
- Next.js 16.2.4 with App Router, TypeScript, and Tailwind CSS 4
- Proper directory structure: `app/`, `components/`, `src/`, `drizzle/`, `scripts/`, `tests/`
- `tsconfig.json` with strict mode and `@/*` path aliases
- PostCSS config for Tailwind 4 (`@tailwindcss/postcss`)
- `.gitignore` excluding `data/`, `.next/`, and build artifacts

### 2. Database Layer (Drizzle ORM + SQLite)
- `better-sqlite3` driver configured
- Three schema tables defined:
  - **articles**: `id` (UUID), `title`, `content`, `status` (draft/published), `created_at`, `updated_at`
  - **categories**: `id`, `name` (unique), `slug` (unique), `description`, `created_at`
  - **article_categories**: Junction table with composite primary key
- `drizzle-kit` configured with SQLite dialect, migrations output to `drizzle/migrations/`
- Schema pushed to `data/knowledge-base.db` via `drizzle-kit push`
- FTS5 migration prepared at `src/db/migrations/002_add_fts5.sql` (to be applied in Iteration 3)

### 3. Seed Data Script
- `scripts/seed.ts` inserts 7 articles and 3 categories
- 5 articles with substantial Markdown content (headings, lists, code blocks, links)
- 2 short articles for testing list/detail flows
- All articles seeded with `status: 'published'` and staggered timestamps
- 3 categories: Getting Started, Engineering, Troubleshooting

### 4. Design Tokens & Global Styles
- All CSS custom properties from design spec Section 4.1 in `app/global.css`:
  - Color palette (bg, surface, accent, error, success, warning variants)
  - Typography scale (--text-xs through --text-3xl)
  - Spacing scale (--space-1 through --space-16)
  - Borders, radius, shadows, z-indices
- Inter and JetBrains Mono fonts loaded via `next/font/google`
- Base prose styles (`kb-prose` class) for rendered article content
- Shimmer animation for skeleton loading (respects `prefers-reduced-motion`)

### 5. Base UI Components
- **Button** (`components/ui/Button.tsx`): primary/secondary/tertiary variants, sm/md sizes, loading spinner state
- **EmptyState** (`components/ui/EmptyState.tsx`): centered layout with icon, title, description, optional CTA
- **SkeletonCard** (`components/ui/SkeletonCard.tsx`): animated shimmer matching article card layout

### 6. Application Shell
- **AppHeader** (`components/layout/AppHeader.tsx`): fixed top bar (56px), logo link ("KB"), search placeholder, "+ New" button
- **Root layout** (`app/layout.tsx`): font classes, skip-to-content link, header + main content wrapper
- **(public) layout** (`app/(public)/layout.tsx`): container for public-facing routes
- **Home page** (`app/(public)/page.tsx`): placeholder browse view

## Package Scripts

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `db:generate` | `drizzle-kit generate` |
| `db:push` | `drizzle-kit push` |
| `seed` | `tsx scripts/seed.ts` |

## Assumptions & Issues

1. **Module format**: Changed `package.json` from `"type": "commonjs"` to `"type": "module"` to support ESM import/export syntax in TypeScript source files.
2. **Path alias**: Changed `@/*` from `./src/*` to `./*` since `app/` and `components/` are at the project root per the architecture spec.
3. **FTS5 migration placement**: Placed at `src/db/migrations/002_add_fts5.sql` (not `drizzle/migrations/`) to keep it as SQL to be applied manually in Iteration 3. A copy exists at `drizzle/migrations/002_add_fts5.sql` as well, but it is a manual SQL file, not drizzle-kit generated.
4. **Drizzle ORM version**: The installed `drizzle-orm@0.45.2` uses a new API with `sqliteTable` and `defineConfig`. The drizzle config uses the newer `defineConfig` API with `dbCredentials.url` instead of the older pattern.

## Confirmation

- ✅ `npm run dev` starts successfully (Next.js 16.2.4 with Turbopack)
- ✅ `http://localhost:3000` returns 200
- ✅ `npm run db:push` successfully creates the database
- ✅ `npm run seed` inserts 7 articles and 3 categories

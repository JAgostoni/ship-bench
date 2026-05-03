# Iteration 1 — Foundation

## Goal

Establish the full-stack development environment: repository structure, dependencies, database layer, seed data, design tokens, and UI component primitives so all subsequent iterations have a working scaffold.

---

## Tasks

### 1.1 Scaffold Next.js Project

Create a new Next.js 16 App Router project with TypeScript and Tailwind CSS. Set up the directory structure matching the architecture spec:

```
app/
  (public)/
  api/
  layout.tsx
  global.css
components/
  ui/
  layout/
  article/
  search/
src/
  db/
    index.ts
    schema/
  lib/
  hooks/
  stores/
drizzle/
  migrations/
data/ (gitignored)
tests/
playwright/
  tests/
```

**Steps:**
1. Initialize Next.js project: `npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint`
2. Confirm the project starts: `npm run dev` → verify `http://localhost:3000`
3. Create the directory structure above (empty folders)
4. Configure TypeScript strict mode in `tsconfig.json`
5. Add `data/` to `.gitignore`
6. Add `.env.example` with any required variables (even if none yet, for future expansion)

### 1.2 Set Up Database Layer (Drizzle ORM + SQLite)

Configure Drizzle ORM with `better-sqlite3` and `drizzle-kit` for schema management. Define the complete data schema.

**Steps:**
1. Install database dependencies: `npm install drizzle-orm better-sqlite3` and dev deps: `npm install -D drizzle-kit @types/better-sqlite3`
2. Create `drizzle.config.ts` (configure `out` to `drizzle/migrations/`, `dialect` to `sqlite`, `schema` to `src/db/schema/`)
3. Define schema files:
   - `src/db/schema/articles.ts`: `articles` table with `id` (UUID text), `title`, `content`, `status` (enum: draft/published, default draft), `created_at` (ISO text), `updated_at` (ISO text)
   - `src/db/schema/categories.ts`: `categories` table (`id`, `name` unique, `slug` unique, `description`, `created_at`)
   - `src/db/schema/articleCategories.ts`: junction table (`article_id`, `category_id` as foreign keys)
   - `src/db/schema/index.ts`: re-export all schema objects
4. Create `src/db/index.ts`: initialize `better-sqlite3` client pointing to `data/knowledge-base.db` and wrap with `drizzle-orm/better-sqlite3`. Export the `db` instance.
5. Create initial migration: `npx drizzle-kit generate`
6. Push schema to database: `npx drizzle-kit push` — verify the database file is created in `data/knowledge-base.db`
7. **Prepare** the FTS5 migration SQL at `drizzle/migrations/002_add_fts5.sql` defining the FTS5 virtual table and sync triggers on articles (will be **applied** in Iteration 3, but the file exists so the schema is complete):
   ```sql
   CREATE VIRTUAL TABLE articles_fts USING FTS5(title, content, content_rowid=UNNESTED);
   -- Triggers to keep FTS index in sync on INSERT/UPDATE/DELETE
   ```

### 1.3 Build Seed Data Script

Create a seed script that inserts 5-10 articles into the database so Iteration 2's browse view has data to render.

**Steps:**
1. Create `scripts/seed.ts`
2. Insert a mix of articles:
   - At least 3 articles with substantial Markdown content (headings, lists, code blocks, links) so the detail page can be meaningfully tested
   - At least 2 articles with short content
   - Set default `status` to `published` for all seeded articles
   - Set valid `created_at`/`updated_at` timestamps (spread over recent days)
3. Add `"seed": "tsx scripts/seed.ts"` to `package.json`
4. Run seed: `npm run seed` and verify articles visible in `data/knowledge-base.db`
5. Seed 2-3 categories (e.g., "Getting Started", "Engineering", "Troubleshooting") for the sidebar placeholder

### 1.4 Apply Design Tokens & Global Styles

Add CSS custom properties from the design spec to the global stylesheet. Set up the Inter and JetBrains Mono fonts.

**Steps:**
1. Add font imports for Inter and JetBrains Mono via `next/font/google`
2. In `app/global.css`, define the `:root` block with all design tokens from design spec Section 4.1:
   - Color palette (`--color-bg`, `--color-surface`, `--color-accent`, etc.)
   - Typography variables (`--font-sans`, `--font-mono`)
   - Text sizes (`--text-xs` through `--text-3xl`)
   - Line heights (`--leading-tight`, `--leading-normal`, `--leading-relaxed`)
   - Spacing scale (`--space-1` through `--space-16`)
   - Borders/radius (`--radius-*`)
   - Shadows (`--shadow-*`)
   - Z-indices (`--z-header` through `--z-toast`)
3. Extend Tailwind config to map these CSS custom properties into token classes (e.g., `bg-surface`, `text-accent`, `shadow-md`)
4. Add base element styles (body background, default font, link color)

### 1.5 Build Base UI Components

Create the primitive UI components that all subsequent iterations depend on.

**Steps:**
1. **Button** — `components/ui/Button.tsx`:
   - Props: `variant` (primary, secondary, tertiary), `size` (sm, md), `disabled?`, `loading?`, `children`, `...rest`
   - All states from design spec Section 5.1 (default, hover, focus, disabled, loading with spinner)
2. **EmptyState** — `components/ui/EmptyState.tsx`:
   - Props: `icon` (ReactNode), `title`, `description`, `actionLabel?`, `onAction?`
   - Centered layout with icon, title, description, and optional CTA button
3. **SkeletonCard** — `components/ui/SkeletonCard.tsx`:
   - Animated shimmer matching article card layout (title bar ~60%, preview lines 100%/80%, meta line 40%)
   - Respects `prefers-reduced-motion` (disable animation when set)
4. **Toast system** — `components/ui/Toast.tsx` + `components/ui/ToastContainer.tsx`:
   - Toast component: `type` (success, error, warning), `message`, `duration?`, `onDismiss`
   - Position: fixed bottom-right (desktop), bottom-center (mobile)
   - Use `sonner` or a lightweight custom implementation matching design spec Section 5.5

### 1.6 Build Application Shell (Header + Root Layout)

Create the persistent header and root layout that wraps all views.

**Steps:**
1. **AppHeader** — `components/layout/AppHeader.tsx`:
   - Fixed top bar, 56px height, z-index `--z-header`
   - Left: "KB" logo link (Inter 700, 18px) → navigates to home
   - Center: search placeholder input (non-functional for now — search comes in Iteration 3)
   - Right: "+ New" button (primary variant; non-link for now, Iteration 4 makes it functional)
2. **Root layout** — `app/layout.tsx`:
   - Root HTML with lang attribute
   - Include font classes
   - Wrap with `<AppHeader />` and `<main id="main-content" class="flex-1">` for skip-link anchor
3. **Route group** — Create `app/(public)/layout.tsx`:
   - Wraps all public-facing routes
   - For now, just renders `children`

### 1.7 Configure Development Workflow

Set up code quality tools and package scripts.

**Steps:**
1. Configure `package.json` scripts:
   - `"dev": "next dev"`
   - `"build": "next build"`
   - `"start": "next start"`
   - `"lint": "next lint"`
   - `"seed": "tsx scripts/seed.ts"`
   - `"db:generate": "drizzle-kit generate"`
   - `"db:push": "drizzle-kit push"`
2. Install `tsx` for running seed script: `npm install -D tsx`
3. Install `uuid` for generating UUIDs: `npm install uuid` and `npm install -D @types/uuid`
4. Verify `npm run dev` works and the app shell renders with design tokens applied at localhost:3000
5. Run `npm run lint` — fix any warnings

---

## Iteration Notes

- This iteration produces no user-visible product features — only the **foundation**. By the end, a developer should see the app shell with the header at `http://localhost:3000`, and `data/knowledge-base.db` should contain seeded articles.
- The FTS5 migration file is **written** but **not yet applied**. Only the articles table and categories table exist at this point.
- All seeded articles default to `status: 'published'` so Iteration 2 can display them without worrying about status filtering.
- Categories are seeded but only rendered as static labels in the sidebar — filtering is not functional yet.

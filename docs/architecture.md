# Technical Architecture Specification: Simplified Knowledge Base App

This document serves as the complete Technical Architecture Specification for the **v1 Simplified Knowledge Base App**. It defines the core technologies, design decisions, data models, integrations, and testing strategies required for a developer to implement the system from scratch.

---

## 1. Executive Summary & Core Architectural Principles

The Simplified Knowledge Base App is designed as a **local-first, high-performance, unified full-stack application**. Grounded in the constraints of a small team (approx. 100 concurrent users, small-to-medium article sets), the architecture prioritizes **simplicity, zero external operational dependencies, strict type safety, and modern user ergonomics**.

### Core Architecture Principles:
1. **Local-First Simplicity**: Avoid heavy database systems (e.g., PostgreSQL, MySQL) or external search engines (e.g., Elasticsearch, Algolia) for local development. Use **SQLite** and **FTS5** for database storage and full-text indexing, requiring zero Docker setups or external cloud services.
2. **Unified Type Safety**: Leverage **TypeScript**, **Drizzle ORM**, and **Next.js Server Actions** to ensure strict compiler guarantees from the database schema layer up to the UI components.
3. **Optimized for Reading & Authoring**: Next.js **React Server Components (RSC)** are utilized to render article pages and browse views on the server with minimal JavaScript shipping to the client, while highly interactive pages (e.g., Markdown editor preview) utilize lightweight **React Client Components**.
4. **Clean Aesthetics & Vanilla Design**: As per global constraints, the application uses **Vanilla CSS with CSS Modules** for max speed, portability, and readability, avoiding the complexity of Tailwind or runtime CSS-in-JS libraries.

---

## 2. Technical Stack & Exact Versions

To fulfill the mandate of using the most modern, stable dependencies, the tech stack is pinned to the following verified stable versions as of May 2026:

| Layer | Technology | Exact Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js (Active LTS) | `^24.0.0` | Active LTS version offering modern V8 performance and built-in SQLite/ESM capabilities. |
| **Framework** | Next.js (App Router) | `16.2.6` | Standard for React-based server rendering, supporting Server Actions, RSCs, and static generation. |
| **Core UI Library**| React | `19.2.6` | Integrated with Next.js, featuring React Server Components, Actions, and improved hooks (`useActionState`, `useTransition`). |
| **Database** | SQLite | `3.53.1` | Local, file-based SQL engine. Fast, zero-config, highly portable. |
| **Database Driver** | better-sqlite3 | `^11.0.0` | Fast, synchronous Node.js binding for SQLite. |
| **ORM** | Drizzle ORM | `1.0.0` | Highly performant TypeScript ORM providing a SQL-like dialect and zero runtime translation overhead. |
| **Drizzle Kit** | drizzle-kit (Dev) | `^0.31.0` | Developer tool for generating and running database migrations. |
| **Markdown Parser**| marked | `18.0.3` | Extremely fast and lightweight markdown-to-HTML compliance parser. |
| **Sanitizer** | isomorphic-dompurify | `^2.20.0` | Server and client-compatible sanitizer to mitigate XSS in Markdown rendering. |
| **Unit Testing** | Vitest | `4.1.6` | Vite-native fast test runner with Jest compatibility. |
| **UI Testing** | @testing-library/react | `16.3.2` | Core library for validating component rendered outcomes. |
| **E2E Testing** | Playwright | `1.60.0` | Cross-browser integration framework for automated E2E user journeys. |
| **Styling** | Vanilla CSS (CSS Modules) | N/A (Native) | Native scoping of styles via standard `.module.css` modules. |

---

## 3. Front-End Architecture

The front-end is designed as a search-first, readable layout optimized for information density and seamless navigation.

```
┌────────────────────────────────────────────────────────┐
│                      Next.js Layout                    │
│ ┌────────────────────────────────────────────────────┐ │
│ │                  Persistent Header                 │ │
│ │  ┌───────────────┐ ┌────────────────────────────┐  │ │
│ │  │   Logo/Home   │ │    Global Search Input     │  │ │
│ │  └───────────────┘ └────────────────────────────┘  │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────┐┌─────────────────────────┐ │
│ │         Sidebar         ││        Main Pane        │ │
│ │ ┌─────────────────────┐ ││ ┌─────────────────────┐ │ │
│ │ │ Category Selector   │ ││ │ Article Content    │ │ │
│ │ │                     │ ││ │                     │ │ │
│ │ │ - Engineering (12)  │ ││ │ [Dynamic Browse list│ │ │
│ │ │ - Product     (5)   │ ││ │  or Details View    │ │ │
│ │ │ - Operations  (2)   │ ││ │  or Markdown Editor]│ │ │
│ │ └─────────────────────┘ ││ └─────────────────────┘ │ │
│ └─────────────────────────┘└─────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 3.1 Layout & Navigation Flow
*   **Persistent Sidebar**: Displays all active categories along with the article counts for quick filtering. When an article is selected, it transitions smoothly into view without reloading the category list, leveraging Next.js layout preservation.
*   **Search-First Focus**: The global header features a persistent search input that drives the list view via URL search query changes (`?search=query`), supporting instant sharing of search states.
*   **State Management**:
    *   **Server-Driven State**: The core page content (article content, list of articles, category counts) is read directly from the URL query params (`/articles?category=engineering&search=setup`) and populated server-side via Server Components.
    *   **Client-Driven State**: Local UX transitions (e.g., whether the sidebar is collapsed, search input focus states, or the content of the Markdown editor before submitting) are handled via local React 19 state.

### 3.2 Responsive Design & Aesthetic Tokens
Styling is configured globally via Vanilla CSS variables in `styles/variables.css` and scoped component styling in CSS Modules. The styling strategy defines a highly readable, sleek workspace aesthetic.

```css
/* src/styles/variables.css */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', Fira Code, monospace;

  /* Premium Calm & Cool Color Palette */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --border-color: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-soft: #eff6ff;
  
  --status-draft-bg: #fef3c7;
  --status-draft-text: #b45309;
  --status-pub-bg: #dcfce7;
  --status-pub-text: #15803d;

  /* Spacing Tokens */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Borders & Shadows */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

  /* Micro-Animations */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --border-color: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
    
    --accent-primary: #3b82f6;
    --accent-hover: #60a5fa;
    --accent-soft: #1e3a8a;
  }
}
```

---

## 4. Back-End Architecture

The back-end runs as an integrated Next.js runtime. This simplifies dev setups by compiling all operations into a single standard node process executing locally.

### 4.1 Integration Pattern
All data reads (fetching articles, categories, and searching) run in **React Server Components** directly communicating with SQLite via Drizzle ORM.
*   All data writes (creating, updating, deleting articles) use **Next.js Server Actions**.
*   This removes standard JSON API endpoint boilerplate and ensures total type safety.

### 4.2 Database Configuration & WAL Mode
For SQLite to comfortably handle 100 concurrent users without blocking or locking, the database connection is initialized with **Write-Ahead Logging (WAL)** enabled. WAL allows concurrent reads and writes.

```typescript
// src/lib/db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || 'data/kb.db');

// Enable WAL Mode for High Performance Concurrency
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
```

---

## 5. Data Model & Persistence Strategy

The database uses SQLite v3.53.1 and stores all documents in a local file (`data/kb.db`). The relational design is shown below:

```
                  ┌───────────────┐
                  │  CATEGORIES   │
                  └───────┬───────┘
                          │ 1
                          │
                          │ 0..* (On Delete: Set Null)
                  ┌───────▼───────┐
                  │   ARTICLES    │
                  └───────┬───────┘
                          │
                          │ Triggers Sync
                          │
                  ┌───────▼───────┐
                  │ ARTICLES_FTS  │ (Virtual FTS5 Table)
                  └───────────────┘
```

### 5.1 Relational Schema Definitions (Drizzle ORM)

```typescript
// src/lib/schema.ts
import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Categories Table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  categorySlugIdx: index('idx_categories_slug').on(table.slug),
}));

// Articles Table
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(), // Markdown format
  status: text('status', { enum: ['draft', 'published'] })
    .notNull()
    .default('published'),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  articleSlugIdx: index('idx_articles_slug').on(table.slug),
  articleCategoryIdx: index('idx_articles_category_id').on(table.categoryId),
}));

// Relations setup
export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
}));
```

### 5.2 Persistence & Backup Strategy
*   **Storage Location**: The SQLite database will be written to a persistent directory in the workspace root, `data/kb.db`. This folder must be ignored in Git, but the schema migrations directory is checked into repository control.
*   **Backup Strategy**: For single-instance VMs or local environments:
    *   **Simple VM Setup**: Set up a nightly cron job that copies `data/kb.db` to a backup location.
    *   **Scalable Edge / Distributed Setup**: Integrate **Litestream**, a lightweight open-source tool that runs alongside the application and streams changes from the SQLite WAL file directly to AWS S3 or Cloudflare R2 on a sub-second interval.

---

## 6. Feature-Specific Architecture Decisions

### 6.1 Feature 1: Markdown Editing & Dynamic Live Preview
The editing experience allows users to draft articles in clean Markdown, displaying a live preview side-by-side (on desktop) or in a toggleable pane.

```
┌────────────────────────────────────────────────────────┐
│ Title: [ Setup Node.js Project                       ] │
│ Category: [ Engineering                          ] [v] │
│ Status: (o) Published   ( ) Draft                      │
├────────────────────────────────────────────────────────┤
│ EDITOR (MARKDOWN)         │ PREVIEW (LIVE RENDERED)    │
│ # Setup Node.js           │ Setup Node.js              │
│                           │                            │
│ Install the dependencies: │ Install the dependencies:  │
│ ```bash                   │ * npm i drizzle-orm        │
│ npm i drizzle-orm         │                            │
│ ```                       │                            │
└────────────────────────────────────────────────────────┘
```

*   **Implementation Strategy**:
    *   The Markdown Editor is built as a **React Client Component**.
    *   To prevent excessive rendering lag, the preview uses standard React input binding debounced by 75ms.
    *   `marked` (v18.0.3) is used for rendering.
    *   To mitigate XSS attacks (e.g., an author embedding `<script>fetch('http://malicious.com')</script>`), all output is sanitized on the client during rendering and on the server during database entry via `isomorphic-dompurify` (v2.20.0).

```typescript
// src/components/MarkdownEditor.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { updateArticleAction } from '@/lib/actions';
import styles from './MarkdownEditor.module.css';

interface EditorProps {
  article: {
    id: number;
    title: string;
    content: string;
    categoryId: number | null;
    status: 'draft' | 'published';
  };
  categories: { id: number; name: string }[];
}

export function MarkdownEditor({ article, categories }: EditorProps) {
  const [content, setContent] = useState(article.content);
  const [title, setTitle] = useState(article.title);
  const [categoryId, setCategoryId] = useState(article.categoryId || '');
  const [status, setStatus] = useState(article.status);
  const [isPending, startTransition] = useTransition();

  // Parse and Sanitize the live Markdown preview
  const renderedHtml = DOMPurify.sanitize(marked.parse(content) as string);

  const handleSave = () => {
    startTransition(async () => {
      await updateArticleAction({
        id: article.id,
        title,
        content,
        categoryId: categoryId ? Number(categoryId) : null,
        status,
      });
    });
  };

  return (
    <div className={styles.editorContainer}>
      <div className={styles.metaRow}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className={styles.titleInput} 
          placeholder="Article Title"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button onClick={handleSave} disabled={isPending} className={styles.saveBtn}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      <div className={styles.splitView}>
        <textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          className={styles.textareaEditor}
          placeholder="Write your article in Markdown..."
        />
        <div 
          className={styles.previewPane} 
          dangerouslySetInnerHTML={{ __html: renderedHtml }} 
        />
      </div>
    </div>
  );
}
```

---

### 6.2 Feature 2: High-Performance Search (SQLite FTS5 Extension)
Standard SQL `LIKE` queries perform poorly and lack relevance scoring. To achieve sub-millisecond search across article titles and content without spinning up heavy services, we implement **SQLite FTS5 (Full Text Search)**.

*   **Implementation Strategy**:
    *   An FTS5 virtual table `articles_fts` is declared in database migrations.
    *   We configure native SQLite triggers (`AFTER INSERT`, `AFTER UPDATE`, `AFTER DELETE`) on the standard `articles` table to automatically sync content into the FTS virtual index.
    *   Search operations query the FTS table using the `MATCH` operator, utilizing the `bm25` algorithm for ranking. Title matches are boosted over content matches by scaling search tokens.

#### Migration Setup (SQL DDL):
```sql
-- Migration: Enable FTS5 and build Triggers
-- Create the FTS5 Virtual Table
CREATE VIRTUAL TABLE articles_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  tokenize='porter unicode61'
);

-- Sync Trigger: AFTER INSERT
CREATE TRIGGER trg_articles_fts_insert AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(id, title, content) 
  VALUES (new.id, new.title, new.content);
END;

-- Sync Trigger: AFTER UPDATE
CREATE TRIGGER trg_articles_fts_update AFTER UPDATE ON articles BEGIN
  UPDATE articles_fts 
  SET title = new.title, content = new.content 
  WHERE id = old.id;
END;

-- Sync Trigger: AFTER DELETE
CREATE TRIGGER trg_articles_fts_delete AFTER DELETE ON articles BEGIN
  DELETE FROM articles_fts WHERE id = old.id;
END;
```

#### Query Execution in Back-End:
```typescript
// src/lib/search.ts
import { db } from './db';
import { sql } from 'drizzle-orm';
import { articles } from './schema';

export async function searchArticles(queryStr: string) {
  if (!queryStr.trim()) {
    return db.query.articles.findMany({
      where: (articles, { eq }) => eq(articles.status, 'published'),
    });
  }

  // Clean the input to prevent FTS5 syntax errors
  const sanitizedQuery = queryStr.replace(/[^\w\s]/g, '').trim();
  if (!sanitizedQuery) return [];

  // Match query tokens. Title matches get 3x higher weight via query formulation
  const ftsQuery = `title:(${sanitizedQuery})^3 OR content:(${sanitizedQuery})`;

  const results = await db.all<any>(sql`
    SELECT a.*, fts.bm25 
    FROM articles_fts fts
    JOIN articles a ON a.id = fts.id
    WHERE articles_fts MATCH ${ftsQuery} AND a.status = 'published'
    ORDER BY bm25 ASC
  `);

  return results;
}
```

---

### 6.3 Feature 3: Organization & Lifecycle Management (Categories & Statuses)
*   **Cascade Mechanics**: Category deletion triggers an `ON DELETE SET NULL` database constraint. This ensures that deleting a category does not accidentally drop articles; they simply revert to an uncategorized state (which features an intuitive empty state list filter in the UI).
*   **Article Status**: The database enforces that an article is either `draft` or `published`. By default, all public queries globally inject `and status = 'published'` conditions, unless a user is authenticated or an admin flag is checked.

---

## 7. Front-End / Back-End Integration

Next.js Server Actions decouple the front-end components from routing layers. There are no manual Axios/fetch calls to manage, and all arguments pass through Zod validators before writing to SQLite.

### 7.1 Data Action & Validation Flow
```
┌─────────────────┐       Validate (Zod Schema)       ┌──────────────────┐
│  Client Event   ├──────────────────────────────────►│  Server Action   │
│  (Form Submit)  │◄──────────────────────────────────┤ (Write Database) │
└─────────────────┘        Return Status / Msg        └──────────────────┘
```

### 7.2 Validation & Form Submission Schemas
All data transfers are strictly validated using `zod` v3.23.0 to protect against SQL injections or schema corruption.

```typescript
// src/lib/actions.ts
'use server';

import { db } from './db';
import { articles } from './schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const articleSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100),
  content: z.string().min(5, 'Content must contain markdown details'),
  categoryId: z.number().nullable(),
  status: z.enum(['draft', 'published']),
});

export async function createArticleAction(formData: z.infer<typeof articleSchema>) {
  const result = articleSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  const { title, slug, content, categoryId, status } = result.data;

  await db.insert(articles).values({
    title,
    slug,
    content,
    categoryId,
    status,
  });

  revalidatePath('/articles');
  return { success: true };
}

export async function updateArticleAction(formData: z.infer<typeof articleSchema> & { id: number }) {
  const result = articleSchema.safeParse(formData);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }

  const { id, title, slug, content, categoryId, status } = result.data;

  await db.update(articles)
    .set({
      title,
      slug,
      content,
      categoryId,
      status,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id));

  revalidatePath(`/articles/${slug}`);
  revalidatePath('/articles');
  return { success: true };
}
```

---

## 8. Repository Structure & Developer Workflow

The workspace is organized as a clean, standardized Next.js structure.

```
.
├── Caddyfile / nginx.conf      # Reverse proxy configuration (if applicable)
├── data/                       # IGNORED. Folder housing the kb.db SQLite file
├── docs/                       # Architecture documents, briefs, specs
│   ├── product-brief.md
│   └── architecture.md
├── drizzle.config.ts           # Drizzle schema path and migration configurations
├── package.json
├── playwright.config.ts        # E2E integration config
├── tsconfig.json
├── vitest.config.ts            # Unit testing config
└── src/
    ├── app/                    # Next.js App Router root
    │   ├── layout.tsx          # General frame layout
    │   ├── page.tsx            # Landing/Search route
    │   ├── articles/
    │   │   ├── page.tsx        # Search/Browse List Page
    │   │   ├── [slug]/
    │   │   │   ├── page.tsx    # Article Detail View (Server Component)
    │   │   │   └── edit/
    │   │   │       └── page.tsx# Article Edit View (Markdown Editor)
    │   │   └── new/
    │   │       └── page.tsx    # Article Creation view
    │   └── api/                # Non-action HTTP endpoints
    │       └── search/
    │           └── route.ts
    ├── components/             # Reusable Client/Server components
    │   ├── MarkdownEditor.tsx
    │   ├── MarkdownEditor.module.css
    │   ├── Sidebar.tsx
    │   └── Sidebar.module.css
    ├── lib/                    # Business Logic / Setup
    │   ├── actions.ts          # Server Actions (Mutations)
    │   ├── db.ts               # Database Client
    │   ├── schema.ts           # Drizzle SQL Model Schema
    │   └── search.ts           # FTS5 search functions
    └── styles/
        ├── globals.css         # Reset rules and typography setup
        └── variables.css       # Design System CSS custom variables
```

### 8.1 Git Workflow & Commit Guidelines
1. **Branching Strategy**:
    *   `main`: Protected production branch.
    *   `feature/*` / `bugfix/*`: Developer branches that must be validated with Vitest and Playwright before getting merged.
2. **Commit Conventions**:
    Follow standard **Conventional Commits**:
    *   `feat(editor): implement live marked parser preview`
    *   `fix(search): escape syntax characters in FTS5 strings`
    *   `test(e2e): add playwright browse to edit user flow`
3. **Pre-commit Automation**:
    Integrate `husky` and `lint-staged` into `package.json` to execute prettier checking and typescript compiling validation prior to committing code.

---

## 9. Testing Strategy

The QA strategy is layered to cover both fast-executing unit code logic and full integrated browser E2E workflows.

### 9.1 Unit & Integration Testing (Vitest & React Testing Library)
Vitest v4.1.6 handles validation of decoupled functions like search cleaning, validation constraints, and HTML sanitization.

```typescript
// src/lib/search.test.ts
import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

// Test search input sanitizer logic
function sanitizeSearchQuery(input: string): string {
  return input.replace(/[^\w\s]/g, '').trim();
}

describe('Search Query Sanitation', () => {
  it('should remove special characters that crash FTS5 engines', () => {
    const dangerousInput = 'setup node.js * AND MATCH "select';
    const clean = sanitizeSearchQuery(dangerousInput);
    expect(clean).toBe('setup nodejs  AND MATCH select');
  });

  it('should handle completely blank empty string states safely', () => {
    expect(sanitizeSearchQuery('!!!')).toBe('');
  });
});

describe('Markdown Processing & DOMPurify Sanitization', () => {
  it('should securely filter injected executable script inputs', () => {
    const rawMarkdown = '# Hello\n<script>alert("hack")</script>\n[Go](javascript:alert(1))';
    const parsedHtml = marked.parse(rawMarkdown) as string;
    const cleanHtml = DOMPurify.sanitize(parsedHtml);
    
    expect(cleanHtml).toContain('<h1>Hello</h1>');
    expect(cleanHtml).not.toContain('<script>');
    expect(cleanHtml).not.toContain('javascript:');
  });
});
```

---

### 9.2 End-to-End E2E Testing (Playwright)
Playwright v1.60.0 is used to test the user's primary journey: landing, finding an article through search, moving to the editing pane, modifying detail text, and validating changes.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### E2E Scenario Script:
```typescript
// tests-e2e/kb-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Knowledge Base Primary Journeys', () => {
  test('should successfully browse, search, and edit an article', async ({ page }) => {
    // 1. Visit main page and ensure categories are rendered in sidebar
    await page.goto('/');
    await expect(page.locator('nav')).toContainText('Engineering');

    // 2. Perform global search
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Node.js');
    await searchInput.press('Enter');

    // Ensure search results route is loaded and displays results
    await expect(page).toHaveURL(/\/articles\?search=Node\.js/);
    
    // Select first matching article
    const articleLink = page.locator('main a').first();
    await expect(articleLink).toBeVisible();
    await articleLink.click();

    // 3. Review Details View
    await expect(page.locator('h1')).toContainText('Node.js');

    // 4. Click edit action button
    const editBtn = page.locator('a:has-text("Edit Article")');
    await editBtn.click();

    // 5. Interact with Markdown editor
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    
    // Add additional content text
    await textarea.fill('Adding custom notes for production build logs.');
    
    // Select status as 'published' and save
    await page.locator('select:has-text("Draft")').selectOption('published');
    await page.locator('button:has-text("Save")').click();

    // 6. Verify success callback by redirecting and ensuring text updates exist
    await expect(page.locator('div[class*="previewPane"]')).toContainText('custom notes');
  });
});
```

---

## 10. Local Development & Run Instructions

Follow these step-by-step setup guides to spin up the full-stack environment locally.

### 10.1 Prerequisites
*   Node.js v24.x (LTS) or Node.js v22.x
*   npm v10.x or higher

### 10.2 Installation Steps

1. **Clone the repository and install core files**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a local configuration file `.env` by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```

   **`.env.example` file**:
   ```env
   # Database Local File URL
   DATABASE_URL="data/kb.db"
   
   # Dev server configurations
   PORT=3000
   NODE_ENV="development"
   ```

3. **Bootstrap SQLite Directory & Run Migrations**:
   Create the required local folder structure for the database storage:
   ```bash
   mkdir -p data
   ```

   Generate and push the migrations schema definitions directly into SQLite:
   ```bash
   npm run db:push
   ```

4. **Seed the database (Optional but Recommended)**:
   Loads mock categories and documents into the database for immediate review:
   ```bash
   npm run db:seed
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 10.3 Core CLI Commands for Developers
*   `npm run dev`: Starts the Next.js development server.
*   `npm run build`: Compiles production optimized Next.js app bundles.
*   `npm run lint`: Performs static analysis on JavaScript and TypeScript syntax.
*   `npm run test`: Starts Vitest for fast unit test loops.
*   `npm run test:e2e`: Spins up Playwright for E2E integrations checking.
*   `npm run db:studio`: Launches Drizzle Studio to browse SQLite data in a GUI.

---

## 11. Non-Functional Architecture Decisions

### 11.1 Accessibility (a11y)
*   **Semantic HTML**: Ensure absolute compliance with HTML5 layouts (e.g., `<header>`, `<main>`, `<nav>`, `<aside>`, `<article>`, `<footer>`).
*   **Aria Roles & Focus States**: All interactive elements (e.g., Markdown tabs or filter tags) must have appropriate `aria-expanded` and explicit `focus` outlining styled clearly in CSS Modules.
*   **Contrast**: Keep all text content above the `4.5:1` ratio constraint matching Web Content Accessibility Guidelines (WCAG) AA standards.

### 11.2 Performance & Caching
*   **SQLite Optimization**: Always execute DB instances in WAL mode. Add multi-column covering indexes on search/navigation filters.
*   **Next.js Cache Optimization**: Dynamic pages using search params (e.g., search lists) will dynamically fetch, while individual static article detailed views are configured with **Incremental Static Regeneration (ISR)** via `revalidatePath`, rendering pre-compiled pages instantly.
*   **Input Debounce**: Client keydown inputs on searches must wait for `200ms` of idle time before forcing page navigation parameter reloads, optimizing performance.

### 11.3 Security Measures
*   **HTML Sanitization**: Under no circumstances should raw user markdown parsed outputs be printed without `isomorphic-dompurify` processing.
*   **Parameterized DB Queries**: Handled implicitly by Drizzle ORM to protect SQLite files from malicious raw injections.
*   **Zod Mutation Guarding**: All Server Actions strictly parsing arguments before execution.

---

## 12. Architectural Decisions Log (Tradeoffs)

### Decision 1: SQLite with FTS5 vs. PostgreSQL & Typesense/Elasticsearch
*   **Context**: The application serves a small team (100 concurrent users) and hosts a small-to-medium volume of internal articles.
*   **Chosen Option**: **SQLite with FTS5**.
*   **Tradeoffs**:
    *   *Pros*: Zero infrastructure overhead. Runs out of the box in standard environments without needing Docker, local installations, or cloud instances. WAL mode handles concurrency seamlessly. FTS5 provides sub-millisecond full-text indexing out of the box.
    *   *Cons*: Limited to single-server vertical scaling. For extremely massive multi-region scale or millions of items, switching to PostgreSQL and a managed engine (Typesense or Meilisearch) would eventually be required. However, Drizzle makes swapping DB drivers trivial.

### Decision 2: Next.js App Router (Full Stack) vs. Vite SPA + Express API
*   **Context**: The app should be realistic and easily maintainable.
*   **Chosen Option**: **Next.js App Router (Full Stack)**.
*   **Tradeoffs**:
    *   *Pros*: Next.js Server Components run direct SQLite queries natively inside the component, eliminating API request boilerplate and serialization costs. Server Actions unify type safety between client submissions and server validators. Single terminal process to run, optimize, and build.
    *   *Cons*: Higher learning curve than simple static single-page apps (SPAs) and raw Express routing. However, ergonomics and speed gains far outweigh routing friction.

### Decision 3: Drizzle ORM vs. Prisma
*   **Context**: Maintain clean SQL patterns and fast execution.
*   **Chosen Option**: **Drizzle ORM**.
*   **Tradeoffs**:
    *   *Pros*: Drizzle is extremely lightweight (basically a thin TypeScript layer over native SQL queries). It does not run separate rust query engine sidecars (like Prisma), which improves local startup speed and drastically reduces bundle footprint.
    *   *Cons*: Prisma has slightly better GUI tools (Prisma Studio) and longer history, but Drizzle Kit Studio has matured and fully satisfies all development requirements.

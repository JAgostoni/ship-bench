# Technical Architecture Spec: Knowledge Base App

## Product Summary
Internal knowledge-base application for small teams (≤100 concurrent users) to create, browse, search, and maintain documentation in one place. The app must be realistic enough to test product judgment, UX, architecture, and QA, but simple enough to complete in ~1-2 engineering sessions.

## Architecture Decisions Log

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Frontend framework | Next.js 16.2.4 (App Router) | Full-stack server components reduce API boilerplate; excellent DX; widely adopted |
| 2 | UI framework | React 19.2.5 | Latest stable; concurrent rendering features; pairs natively with Next.js 16 |
| 3 | Styling | Tailwind CSS 4.2.4 + shadcn/ui | Utility-first for rapid development; component library accelerates UI consistency |
| 4 | Database | SQLite (better-sqlite3) | Zero-configuration local-first database; perfect for <100 concurrent users |
| 5 | ORM | Drizzle ORM 0.38.x | Type-safe queries; first-class SQLite support; fast startup; excellent DX |
| 6 | Editor | TipTap (ProseMirror-based) 2.12.x | Modern WYSIWYG; built-in heading/bold/lists; reliable preview; no heavy enterprise bloat |
| 7 | Search | SQLite FTS5 | Native full-text search; zero external services; sufficient for ≤10k articles |
| 8 | Auth | None (v1) | Product brief says "basic security assumptions only; no enterprise auth" |
| 9 | State management | React Server Components + Client state (Zustand 5.0.x) | RSC handles server data; Zustand for lightweight client UI state |
| 10 | E2E Testing | Playwright 1.50.x | Industry standard; cross-browser; excellent TypeScript support; pairs well with Next.js |
| 11 | Testing (unit) | Vitest 2.1.x + Testing Library 14.2.x | Fast, modern alternative to Jest; native ESM support; React Testing Library for component tests |

## Clarifying Assumptions
- **Team size**: ≤20 users, ≤100 concurrent requests
- **Article content length**: ≤50k words per article (search index size manageable by SQLite FTS5)
- **Deployment**: Local developer environment + Docker Compose for containerized option
- **No authentication in v1** per product brief ("basic security assumptions only")
- **File size limit**: No file uploads/images per v1 scope
- **Search language**: English only for FTS tokenizer (v1)

---

## Frontend Architecture

### Application Structure
- **Framework**: Next.js 16.2.4 (App Router) with server components by default
- **Routing**: File-based routing via App Router; route groups for organization
- **Page components**: Server components where possible; client components marked with `'use client'`
- **Styling**: Tailwind CSS 4.2.4 for utility classes with CSS custom properties for theming
- **Components**: Shared UI components in `/components/ui/` (shadcn/ui pattern)
- **Forms**: React Hook Form 7.53.x + Zod 3.23.x for validation

### Route Structure
```
app/
  (public)/
    layout.tsx          # Base layout with header, search bar
    page.tsx            # Home: Article list + category sidebar
    search/
      page.tsx          # Search results page (?q=query)
    articles/
      [id]/
        page.tsx        # Article detail view
        edit/
          page.tsx      # Article edit page
        page.tsx        # New article page (create mode)
  layout.tsx            # Root layout (fonts, base CSS)
```

### Key UI Components
- **ArticleList**: Paginated/virtualized list of article cards
- **ArticleCard**: Title, excerpt, category tags, status badge
- **SearchBar**: Debounced search input with keyboard shortcuts (Cmd/Ctrl+K)
- **CategoryFilter**: Sidebar or dropdown category/tag filter
- **ArticleEditor**: TipTap WYSIWYG editor with toolbar (bold, italic, headings, lists, links, code blocks)
- **StatusBadge**: Visual indicator for draft/published status
- **EmptyState**: Styled fallback for no results, no articles, no categories

### Client State Management
- **Zustand 5.0.x** for lightweight client UI state:
  - Editor draft state
  - UI preferences (sidebar collapsed/expanded)
  - Search query state
- **SWR 2.2.x** for client-side data fetching with caching and revalidation
- **React Server Components** for all server data fetching (eliminate client-side data fetching where possible)

## Back-end Architecture

### Server-Side Framework
- **Next.js API Routes / Route Handlers**: RESTful endpoints in `app/api/`
- **Server Actions**: Next.js 16 server actions for form submissions (create/update/delete articles)
- **Runtime**: Node.js runtime (not Edge) for SQLite compatibility

### Route Handlers (API)
```
GET    /api/articles          # List articles with pagination, filtering, search
GET    /api/articles/[id]     # Get article by ID
POST   /api/articles          # Create new article
PATCH  /api/articles/[id]     # Update article
DELETE /api/articles/[id]     # Delete article
GET    /api/categories        # List categories
POST   /api/categories        # Create category
```

### Search Implementation
- **SQLite FTS5**: Full-text search index on article title and content
- **Trigger-based sync**: Database triggers automatically update FTS index on INSERT/UPDATE
- **Search endpoint**: Returns ranked results with highlighted snippets
- **Debounced client-side search**: 300ms delay before triggering search API calls

### Server Actions
```typescript
// Example: Create article server action
'use server'
async function createArticle(data: CreateArticleInput) {
  const validated = createArticleSchema.parse(data)
  const article = await db.insert(articles).values(validated).returning()
  revalidatePath('/articles')
  return { success: true, article }
}
```

## Data Model and Persistence

### Database: SQLite (better-sqlite3)
- **Database file**: `data/knowledge-base.db` (gitignored)
- **Node.js version**: 20.x LTS (required by better-sqlite3)
- **Schema management**: Drizzle Kit for migrations

### Tables

#### articles
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| title | TEXT | NOT NULL | Article title |
| content | TEXT | NOT NULL DEFAULT '' | Article body (TipTap JSON or HTML) |
| status | TEXT | NOT NULL DEFAULT 'draft' | 'draft' or 'published' |
| created_at | TEXT (ISO 8601) | NOT NULL | Creation timestamp |
| updated_at | TEXT (ISO 8601) | NOT NULL | Last modified timestamp |

#### article_categories (junction table)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| article_id | TEXT | FK → articles.id, PK | Article reference |
| category_id | TEXT | FK → categories.id, PK | Category reference |

#### categories
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| name | TEXT | NOT NULL, UNIQUE | Category name |
| slug | TEXT | NOT NULL, UNIQUE | URL-safe slug |
| description | TEXT | DEFAULT '' | Optional description |
| created_at | TEXT (ISO 8601) | NOT NULL | Creation timestamp |

#### articles_fts (FTS5 virtual table)
| Column | Type | Description |
|--------|------|-------------|
| rowid | INTEGER | Maps to articles.id |
| title | TEXT | Indexed title |
| content | TEXT | Indexed content |

### Schema Definition (Drizzle ORM)

```typescript
// src/db/schema/articles.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').default(''),
  createdAt: text('created_at').notNull(),
})

export const articleCategories = sqliteTable('article_categories', {
  articleId: text('article_id').references(() => articles.id).notNull(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
})
```

### Migrations
Managed via `drizzle-kit` CLI. Example migration workflow:

```bash
# Generate migration from schema changes
npx drizzle-kit generate
# Push to database
npx drizzle-kit push
```

## Feature-Specific Architecture Decisions

### 1. Article Browsing and Detail Pages
**Implementation Approach**:
- Server Components for article list and detail pages
- Pagination via cursor-based approach using `created_at` timestamp
- Categories loaded in sidebar using separate server component (parallel data fetching)
- Lazy loading for article content on detail page (Next.js `dynamic()` import for editor)

**Key Technical Choices**:
- Articles displayed with excerpt (first 200 chars of content)
- Status badge rendered inline on article cards
- Infinite scroll or pagination (configurable; pagination for v1 simplicity)
- SEO-friendly URLs: `/articles/[id]` (UUID)

**Constraints**:
- No real-time collaboration (per v1 scope)
- No file uploads or embedded media

**Tradeoffs**:
- Cursor-based pagination over offset-based LIMIT/OFFSET: better performance at scale
- UUID primary keys over auto-increment integers: distributed-safe, but slightly larger indices

### 2. Search (FTS5)
**Implementation Approach**:
- SQLite FTS5 virtual table (`articles_fts`) for full-text search
- Triggers sync FTS index with articles table automatically
- Search results page shows: title, snippet with highlights, relevance score, status, category

**Search Query Format**:
```sql
SELECT a.id, a.title, a.status,
       snippet(articles_fts, 1, '<mark>', '</mark>', '…', 32) AS title_snippet,
       snippet(articles_fts, 2, '<mark>', '</mark>', '…', 64) AS content_snippet,
       rank
FROM articles_fts
JOIN articles a ON articles_fts.rowid = a.id
WHERE articles_fts MATCH 'search terms'
ORDER BY rank
LIMIT 20;
```

**Key Technical Choices**:
- Server-side search via API endpoint (not client-side filtering)
- Debounced client input (300ms) to prevent excessive queries
- Search suggestions from recent/popular searches (v1: recent only, stored in localStorage)

**Infrastructure**:
- FTS5 index created via custom SQL migration
- Search ranking uses SQLite BM25 algorithm (default for FTS5)

**Tradeoffs**:
- FTS5 over external search service (Elasticsearch/Meilisearch): simplicity for <10k articles
- Tokenized English search: no stemming for non-English languages in v1

### 3. Article Editing (TipTap Editor)
**Implementation Approach**:
- TipTap 2.12.x (ProseMirror-based WYSIWYG) for rich text editing
- Server component renders article detail view (non-editable HTML)
- Client component renders TipTap editor on edit pages
- Content stored as HTML in SQLite

**Editor Extensions**:
- Core: Bold, Italic, Underline, Strikethrough
- Headings (H1-H3)
- Ordered/Unordered Lists
- Code Blocks (with syntax highlighting)
- Links (external URLs)
- Blockquotes

**Key Technical Choices**:
- Content saved as HTML (not JSON): simpler storage, easier to display in read-only view
- Auto-save: Draft stored in localStorage every 30 seconds + explicit save button
- Form validation: Zod schema validates title/content before submission
- Server Actions for create/update submissions (eliminates API route boilerplate)

**Tradeoffs**:
- TipTap over Slate.js: more stable, better documentation, larger ecosystem
- HTML storage over JSON: simpler server rendering, but less structured for future content transformations

### 4. Category/Tag Organization
**Implementation Approach**:
- Many-to-many relationship between articles and categories
- Categories displayed in sidebar on article list and detail pages
- Category filter uses client-side UI state (no page reload)
- Server-side filtering: `/api/articles?category=category-slug`

**Key Technical Choices**:
- Hierarchical categories NOT supported (v1 simplicity)
- Category slugs auto-generated from name (e.g., "Engineering" → "engineering")

### 5. Article Status Management
**Implementation Approach**:
- Draft/Published status managed via editor UI (status toggle)
- Unpublished articles hidden from public search results
- API returns only published articles by default (opt-in for all)

**API Query Pattern**:
```sql
-- Default: published only
WHERE status = 'published'
-- Admin toggle: include drafts
```

## Front-end / Back-end Integration

### Data Fetching Strategy
- **Server Components**: Direct database queries for page renders (no API round-trips)
- **Client Components**: SWR 2.2.x for client-side data fetching with caching
- **Mutations**: Next.js Server Actions for form submissions
- **Optimistic Updates**: SWR optimistic updates for status toggles and category assignments

### API Error Handling
- Zod validation on all inputs (API routes + Server Actions)
- Standardized error format: `{ success: false, errors: [{ field, message }] }`
- HTTP status codes: 400 (validation), 404 (not found), 500 (server error)

### Caching Strategy
- **Next.js Route Cache**: Static caching for article list pages (revalidated on mutations)
- **SWR Client Cache**: 5-minute TTL for article data
- **Database**: SQLite in-memory caching for frequently accessed categories
- **Revalidation**: `revalidatePath()` after mutations to clear Next.js cache

## Repository Structure and Developer Workflow

```
knowledge-base/
├── app/                    # Next.js App Router pages
│   ├── (public)/           # Route group for public-facing pages
│   │   ├── page.tsx        # Home: article list
│   │   ├── search/         # Search results
│   │   └── articles/       # Article detail and edit routes
│   ├── api/                # API routes
│   │   └── articles/       # Article CRUD endpoints
│   ├── layout.tsx          # Root layout
│   └── global.css          # Global Tailwind styles
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Header, Footer, Sidebar
│   ├── article/            # ArticleList, ArticleCard, ArticleEditor
│   └── search/             # SearchBar, SearchResults
├── src/
│   ├── db/                 # Database configuration
│   │   ├── index.ts        # better-sqlite3 setup
│   │   └── schema/         # Drizzle schema definitions
│   ├── lib/                # Utilities
│   │   ├── articles.ts     # Article business logic
│   │   ├── categories.ts   # Category logic
│   │   ├── search.ts       # FTS5 query builder
│   │   └── validation.ts   # Zod schemas
│   ├── hooks/              # React hooks
│   └── stores/             # Zustand stores
├── drizzle/                # Drizzle migrations
│   └── migrations/         # Migration files
├── drizzle.config.ts       # Drizzle Kit config
├── playwright/             # E2E test configuration
│   └── tests/             # E2E test files
├── tests/                  # Unit and integration tests
│   ├── db.test.ts
│   ├── lib/
│   └── components/
├── public/                 # Static assets
├── data/                   # SQLite database (gitignored)
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md               # Run instructions
```

### Developer Workflow
1. **Code style**: Prettier + ESLint (provided by Next.js)
2. **Git hooks**: Husky 9.x + lint-staged 15.x for pre-commit validation
3. **TypeScript**: Strict mode enabled
4. **Commit convention**: Conventional Commits (feat:, fix:, docs:, etc.)
5. **Environment variables**: `.env.local` for development (no .env committed)

## Testing Strategy

### Unit Tests
- **Framework**: Vitest 2.1.x + Vitest UI for test reports
- **React Components**: @testing-library/react 14.2.x
- **Coverage Target**: ≥80% for core logic (src/lib/, src/db/)
- **Test Locations**: `/tests/` directory mirroring `/src/` structure

**Unit Test Scope**:
- Database queries (Drizzle ORM)
- Search query building (FTS5)
- Article CRUD operations
- Zod validation schemas
- Utility functions (slug generation, text truncation, date formatting)
- Component rendering and user interactions

```bash
npm run test        # Run unit tests
npm run test:ui     # Run Vitest with web UI
```

### Integration Tests
- **Scope**: API route handlers + Server Actions
- **Mock**: SQLite in-memory database for test isolation
- **Pattern**: Test HTTP status codes, response shapes, error handling

### E2E Tests
- **Framework**: Playwright 1.50.x
- **Browsers**: Chromium, Firefox, WebKit (cross-browser validation)
- **Test Files**: `/playwright/tests/` directory
- **Reporter**: HTML report for CI/CD visibility

**Critical User Journeys (E2E Scope)**:
1. Browse articles → Search → View details
2. Create new article → Fill form → Save → Verify published
3. Edit existing article → Update content → Verify changes
4. Category filtering → Filter by category → Verify results
5. Empty states → Verify graceful handling

```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:headed    # Run in headed mode (visual debugging)
```

### CI/CD Test Pipeline
- Lint → Type Check → Unit Tests → E2E Tests
- Fail fast on lint/type errors before running tests

## Local Development and Run Instructions

### Prerequisites
- **Node.js**: 20.x LTS (required)
- **npm**: 10.x (bundled with Node 20)
- **No Docker required**: Fully local-first SQLite setup

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Set up environment (optional, defaults work out of box)
cp .env.example .env.local
```

### Database Setup
```bash
# Push schema to SQLite database
npx drizzle-kit push
```

### Development Server
```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
```

### Production Build (Optional)
```bash
npm run build        # Build for production
npm start            # Start production server
```

### Running Tests
```bash
npm test             # Unit tests
npm run test:e2e     # E2E tests (requires running dev server)
```

### Database Inspection
```bash
# SQLite CLI
sqlite3 data/knowledge-base.db

# Or use DB Browser for SQLite
```

## Non-functional Architecture Decisions

### Performance
- **Server Components**: Eliminate waterfalls by parallel fetching in server components
- **Pagination**: Cursor-based pagination for article lists (constant memory usage)
- **Search latency**: <200ms for FTS5 queries on ≤10k articles
- **Image optimization**: Not required (v1 scope)
- **CDN**: Not required (internal app; v1)

### Security
- **No authentication** (v1 per product brief)
- **Input validation**: Zod schemas on all user inputs
- **SQL injection prevention**: Parameterized queries via Drizzle ORM
- **XSS prevention**: Content sanitized before rendering (DOMPurify 3.2.x for editor output)
- **CSRF**: Next.js Server Actions include built-in CSRF protection

### Accessibility
- **WCAG 2.1 AA baseline**: Color contrast, keyboard navigation, ARIA labels
- **Semantic HTML**: Proper heading hierarchy, landmarks, form labels
- **Screen reader support**: Tested with VoiceOver and NVDA for critical user journeys
- **Focus management**: Visible focus indicators, proper tab order, skip links
- **Reduced motion**: Respect `prefers-reduced-motion` media query

### Responsive Design
- **Breakpoints**: Mobile-first with Tailwind CSS responsive utilities
  - sm: 640px (tablets)
  - lg: 1024px (desktop)
  - xl: 1280px (large screens)
- **Mobile**: Single-column layout with collapsible sidebar
- **Tablet**: Sidebar + main content split
- **Desktop**: Full sidebar + article content + metadata panel

### Error Handling
- **Client-side**: Error boundaries for component failures
- **Server-side**: Global error handler returning standardized JSON
- **User-facing**: Clear error messages with retry capability
- **Logging**: Console logging with structured format (no external logging service in v1)

### Monitoring and Observability (v1)
- **Console logging**: Development logging only
- **Error tracking**: Console errors in production (no Sentry/LogRocket in v1)

## Decisions Log

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| SQLite vs PostgreSQL | PostgreSQL (Docker) | SQLite: zero-config, perfect for <100 users, no Docker required for local dev |
| Next.js vs Vite + React Router | Vite + Express | Next.js: full-stack server components eliminate API boilerplate; unified codebase |
| TipTap vs Markdown Editor | Markdown + MDX | TipTap: WYSIWYG better for non-technical users; MDX adds build complexity |
| Drizzle ORM vs Prisma | Prisma | Drizzle: faster SQLite support, type-safe, no runtime overhead, simpler migrations |
| FTS5 vs Meilisearch | Meilisearch/Typesense | FTS5: zero external services, perfect for ≤10k articles, built into SQLite |
| No auth (v1) | JWT/Sessions | Product brief: "basic security assumptions only; do not require enterprise auth" |
| Server Actions vs Mutations | TanStack Query | Server Actions: native to Next.js 16, eliminates API route boilerplate |
| Vitest vs Jest | Jest | Vitest: native ESM, faster startup, better TypeScript DX, same assertion library |
| Tailwind CSS vs Styled Components | CSS Modules, Styled Components | Tailwind: utility-first enables rapid development; shadcn/ui accelerates consistency |

## Future Enhancements (v2+)
- **Authentication**: NextAuth.js 5.x for role-based access (admin vs reader)
- **Full-text search service**: Meilisearch for advanced features (fuzzy matching, typo tolerance)
- **Real-time collaboration**: WebSockets for concurrent editing
- **File uploads**: AWS S3 for article attachments and images
- **Versioning**: Article history with diff visualization
- **Export**: PDF/Markdown export for articles
- **i18n**: Multi-language support with locale-based routing

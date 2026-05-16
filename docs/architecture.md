# Technical Architecture Spec: Knowledge Base App

## Overview
A high-performance, internal knowledge-base application built for small teams. This spec prioritizes developer ergonomics, "local-first" simplicity, and a clear path to scaling for 100+ concurrent users.

## Core Tech Stack
- **Frontend**: React 19.2.6 (Vite 8.0.13 / Rolldown)
- **Backend**: Node.js 24 (LTS), Express 5.2.x
- **Database**: PostgreSQL 17 (managed via Prisma 7.8.0)
- **Validation**: Zod 4.4.3
- **Styling**: Vanilla CSS (CSS Modules)
- **Testing**: Vitest (Unit/Integration), Playwright 1.59.1 (E2E)

---

## 1. Front-end Architecture
The frontend is a Single Page Application (SPA) optimized for readability and fast navigation.

- **Framework**: React 19 utilizing Concurrent Mode features and optimized Server Component-like patterns where applicable.
- **State Management**: 
  - **Server State**: `TanStack Query` (formerly React Query) v5 for caching and synchronization.
  - **Local UI State**: React `useState` and `useContext` for shared UI themes or modals.
- **Routing**: `React Router` v7 (formerly Remix Router).
- **Editor**: A custom Markdown editor component using a controlled `<textarea>` with a real-time preview powered by `react-markdown`.
- **Styling Strategy**: 
  - **Vanilla CSS Modules**: Standard CSS with local scoping to prevent style leakage.
  - **Design System**: A custom set of CSS variables (`:root`) for colors, spacing (4px grid), and typography (Inter/Geist).
- **Icons**: `Lucide React` for a clean, consistent UI.

---

## 2. Back-end Architecture
A RESTful API focused on simplicity and type safety.

- **API Framework**: Express 5.2.x using the new built-in async error handling.
- **ORM**: Prisma 7.8.0 for type-safe database access and migrations.
- **Validation**: Zod 4.4.3 for request body and query parameter validation.
- **Authentication**: Basic session-based or JWT (placeholder for v1 as per brief: "Basic security assumptions only").
- **Search**: PostgreSQL Full-Text Search (FTS) using `tsvector` and `tsquery` for efficient search across titles and content.

---

## 3. Data Model and Persistence
The database schema is designed for clear organization and searchability.

### Schema (Prisma)
```prisma
enum ArticleStatus {
  DRAFT
  PUBLISHED
}

model Article {
  id          String        @id @default(uuid())
  title       String
  slug        String        @unique
  content     String        @db.Text
  excerpt     String?
  status      ArticleStatus @default(DRAFT)
  category    Category?     @relation(fields: [categoryId], references: [id])
  categoryId  String?
  tags        ArticleTag[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([title, content]) // For FTS optimization
}

model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  articles    Article[]
}

model Tag {
  id          String       @id @default(uuid())
  name        String       @unique
  articles    ArticleTag[]
}

model ArticleTag {
  article     Article @relation(fields: [articleId], references: [id])
  articleId   String
  tag         Tag     @relation(fields: [tagId], references: [id])
  tagId       String

  @@id([articleId, tagId])
}
```

---

## 4. Feature-Specific Architecture Decisions

### Feature: Search across titles and content
- **Implementation**: Utilize PostgreSQL's GIN (Generalized Inverted Index) on a generated column or directly via Prisma's `raw` queries for high-performance FTS.
- **Constraint**: Avoid external search engines (Elasticsearch/Algolia) to keep local setup simple.
- **Tradeoff**: Slightly higher DB load than dedicated search, but negligible for < 10,000 articles.

### Feature: Markdown Editing with Preview
- **Approach**: Implementation will use a side-by-side layout or a "Preview Mode" toggle. 
- **Library**: `react-markdown` for rendering; `shiki` for code block syntax highlighting (consistent with modern dev tools).
- **Sync**: Use a `useDeferredValue` hook in React 19 to ensure the preview rendering doesn't block the typing experience.

---

## 5. Front-end / Back-end Integration
- **Contract**: JSON-based REST API.
- **Error Handling**: Standardized RFC 7807 Problem Details for HTTP APIs.
- **Client**: `axios` or native `fetch` with Zod validation on the response.

### API Examples
**GET /api/articles**
- Query: `search`, `category`, `tag`, `status`, `page`, `limit`
- Response: `{ items: Article[], total: number, page: number }`

**GET /api/articles/:slug**
- Response: `Article` (including relations)

**POST /api/articles**
- Body: `{ title: string, content: string, categoryId?: string, status?: 'DRAFT' | 'PUBLISHED' }`
- Response: `Article`

**PATCH /api/articles/:id**
- Body: Partial article updates.
- Response: `Article`

---

## 6. Repository Structure
```text
/
├── apps/
│   ├── web/               # React application
│   └── api/               # Express server
├── packages/
│   ├── db/                # Shared Prisma client and migrations
│   └── types/             # Shared TypeScript interfaces (Zod schemas)
├── docs/                  # Documentation
├── docker-compose.yml     # Local Postgres setup
└── package.json           # Turborepo or npm workspaces root
```

---

## 7. Testing Strategy
- **Unit Testing**: Vitest for utility functions and React hooks.
- **Integration Testing**: Supertest for API endpoint testing.
- **E2E Testing**: Playwright 1.59.1.
  - **Journey 1**: User browses the homepage, clicks an article.
  - **Journey 2**: User searches for "deployment", finds relevant articles.
  - **Journey 3**: User edits an article and saves changes.

---

## 8. Local Development
1. **Prerequisites**: Node.js 24+, Docker.
2. **Setup**:
   - `npm install`
   - `docker-compose up -d` (Starts Postgres)
   - `npx prisma migrate dev`
   - `npm run seed`
3. **Run**: `npm run dev` (Starts web and api concurrently).

---

## 9. Non-Functional Decisions
- **Performance**: Implement "Skeleton Screens" for initial article loading.
- **Accessibility**: Use ARIA landmarks and ensure contrast ratios meet WCAG 2.1 AA (tested via Playwright-Axe).
- **Responsive**: Mobile-first CSS Grid/Flexbox layout.

---

## 10. Decisions Log
| ID | Decision | Rationale |
| :--- | :--- | :--- |
| DEC-001 | PostgreSQL FTS | Simplifies local development while providing production-grade search performance for the target scale. |
| DEC-002 | React 19 + Vite 8 | Uses the fastest current bundler and most stable React version for future-proofing. |
| DEC-003 | Vanilla CSS Modules | Balances the "Cinematic Monolith" aesthetic requirements with developer productivity and zero-runtime overhead. |
| DEC-004 | Monorepo Structure | Keeps API and Web types in sync easily as the project grows. |

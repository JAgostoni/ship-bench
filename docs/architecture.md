# Technical Architecture Spec: Simplified Knowledge Base App

## 1. Overview
This document outlines the technical architecture for the v1 Simplified Knowledge Base App. The goal is to build an internal knowledge-base application that is easy to run locally, performant, accessible, and simple to maintain.

## 2. Tech Stack & Exact Versions
To prioritize simplicity, developer ergonomics, and straightforward scaling, we are using a full-stack Next.js architecture with a local SQLite database.

*   **Runtime:** Node.js 24 (Active LTS)
*   **Framework:** Next.js 16.2 (App Router)
*   **UI Library:** React 19.2.5
*   **Styling:** Vanilla CSS (CSS Modules) - explicitly avoiding Tailwind per design guidance.
*   **Database:** SQLite
*   **ORM:** Prisma 7.7.0
*   **E2E Testing:** Playwright 1.59.1
*   **Markdown Parsing:** `react-markdown` (with `remark-gfm`)

## 3. Front-End Architecture
We will use the **Next.js App Router** for the frontend, taking advantage of React 19 features and Next.js 16's Turbopack and enhanced caching.

*   **Routing:** File-system based routing (e.g., `/`, `/articles/[slug]`, `/articles/edit/[slug]`, `/search`).
*   **Data Fetching:** React Server Components (RSCs) will be used to fetch data directly from the Prisma database on the server, eliminating the need for client-side fetching waterfalls for read-heavy views.
*   **Styling:** CSS Modules (`.module.css`) to provide scoped, standard Vanilla CSS. Global variables (CSS custom properties) will be used for theme colors, typography, and spacing to ensure a consistent, dense, and readable UI.
*   **Markdown Rendering:** Articles will be written in Markdown. We will use `react-markdown` to safely render the content on detail pages.

## 4. Back-End Architecture
The backend is integrated directly into the Next.js application, eliminating the need for a separate API server repository.

*   **Mutations:** Next.js **Server Actions** will handle all form submissions (creating and editing articles). This provides a seamless, type-safe RPC-like integration between client components and the server without boilerplate API routes.
*   **Search:** For v1, search will be implemented via a basic SQLite `LIKE` query on the `title` and `content` fields. This is sufficient for a small-to-medium article set and 100 concurrent users.

## 5. Data Model and Persistence Strategy
We use **SQLite** as it requires zero external dependencies, making the local full-stack developer environment frictionless. Prisma will manage the schema and migrations.

### Prisma Schema (`schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Category {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  articles    Article[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Article {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  content     String   // Stores Markdown
  status      String   @default("DRAFT") // 'DRAFT' | 'PUBLISHED'
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([title])
}
```

## 6. Feature-Specific Architecture Decisions

### 6.1 Basic Editing & Markdown
*   **Approach:** Instead of a complex WYSIWYG editor (like TipTap or Draft.js) which adds significant overhead, we will use a raw Markdown editor approach.
*   **Implementation:** A standard `<textarea>` for input, paired with a live preview pane rendered by `react-markdown`.
*   **Tradeoff:** Prioritizes developer velocity and system reliability over non-technical user convenience.

### 6.2 Search
*   **Approach:** Server-side search using Prisma and SQLite.
*   **Implementation:** A search input in a Client Component that updates the URL search params (e.g., `?q=how+to`). The Next.js Page (Server Component) reads `searchParams`, queries Prisma (`WHERE title LIKE '%how to%' OR content LIKE '%how to%'`), and renders the results.
*   **Tradeoff:** SQLite `LIKE` queries lack advanced full-text search features (like stemming or typo tolerance), but are perfectly adequate for the v1 scale and avoid introducing a separate search engine dependency like Elasticsearch or Algolia.

## 7. Repository Structure and Developer Workflow

### Folder Structure
```text
/
├── prisma/
│   ├── schema.prisma      # DB schema
│   └── dev.db             # Local SQLite database
├── src/
│   ├── app/               # Next.js App Router pages and layouts
│   ├── components/        # Reusable UI components (e.g., Button, MarkdownViewer)
│   ├── lib/               # Utility functions, Prisma client instance (`db.ts`)
│   ├── actions/           # Next.js Server Actions (e.g., `article.actions.ts`)
│   └── styles/            # Global CSS and CSS Modules
├── tests/                 # Playwright E2E tests
├── docs/                  # Project documentation (Brief, Architecture)
├── package.json
└── playwright.config.ts
```

## 8. Testing Strategy
*   **Unit/Integration Tests:** Native Node.js test runner (`node:test`) or Vitest for testing pure utility functions and isolated business logic.
*   **E2E Tests:** **Playwright 1.59.1** for testing critical user journeys.
    *   *Journey 1:* Browse articles -> Click article -> Verify rendered markdown.
    *   *Journey 2:* Enter query in search -> Verify results page.
    *   *Journey 3:* Navigate to "New Article" -> Fill form -> Submit -> Verify redirection to new published article.
*   **Scope:** Focus on core flows; omit exhaustive edge-case coverage for v1.

## 9. Local Development and Run Instructions
The setup is designed to be frictionless.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Initialize the Database:**
    ```bash
    npx prisma migrate dev --name init
    npx prisma db seed # Optional: seed with initial categories/articles
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  **Run E2E Tests:**
    ```bash
    npx playwright test
    ```

## 10. Non-Functional Architecture Decisions
*   **Performance:** React Server Components ensure zero client-side JavaScript is shipped for reading articles, maintaining high performance and fast Time To Interactive (TTI).
*   **Accessibility & UX:** Use semantic HTML5 elements. CSS will enforce strict color contrast rules and provide clear visual focus states.
*   **Empty States:** Dedicated UI components will be built for `NoResults`, `NoArticles`, and `EmptyCategory`, rendered conditionally based on Prisma query results.

## 11. Decisions Log
*   **Chosen Next.js + App Router over separate frontend/backend:** Reduces context switching, infrastructure complexity, and eliminates CORS/API boilerplate.
*   **Chosen SQLite over PostgreSQL:** Meets the 100 concurrent user requirement easily for read-heavy workloads while removing the need for a Docker daemon or local Postgres installation for new developers.
*   **Chosen CSS Modules over Tailwind:** Follows explicit design guidance to rely on Vanilla CSS and avoids utility-class clutter in JSX.
*   **Chosen Playwright over Cypress:** Playwright offers better modern web feature support, faster execution, and excellent Next.js compatibility out of the box.
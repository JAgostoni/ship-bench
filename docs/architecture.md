# Technical Architecture Specification: Simplified Knowledge Base App

## 1. Overview
This document outlines the technical architecture for the Simplified Knowledge Base App. The application is designed as a local-first, internal team tool for creating, browsing, searching, and maintaining documentation.

### Goals
- Provide a calm, information-dense, search-first interface.
- Ensure easy local setup and maintainability.
- Support ~100 concurrent users for read/edit flows.
- Use a modern, stable, and well-maintained tech stack.

## 2. Tech Stack
| Component | Technology | Version | Reasoning |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 15.x (Latest Stable) | Full-stack capabilities, excellent DX, and server-side rendering for fast initial loads. |
| **Language** | TypeScript | 5.x | Type safety for maintainability and reduced runtime errors. |
| **Styling** | Tailwind CSS | 4.x (Latest Stable) | Utility-first CSS for rapid, consistent UI development and responsive design. |
| **Database** | SQLite | Latest | Zero-config, local-first persistence; perfect for small-to-medium internal tools. |
| **ORM** | Prisma | Latest | Type-safe database access and easy migrations. |
| **Validation** | Zod | Latest | Schema validation for API requests and form data. |
| **Editor** | React-Markdown / Simple-Markdown | Latest | Low-friction Markdown editing with live preview as per brief. |
| **E2E Testing**| Playwright | Latest | Robust, modern testing framework that matches the Next.js stack. |
| **Unit Testing**| Vitest | Latest | Fast, Vite-native testing framework for core logic. |

## 3. Front-end Architecture
### Architecture Pattern
The app uses the **Next.js App Router** architecture:
- **Server Components (RSC)**: Used for the main article list and detail pages to minimize client-side JS and maximize load speed.
- **Client Components**: Used for interactive elements: the search bar, the Markdown editor, and form validations.

### Page Structure
- `/`: Landing/Home page featuring a global search bar and "Recent Articles" or "Featured" list.
- `/articles`: Browse all articles.
- `/articles/[slug]`: Article detail view.
- `/articles/[slug]/edit`: Edit page with Markdown editor and preview.
- `/articles/new`: Create new article page.

### UI/UX Decisions
- **Search-First Navigation**: The search bar is globally accessible (sticky header) to reduce friction.
- **Responsive Design**: Tailwind-based grid/flex layouts targeting Desktop and Tablet.
- **State Management**: URL-based state for search queries and filters (via `useSearchParams`) to ensure shareable links.

## 4. Back-end Architecture
### API Design
The application uses **Next.js Server Actions** for all mutations (create, update, delete) and **Server Components** for data fetching. This removes the need for a separate REST/GraphQL API layer and reduces boilerplate.

### Data Access Layer
A dedicated `lib/db.ts` module will export a singleton `PrismaClient` instance to prevent connection exhaustion in development.

## 5. Data Model & Persistence
### Persistence Strategy
- **Database**: SQLite file stored locally within the project directory.
- **Migrations**: Handled via `prisma migrate dev`.

### Schema
```prisma
model Article {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     String   // Markdown content
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
}

model User {
  id       String    @id @default(cuid())
  name     String
  email    String    @unique
  articles Article[]
}
```

## 6. Feature-Specific Architecture
### Search Implementation
- **Approach**: Basic SQL `LIKE` queries across `title` and `content` fields.
- **Tradeoff**: While Elasticsearch/Algolia are more powerful, a simple SQL search is sufficient for <10,000 articles and maintains the "local-first simplicity" goal.

### Markdown Editor
- **Approach**: A split-pane editor (Left: Textarea, Right: Rendered HTML).
- **Library**: `react-markdown` for rendering.
- **Constraints**: Simple and reliable over highly customized WYSIWYG to ensure stability.

## 7. Integration & Workflow
### FE/BE Integration
- **Data Fetching**: Direct database calls inside Server Components.
- **Mutations**: Server Actions with Zod validation on the server side.

### Repository Structure
```text
/
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router (Pages, Layouts, Server Actions)
│   ├── components/      # Shared UI components (ui/, editor/, search/)
│   ├── lib/             # Shared utilities (db.ts, validation.ts)
│   └── types/           # TypeScript interfaces
├── tests/
│   ├── unit/            # Vitest unit tests
│   └── e2e/             # Playwright end-to-end tests
├── .env                 # Environment variables (DATABASE_URL)
└── package.json
```

## 8. Testing Strategy
### Unit Testing (Vitest)
- **Focus**: Core business logic, Markdown parsing utilities, and Zod validation schemas.
- **Requirement**: 80%+ coverage of utility functions.

### E2E Testing (Playwright)
- **Critical Journeys**:
  1. Home $\rightarrow$ Search $\rightarrow$ Article Detail.
  2. Article Detail $\rightarrow$ Edit $\rightarrow$ Save $\rightarrow$ Verify Change.
  3. Create New Article $\rightarrow$ Save $\rightarrow$ Verify in List.
- **Environment**: Run against a dedicated test SQLite database.

## 9. Local Development & Run Instructions
1. **Clone & Install**: `npm install`
2. **Environment**: Create `.env` with `DATABASE_URL="file:./dev.db"`
3. **DB Setup**: `npx prisma migrate dev --name init`
4. **Run Dev**: `npm run dev`
5. **Run Tests**: `npm run test` (unit) and `npx playwright test` (e2e)

## 10. Non-Functional Decisions
- **Performance**: Server-side rendering (SSR) for articles to ensure near-instant time-to-content.
- **Accessibility**: Use of semantic HTML and Tailwind's standard accessible colors for contrast.
- **Security**: Basic server-side validation via Zod to prevent malicious input.

## 11. Decisions Log
| Decision | Tradeoff | Outcome |
| :--- | :--- | :--- |
| **SQLite over PostgreSQL** | Simplicity vs. Scalability | Chosen for "local-first" and ease of setup. |
| **Server Actions over REST** | Coupled FE/BE vs. Decoupled | Chosen to accelerate development and reduce boilerplate. |
| **Markdown over WYSIWYG** | Learning curve vs. Complexity | Chosen for reliability and developer ergonomics. |
| **SQL Search over Full-text Index** | Precision vs. Speed | SQL `LIKE` is sufficient for the current scale. |

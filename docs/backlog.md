# Implementation Backlog: Knowledge Base App

## MVP Scope Definition
Based on the Product Brief, the MVP focuses on the core knowledge-sharing experience. While the Architecture and Design specs include categories and status, the implementation will prioritize the required features first.

### In Scope (MVP)
- **Article Browsing**: Home page list and Article Detail views.
- **Search**: Full-text search across article titles and content using PostgreSQL.
- **Markdown Editing**: Create/Edit articles with a live side-by-side Markdown preview.
- **Data Persistence**: Robust PostgreSQL schema with Prisma ORM.
- **Core Testing**: Unit tests for business logic and Playwright E2E tests for critical journeys.

### Stretch & Post-MVP
- **Category/Tag Management**: UI for creating and managing categories/tags (the schema will support them, but the MVP focuses on assignment).
- **Advanced Auth**: Enterprise authentication (LDAP/SSO).
- **Advanced Performance**: Image optimization, edge caching.
- **Full Accessibility Audit**: Beyond basic WCAG AA compliance.

## Iteration Plan Overview

| Iteration | Goal | Key Deliverables |
| :--- | :--- | :--- |
| **1: Foundation** | Project infrastructure and base dependencies. | Monorepo setup, Docker Postgres, Prisma schema, API/Web boilerplate. |
| **2: Read Flow** | Core article viewing experience. | Article List, Article Detail, basic category filtering, Read API. |
| **3: Search** | High-performance search capability. | PostgreSQL FTS integration, Search UI, debounced dynamic filtering. |
| **4: Write Flow** | Knowledge creation and editing. | Two-pane Markdown editor, Create/Edit API, Article Status handling. |
| **5: Validation** | Quality assurance and final polish. | Vitest unit tests, Playwright E2E journeys, responsive & accessibility tweaks. |

## Dependency and Sequencing Notes
- **Iteration 1** is a hard blocker for all subsequent work as it establishes the repo structure and DB.
- **Iteration 2** provides the base UI and API patterns used in Iterations 3 and 4.
- **Iteration 3 and 4** can technically be worked on in parallel once Iteration 2 is stable, but sequential execution is recommended to maintain focus.
- **Iteration 5** requires all features to be implemented for full E2E coverage.

## Decisions Log
- **Monorepo Structure**: Decided on a standard `apps/` and `packages/` structure using npm workspaces for simplicity and type sharing.
- **Schema Inclusion**: Included `Category` and `ArticleStatus` in the initial Prisma schema to avoid breaking migrations later, even though they are "Feature 4/5".
- **Search Strategy**: Using PostgreSQL FTS (DEC-001) to keep the stack simple for local development while meeting performance goals.
- **Editor Choice**: Custom controlled `<textarea>` with `react-markdown` to ensure lightweight implementation without heavy dependencies.

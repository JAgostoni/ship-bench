# Implementation Backlog: Simplified Knowledge Base App

## MVP Scope Definition
Based on the Product Brief, the MVP consists of the first three required features.

### In-Scope (MVP)
- **Article Browsing & Detail Pages**: Ability to list articles and view a single article's content.
- **Global Search**: Search across article titles and content.
- **Basic Editing**: Create and update articles using a Markdown editor with live preview.
- **Core Infrastructure**: Local-first setup with Next.js, SQLite, and Prisma.
- **Testing**: Unit tests for core logic and E2E tests for critical user journeys.

### Stretch / Post-MVP
- **Category/Tag Organization**: Grouping articles by tags or categories.
- **Article Status Handling**: Draft vs. Published states.
- **Advanced Accessibility**: Full audits and exhaustive edge-case coverage.
- **Advanced Performance**: High-scale optimizations.

## Iteration Plan Overview

### Iteration 1: Foundation & Environment
**Goal**: Establish a working development environment and base data model.
- Setup project structure, dependencies, and SQLite/Prisma configuration.
- Implement the database schema and seed data.
- Verify basic connectivity and build pipeline.

### Iteration 2: Browsing & Reading
**Goal**: Enable users to find and read documentation.
- Implement the Home page with "Recent Articles" list.
- Create the Article Detail page (`/articles/[slug]`).
- Build the Global Search functionality and results page.

### Iteration 3: Content Creation & Maintenance
**Goal**: Enable users to create and edit knowledge.
- Implement the "New Article" page with a split-pane Markdown editor.
- Implement the "Edit Article" page.
- Add server-side validation via Zod.

### Iteration 4: Quality Assurance & Testing
**Goal**: Ensure stability and verify critical user journeys.
- Write unit tests for core business logic and validation schemas.
- Implement E2E tests using Playwright for the critical paths:
    - Home $\rightarrow$ Search $\rightarrow$ Detail
    - Detail $\rightarrow$ Edit $\rightarrow$ Save $\rightarrow$ Verify
    - Create New $\rightarrow$ Save $\rightarrow$ Verify

## Dependency and Sequencing Notes
- **Critical Path**: Foundation $\rightarrow$ Browsing $\rightarrow$ Editing $\rightarrow$ Testing.
- **Data Model First**: The Prisma schema must be finalized and migrated before any page implementation.
- **Search dependency**: The search implementation depends on the Article data model being present.
- **Editor dependency**: The Edit page depends on the Article Detail page for the "Edit" entry point.

## Stretch and Post-MVP Phasing
- **Phase 2 (Organization)**: Implement Tags/Categories. This would involve updating the schema to include a `Category` model and adding filtering logic to the `/articles` page.
- **Phase 3 (Lifecycle)**: Implement Status (Draft/Published). This would involve adding a `status` field to `Article` and updating the search/browse queries to filter by status.

## Decisions Log
- **Sequencing**: Prioritized "Read" flows (Iteration 2) before "Write" flows (Iteration 3) to ensure a usable baseline for manual testing of the data layer.
- **Testing Strategy**: Concentrated all testing into a final iteration to ensure it covers the completed feature set, though basic manual verification is expected at each step.
- **Editor Approach**: Followed the design spec's split-pane Markdown approach to minimize complexity while meeting the brief's requirements.

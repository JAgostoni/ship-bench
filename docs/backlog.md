# Implementation Backlog: Simplified Knowledge Base App

## MVP Scope Definition
Following the v1 Product Brief, this MVP focuses strictly on the core required features necessary for a functional knowledge base. 

**In Scope for MVP:**
1. Article browsing and article detail pages.
2. Search across article titles and content.
3. Basic editing for all articles (Markdown editor with live preview).
4. Automated testing (Unit tests for core logic + Playwright E2E for critical user journeys).

**Out of Scope for MVP (Stretch/Post-MVP):**
- Category or tag-based organization (Feature 4).
- Article status handling such as Draft/Published (Feature 5).
- Complex WYSIWYG editor.
- Client-side data fetching waterfalls (using Next.js Server Components instead).
- Exhaustive E2E edge-case coverage and accessibility audits.

## Iteration Plan Overview
- **Iteration 1: Base Setup & Infrastructure** - Initialize the Next.js app, configure Prisma/SQLite, apply global CSS tokens, set up testing, and seed initial data.
- **Iteration 2: Article Browsing & Detail View** - Build the read-only paths: Home page lists, Article detail pages, and Markdown rendering.
- **Iteration 3: Article Creation & Editing** - Build the write paths: Next.js Server Actions, the responsive Markdown Editor component, and Create/Edit views.
- **Iteration 4: Search Functionality** - Implement the global search bar, URL-based search routing, and SQLite `LIKE` search queries.

## Dependency and Sequencing Notes
- **Strict Sequence:** Iterations must be executed in order (1 -> 2 -> 3 -> 4). 
- **Critical Path:** Iteration 1 (Database and seed data) blocks all subsequent UI work. Iteration 2 (Markdown viewer and detail page) blocks Iteration 3 (Live preview in editor requires the Markdown component, and create flows require the detail page for redirection).
- **Testing:** E2E and unit tests are progressively added in Iterations 2, 3, and 4 to validate the MVP scope alongside feature development.

## Stretch and Post-MVP Phasing
The architecture and design specs outline features that are deliberately deferred to v2 (Post-MVP) to ensure the v1 release is right-sized:
1. **Categories:** Updating the Prisma schema to include the `Category` model, adding a Category detail view, and integrating Category selection into the Editor.
2. **Draft/Published Status:** Adding a `status` field to the `Article` model, filtering Drafts out of the main browse views, and adding a status toggle to the Editor.
3. **Advanced Search:** Transitioning from SQLite `LIKE` queries to a more robust full-text search solution if the knowledge base grows beyond a small-to-medium size.

## Decisions Log
- **Scope Reduction:** Excluded `Category` and `status` from the MVP Prisma schema and UI to strictly adhere to the Product Brief's requirement ("only the first three are required in v1"). This keeps the v1 data model minimal and prevents scope creep.
- **Feature Sequencing:** Editing (Iteration 3) was placed *after* Browsing (Iteration 2). This allows developers to verify the read-paths using seed data before tackling the complexity of forms, Server Actions, and mutations.
- **Testing Strategy:** Right-sized testing by focusing on Playwright E2E journeys for core user flows, and unit tests specifically for core business logic (like slug generation), avoiding over-testing UI components.
# Implementation Backlog — Simplified Knowledge Base App

## MVP Scope Definition

### In Scope (MVP)
These three features are required per the product brief:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Article browsing & detail pages** | Browse paginated list, view individual articles with proper prose rendering, back navigation |
| 2 | **Search** | Full-text search across article titles and content via SQLite FTS5, served through a header search input with dropdown results |
| 3 | **Basic editing** | Markdown editor with live preview for creating and editing articles; title + content with Zod validation |

### Supporting MVP (required infrastructure)
These are not product features but are required by the specs to make MVP features work:

- Next.js 16 App Router project scaffold with Tailwind CSS 4
- SQLite database with Drizzle ORM (articles table, FTS5 virtual table)
- Route structure following `(public)/` route group
- UI component primitives: Header, ArticleCard, ArticleList, ArticleDetail, EmptyState, Button
- Design tokens from design spec (color palette, typography scale, spacing system)
- Responsive layout for desktop (≥1024px) and tablet (768–1023px)
- Clear empty states: no articles, no search results, article not found
- Form validation for create and edit (Zod schemas)
- **Unit tests**: Core logic via Vitest (db queries, search building, validation, slug generation, utilities)
- **E2E tests**: Playwright coverage of the critical user journey browse → search → edit

### Stretch / Post-MVP
| Feature | Where it fits | Notes |
|---------|--------------|-------|
| Category/tag organization | v2 iteration after MVP | Schema already designed; sidebar layout reserved |
| Draft/published status | v2 iteration after MVP | Schema column exists; badge UI and filtering guidance in design spec |
| Full accessibility audit | Post-MVP | Design-only in v1; AA audits require dedicated pass |
| Mobile (<768px) polish | Post-MVP | v1 focuses desktop + tablet; mobile can be refined later |
| Autosave | Post-MVP | Explicitly deferred in design spec decision #4 |
| Real-time collaboration, file uploads, versioning | Future | Listed in architecture "Future Enhancements" |

---

## Iteration Plan Overview

| Iteration | Goal | Scope Summary |
|-----------|------|---------------|
| **1. Foundation** | Set up the project skeleton, database, and local dev environment | Project scaffold, DB schema with Drizzle, seed data script, design tokens, base UI primitives, header layout |
| **2. Browse & Detail** | Build the core read experience end-to-end | Article list, article detail, pagination, empty states, category sidebar (v2 placeholder), responsive layout |
| **3. Search** | Add full-text search to the application | SQLite FTS5 migration + sync triggers, search API route, search input with debounced dropdown, no-results state |
| **4. Editor** | Enable article creation and editing | Markdown editor component, live preview, create/edit routes, Zod validation, save/discard flows, toast notifications |
| **5. Test & Polish** | Verify critical journeys and harden the codebase | Vitest unit tests, Playwright E2E for browse → search → edit journey, lint, type-check, README run notes |

---

## Dependency & Sequencing Notes

### Critical Path
```
Iteration 1 → Iteration 2 → Iteration 4 → Iteration 5 (E2E tests)
                 ↘                ↗
                   Iteration 3 →↗
```

- **Iteration 1** (Foundation) blocks everything — no code can land without the project, DB layer, and component primitives.
- **Iteration 2** (Browse & Detail) can proceed independently of Iteration 3 (Search) because reading and list articles do not depend on search.
- **Iteration 3** (Search) depends on Iteration 1's DB layer (FTS5 needs the base schema) but does not block Browse & Detail work. Iterations 2 and 3 can be developed in parallel if desired.
- **Iteration 4** (Editor) depends on Iteration 1's DB and validation layer. It is the only path to test the write side of the application.
- **Iteration 5** (Test & Polish) depends on Iterations 2, 3, and 4 being complete because E2E tests exercise all three features in sequence.

### Key Sequencing Decisions
- The FTS5 migration and search triggers are placed in **Iteration 3**, but the migration files themselves are created during Iteration 1's schema work so the DB schema is complete.
- Category management code is limited to the sidebar skeleton in Iteration 2 to reserve space for the v2 feature without full implementation.
- The Markdown parser library (`marked` or `markdown-it`) is introduced in **Iteration 4** as the editor creates the HTML content; Iteration 2's detail page renders raw HTML content.

---

## Stretch & Post-MVP Phasing

| Phase | What to add | Rationale |
|-------|-------------|-----------|
| **Immediate post-MVP** | Category CRUD, category filtering in browse, article status (draft/published) badge & toggle | Already designed in sidebar, schema columns exist |
| **Post-MVP** | Full accessibility audit (screen reader testing, keyboard navigation deep-pass), mobile (<768px) polish for drawer, keyboard shortcuts (⌘K, ⌘S) | Design-only in v1; require dedicated testing pass |
| **Future** | Autosave, real-time collaboration, file uploads, article versioning, export, i18n, authentication | Listed in architecture spec "Future Enhancements (v2+)" |

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Markdown editor (not TipTap/WYSIWYG)** | Design spec Section 2.3 explicitly chooses Markdown for v1 — simpler, lighter, reliable. Architecture spec mentions TipTap but design spec's Decision #1 overrides it with clear rationale. |
| 2 | **No category implementation in v1** | Product brief only requires features 1-3. Category feature (#4) and status (#5) are stretch. Sidebar is reserved structurally but fully functional later. |
| 3 | **Status column exists in schema but no UI in v1** | The DB schema includes `status` for readiness, but draft/published badge, toggling, and filtering are v2. Default all seeded articles to `published`. |
| 4 | **FTS5 migration deferred to Iteration 3** | FTS5 triggers and queries are a search-layer concern. Base schema (articles table) is set up in Iteration 1 so that Iteration 3 only adds FTS5 without blocking browse work. |
| 5 | **E2E tests placed in final iteration** | Playwright tests need all three features (browse, search, editor) to exist first. Placing them last ensures the critical user journey is tested end-to-end. |
| 6 | **Seed data script in Iteration 1** | Iteration 2's browse view needs articles to render. A simple seed script avoids developers staring at empty states during development. |
| 7 | **Server Components as default, Client Components only when interactivity is needed** | Next.js 16 App Router defaults to server components. Client components (`'use client'`) are only used for search dropdown, editor textarea, and confirmation modals. |

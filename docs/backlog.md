# Implementation Backlog: Simplified Knowledge Base App

**Source of truth:** `docs/product-brief.md`, `docs/architecture.md`, `docs/design-spec.md`

---

## MVP Scope Definition

### In Scope (v1 / MVP)
Per the product brief, only the first three features are required for v1. The backlog treats all three plus their required testing as MVP.

1. **Article browsing and article detail pages**
   - Paginated article list on `/`
   - Article detail view on `/articles/:slug`
   - Responsive layout (desktop sidebar, tablet drawer, mobile stacked)
   - Empty states for no articles and missing slugs

2. **Search across article titles and content**
   - Full-text search via SQLite FTS5
   - Debounced search input in global header (300 ms)
   - Search results replace the article list inline on Home
   - URL sync (`?q=`) and clear-search affordance

3. **Basic editing for all articles**
   - Create new article at `/articles/new`
   - Edit existing article at `/articles/:slug/edit`
   - Split-pane Markdown editor (desktop) / tabbed editor (mobile)
   - Form validation for title, content, and tags
   - Category assignment via native dropdown and tag input via chips
   - Delete article with confirmation modal
   - Autosave draft to `localStorage` every 2 s

4. **Testing (MVP, per brief v2 update)**
   - Unit tests for core logic (slugify, services, Zod schemas) via Vitest
   - E2E tests for critical user journeys via Playwright:
     - Browse → view article detail
     - Search → select result → view article
     - Create article → save → verify detail
     - Edit article → save → verify updated content

### Stretch / Post-MVP
These features are **not** in v1 scope. The schema is forward-modeled so they can ship later without migrations.

- **Category and tag-based organization (Feature 4)**
  - *Deferred*: No category browsing page, tag cloud, or filtered article lists
  - *Included in v1 editor only*: Basic category dropdown and tag chip input during create/edit because the design spec requires them and the schema supports them at zero migration cost
  - *Post-MVP*: Category listing, filtered views, tag management UI

- **Article status workflow (Feature 5)**
  - *Deferred*: No status filtering, draft/published visibility rules, or admin views
  - *Schema-ready*: `ArticleStatus` enum exists and defaults to `DRAFT`
  - *Post-MVP*: Status-aware list filtering, publish workflow, status badges

- **Enterprise-grade accessibility audits**
  - MVP covers semantic HTML, visible focus rings, labels, keyboard navigation, and ARIA basics per design spec
  - *Post-MVP*: Full WCAG 2.1 AAA audit, screen-reader optimization testing, exhaustive edge-case coverage

- **Advanced performance optimizations**
  - *Post-MVP*: SSR, Redis caching, image asset pipeline, code-splitting beyond route level

### Explicitly Out of Scope
- Authentication and authorization (basic-security assumption per brief)
- WYSIWYG editor; Markdown split-pane is the v1 editor
- Image uploads or asset management
- Real-time collaboration, versioning, or optimistic locking
- Admin dashboard for managing categories or tags

---

## Iteration Plan Overview

| Iteration | Goal | Scope |
|-----------|------|-------|
| **Iteration 1** | Establish dev environment and backend foundation | Repo structure, dependency verification/installation, Prisma schema + FTS5 migration + seed, Express skeleton, shared Zod schemas, dev server orchestration |
| **Iteration 2** | Build complete backend API and unit-test core logic | CRUD routes, search service with FTS5, category endpoint, validation middleware, global error handler, Vitest unit tests for slugify/services/schemas |
| **Iteration 3** | Frontend shell, routing, and read-only pages | React Router v7 SPA setup, Tailwind v4 theme, AppShell/Header/Sidebar/Drawer, SearchInput, ArticleList, ArticleCard, ArticleDetail, global components (EmptyState, Toast, Skeleton, ConfirmModal) |
| **Iteration 4** | Editor, forms, and full CRUD | MarkdownEditor (split + tabbed), TagInput, ArticleEdit page (new + edit), form validation, `localStorage` autosave, dirty guards, delete flow |
| **Iteration 5** | End-to-end testing, QA, and final verification | Playwright E2E for 4 critical journeys, responsive checks, accessibility spot-check, final polish |

**Total estimated developer runs:** 5 focused iterations, each leaving the codebase in a runnable state.

---

## Dependency and Sequencing Notes

### Sequential Critical Path
```
Iteration 1 → Iteration 2 → Iteration 3 → Iteration 4 → Iteration 5
```

- **Iteration 1** must be first; everything else depends on the repo, tooling, and database.
- **Iteration 2** must finish before frontend pages consume the API (Iterations 3–4). The API contract stabilizes here.
- **Iteration 3** provides the layout shell and routing required by the editor page in Iteration 4.
- **Iteration 4** depends on the `ArticleDetail` page and routing from Iteration 3 to wire up Edit and Delete affordances.
- **Iteration 5** requires a fully functional app and deterministic seed data.

### Internal Iteration Dependencies
- **Iteration 2**: `slugify.ts` → `articleService.ts` → route handlers. `searchService.ts` → `search.ts` route.
- **Iteration 3**: `AppShell` must exist before page routes are mounted. `api.ts` must exist before any page fetches data. `SearchInput` must exist before `Home` can sync URL state.
- **Iteration 4**: `MarkdownEditor` and `TagInput` are leaf components; the `ArticleEdit` page integrates them last.
- **Iteration 5**: E2E specs depend on the seed script from Iteration 1 and all routes from Iterations 3–4.

### Parallelizable Tasks
- Within Iteration 3, global UI components (`EmptyState`, `Toast`, `Skeleton`, `ConfirmModal`) can be built in parallel once Tailwind is configured.
- Within Iteration 4, `MarkdownEditor` and `TagInput` can be developed in parallel before `ArticleEdit` integrates them.

---

## Stretch and Post-MVP Phasing

| Phase | Prerequisites | What Ships |
|-------|---------------|------------|
| **v1.1 (polish)** | v1 merged | Toast animations, editor toolbar, tag/category browse-only sidebar links |
| **v2 (next milestone)** | v1 stable | Category/tag filtered lists, article status workflow (draft vs. published views), admin category management, advanced perf (Redis/PostgreSQL) |
| **Future** | v2 adopted | Authentication, image upload pipeline, WYSIWYG toolbar option, versioning, comprehensive a11y audit |

---

## Decisions Log

| Decision | Rationale / Tradeoff |
|----------|----------------------|
| **5 iterations** | Balances granularity (each leaves the app runnable) against the brief's "one to two sessions" constraint. Fewer iterations create monolithic tasks; more create context-switching overhead. |
| **Backend-first sequencing (Iter 1–2, then Frontend 3–4)** | Stabilizes the API contract before UI is wired. Prevents frontend rework when endpoint shapes change. Tradeoff: no visible UI until Iteration 3. |
| **Category dropdown + tag input included in v1 editor** | The product brief lists Feature 4 (category/tag organization) as non-MVP, but the design spec (`docs/design-spec.md`) explicitly requires these form fields in the editor, and the schema supports them at zero migration cost. The *browsing/filtering* aspect of Feature 4 remains deferred to v2. |
| **All testing consolidated in Iteration 5** | Keeps velocity high in Iterations 1–4. Unit tests for services could start in Iteration 2, but grouping all QA at the end simplifies test-data management and ensures E2E covers the complete flow. Tradeoff: core-logic bugs might not surface until late; mitigated by manual endpoint verification in Iteration 2. |
| **SQLite FTS5 triggers in raw SQL migration** | Prisma does not manage FTS5 virtual tables natively. Raw SQL migrations keep the FTS index in sync with article CRUD automatically. Tradeoff: migration is SQLite-specific, but the API contract insulates the frontend from the engine choice. |
| **localStorage autosave instead of server autosave** | Prevents data loss on refresh without overwhelming the API. Server save is explicit (Save button). Tradeoff: localStorage drafts can diverge across devices; last-write-wins is acceptable per architecture for an internal tool. |
| **No separate search results page** | Search replaces the home list inline, reducing navigation depth per design spec. URL sharing via `?q=` is still supported. |

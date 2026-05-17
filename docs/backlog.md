# Implementation Backlog — Internal Knowledge Base App

> Generated: 2026-05-16  
> Sources: `docs/product-brief.md`, `docs/architecture.md`, `docs/design-spec.md`

---

## MVP Scope Definition

### In Scope (v1 MVP)

| Feature | Brief reference | Notes |
|---|---|---|
| Article browsing (list + detail) | Feature 1 | Server Components; browse list with category filter sidebar |
| Search across titles + content | Feature 2 | PostgreSQL FTS with GIN index; inline results on `/articles` |
| Article create and edit | Feature 3 | Markdown editor with preview; Server Actions; form validation |
| Category data model + API | Feature 4 (partial) | Schema, service layer, API routes, and category filter on list page; no category management UI |
| Status toggle in edit form | Feature 5 (partial) | DRAFT/PUBLISHED enum in schema; toggle on create/edit form; list page defaults to PUBLISHED |
| Application shell + responsive layout | Non-functional | Two-column desktop, collapsed tablet sidebar, mobile top-nav with drawer |
| Unit tests (Vitest) | Testing scope | slugify, excerpt, article service, Zod schemas |
| E2E tests (Playwright) | Testing scope | Browse → search → edit journey; create; empty state |

### Post-MVP / Stretch (v2 or later)

| Feature | Reason deferred |
|---|---|
| Category management UI (create, rename, delete categories) | Data model is in v1; UI adds scope without blocking v1 workflows |
| Draft article browse/filter UI | Drafts accessible by direct URL in v1; a "My drafts" view is a distinct feature |
| Full accessibility audit | Brief says "design-only, guide don't implement" for full a11y |
| Exhaustive E2E edge-case coverage | Brief explicitly excludes this from MVP testing scope |
| Authentication / auth-gated routes | Brief says "basic security assumptions only" for v1 |
| Pagination | Not needed for small-to-medium article sets per brief |
| Toast notifications | Design spec explicitly omits them — redirect is the success signal |
| Deployment pipeline / CI | Noted as a stretch deliverable in the brief |

---

## Iteration Plan Overview

| # | Goal | Key deliverables |
|---|---|---|
| 1 | **Project bootstrap** | Repo structure, all dependencies installed, Docker Compose + Prisma schema with migration and seed data, all config files |
| 2 | **Data layer** | Prisma singleton, service layer (articles + categories), utility functions, Zod schemas, TypeScript types, REST API route handlers |
| 3 | **Application shell + browse** | Root layout, Nav sidebar, CSS design tokens, article list page, ArticleCard, CategoryBadge, StatusBadge, EmptyState, SearchBar |
| 4 | **Article detail page** | `/articles/[slug]` page, ArticleRenderer, reading-time metadata, back nav, edit button |
| 5 | **Create + edit articles** | Server Actions, ArticleEditor (dynamic import), create page, edit page, inline delete confirmation, form validation |
| 6 | **Responsive design** | Tablet sidebar collapse, mobile top-nav bar, hamburger drawer, mobile editor tabs |
| 7 | **Tests** | Vitest unit tests; Playwright E2E tests for all critical journeys |

---

## Dependency and Sequencing Notes

```
Iteration 1 (bootstrap)
  └─► Iteration 2 (data layer)
        └─► Iteration 3 (shell + browse)  ─────────────────────────────────┐
              └─► Iteration 4 (detail page)                                  │
                    └─► Iteration 5 (create + edit)                          │
                          └─► Iteration 6 (responsive)                       │
                                └─► Iteration 7 (tests) ◄────────────────────┘
```

**Critical path constraints:**

- Iteration 2 must precede all UI work — the service layer and Zod schemas are imported by both API routes and Server Actions; the seed data is required for any E2E test runs.
- Iteration 3 must precede iterations 4 and 5 — the Nav shell and CSS tokens apply to all pages; layout structure must be stable before building page interiors.
- Iteration 5 depends on iteration 4 — the edit page links from the detail page; the Server Action calls `revalidatePath` for the detail route.
- Iteration 7 (tests) can only be written after iteration 5, as the full user journey (browse → search → create → edit) spans all pages built by iterations 3–5. Unit tests for utilities (iteration 2 code) can be drafted as early as iteration 2 but the test suite is completed and verified in iteration 7.
- Iteration 6 (responsive) is independent of iteration 7 and can be done in parallel by a second developer if available, but is ordered after iteration 5 to keep the default path sequential.

---

## Stretch and Post-MVP Phasing

### v2 (next planned version)

- **Category management UI** — add `/categories/new`, `/categories/[slug]/edit` pages and Server Actions for create/rename/delete; hook into `categories.ts` service which already exists.
- **Draft browse filter** — add a UI control (toggle or tab) to the list page to show drafts; the API already supports `?status=DRAFT`.
- **Auth (NextAuth.js or Clerk)** — wrap edit/create/delete routes behind an auth guard; the open-endpoint design makes this additive, not breaking.

### v3 / future

- Full accessibility audit (automated + manual screen reader testing).
- Exhaustive E2E edge-case coverage (network failure, concurrent edits, slug collision UI).
- Search keyword highlighting in result excerpts.
- Deployment pipeline (GitHub Actions → Vercel or VPS).
- Read-time analytics or article view counts.
- Article versioning / revision history.

---

## Decisions Log

| Decision | Rationale |
|---|---|
| Category and Status in v1 data model, UI partially deferred | Schema cost is near-zero; adding columns later forces a migration and potential downtime. The brief includes both as features and the architecture spec makes the same call. Category filtering on the list page is included in v1 because the sidebar design requires it. |
| Data layer (iteration 2) before any UI | Service functions and Zod schemas are shared between UI Server Actions and REST API routes. Building this layer first means all subsequent UI iterations import from a stable, tested interface. |
| Application shell before detail/edit pages | The Nav sidebar and CSS tokens are foundational — every page inherits them. Building them first means page-level work in later iterations starts from a complete visual environment, not a stub. |
| Responsive design deferred to its own iteration (6) | Desktop-first layout is implemented in iterations 3–5. Mobile/tablet breakpoints are additive Tailwind classes; deferring them avoids interleaving responsive complexity with core feature work. |
| Tests as the final iteration | E2E tests require all pages to be built; unit tests are written against stable interfaces. An earlier partial suite would need to be updated as interfaces stabilize, increasing churn. Vitest unit tests for utilities (iteration 2) are stable enough earlier, but collecting all tests in one iteration makes the suite coherent and verifiable end-to-end. |
| No separate `/search` page | Architecture spec decision. Search results appear inline on `/articles` via URL param `?q=`. This simplifies routing and keeps category + search filters composable in a single view. |
| Slug collision handling in service layer | The `slugify.ts` utility and `articles.ts` service together handle slug uniqueness (append `-2`, `-3`, etc.). This logic is tested in unit tests, not left to the database constraint alone. |
| No global state store | URL params (`?q=`, `?category=`) carry search and filter state as server-readable params; `useActionState` carries form feedback; `useState` carries editor content. No Redux, Zustand, or Context needed. |

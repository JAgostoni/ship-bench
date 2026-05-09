# Implementation Backlog: Simplified Knowledge Base App

**Date:** 2026-05-09
**Repo:** JAgostoni/ship-bench
**Based on:** product-brief.md, architecture.md, design-spec.md

---

## MVP Scope Definition

### In Scope (MVP — v1 Required)

| # | Feature | Brief Reference |
|---|---------|-----------------|
| 1 | **Article browsing and article detail pages** | Required feature #1 |
| 2 | **Search across article titles and content** | Required feature #2 |
| 3 | **Basic editing for all articles** (Markdown editor with preview) | Required feature #3 |

MVP also includes:
- Responsive layout (desktop + tablet per brief)
- Empty states, form validation, error handling, accessible interactions, readable contrast
- Unit tests for core logic (Vitest)
- E2E/integration tests for critical user journeys — browse → search → edit (Playwright)
- CI workflow (lint, type-check, test, build)

### Stretch (Optional in v1)

| # | Feature | Brief Reference |
|---|---------|-----------------|
| 4 | **Category or tag-based organization** | Feature #4 |
| 5 | **Simple article status handling** (draft/published) | Feature #5 |

> **Note:** The Prisma schema and seed data include categories and status from the start (the data model was designed to support all 5 features). Forms include category selectors and status toggles regardless. What's deferred as stretch is: category browsing pages with filtered lists, and draft visibility filtering rules. The base infrastructure for these features exists from iteration 1.

### Post-MVP / Future

- Full accessibility audits (design-only guidance provided, basic accessibility implemented in MVP)
- Advanced performance optimization
- "On this page" table of contents on article detail
- Back-to-top button
- "My Drafts" filtered view
- Category management (create, rename, delete via UI)
- Tags (many-to-many) as an alternative to categories
- Authentication / authorization
- Advanced search (faceted, filters)
- Image uploads in Markdown
- Keyboard shortcut: Ctrl+Enter to submit article form

---

## Iteration Plan Overview

| Iteration | Goal | MVP/Stretch | Key Deliverables |
|-----------|------|-------------|------------------|
| 1 | Environment & Foundation | MVP | Scaffolded Next.js project, Prisma schema, seed data, design tokens, validators, CI |
| 2 | Layout, Browsing & Detail | MVP (Feature 1) | Base UI components, layout shell, article list/home page, article detail, 404/error pages |
| 3 | Search | MVP (Feature 2) | FTS5 search utility, SearchBar component, search integration on home page |
| 4 | Editing | MVP (Feature 3) | MarkdownEditor, Server Actions, ArticleForm, create/edit pages, REST API routes |
| 5 | Organization & Status | Stretch (F4, F5) | Category pages, category navigation in sidebar, draft status visibility rules |
| 6 | Testing | MVP | Vitest unit tests for validators/slug/search/API, Playwright E2E tests for browse/search/edit |
| 7 | Polish & Documentation | MVP | Responsive design verification, accessibility audit, README |

After iteration 4, the app is functionally complete for MVP features (browse, search, edit). Iterations 5-7 add stretch features and quality guardrails.

---

## Dependency & Sequencing Notes

### Critical Path

```
Iteration 1 (Foundation)
  → Iteration 2 (Layout + Browsing)
    → Iteration 3 (Search) ──┐
    → Iteration 4 (Editing) ─┤
      → Iteration 5 (Stretch)┤
        → Iteration 6 (Testing)
          → Iteration 7 (Polish)
```

### Key Dependencies

1. **Prisma schema (I1) blocks everything.** No data access until schema and migrations exist.
2. **Seed data (I1) is required** for browsing, search, and E2E tests to have content.
3. **Base UI components (I2) are required** by every page and feature component.
4. **Layout shell (I2) is required** before any page can render its content in context.
5. **ArticleList/Card (I2) is used** by the home page, category pages, and search results — it's a shared component.
6. **Search integration (I3) depends on** the home page article list (I2) to render results.
7. **ArticleForm (I4) depends on** MarkdownEditor and base UI components.
8. **Edit page (I4) depends on** article detail page (I2) for navigation context.
9. **Category pages (I5) depend on** the article list/card components (I2) for layout reuse.
10. **E2E tests (I6) require** all MVP features (I1-I4) to be working end-to-end.
11. **Unit tests (I6) can start earlier** — validators, slug, and search tests can be written as soon as their modules exist.

### Parallel Opportunities

- Within Iteration 1: `ci-workflow` and `design-tokens` can be done in parallel with `prisma-schema`.
- Within Iteration 2: `article-card` and `base-ui-components` are independent; `not-found-pages` only needs base UI.
- Within Iteration 6: Unit tests and E2E tests are fully independent.
- README (I7) can be written anytime after I1.

---

## Stretch and Post-MVP Phasing

### Stretch (Iteration 5 — included in this plan, optional execution)

- Category organization: sidebar navigation, category listing pages, article counts
- Article status handling: draft visibility filtering, draft badges, info strips on draft detail pages
- Both features use the schema and seed data created in iteration 1

### Post-MVP (not in this plan)

| Priority | Feature | Notes |
|----------|---------|-------|
| High | "On this page" TOC | Article detail right sidebar for heading navigation |
| High | Back-to-top button | Appears after 500px scroll on article detail |
| Medium | My Drafts view | Filtered list showing only draft articles |
| Medium | Category management UI | Create/rename/delete categories without touching the DB |
| Medium | Tag support (many-to-many) | Additive migration — junction table, no breaking changes |
| Low | Authentication | NextAuth or Clerk when internal-tool-only assumption changes |
| Low | Image upload in editor | File upload endpoint + Markdown image insertion |
| Low | Advanced search filters | Faceted search by category, status, date range |
| Low | Full accessibility audit | WCAG 2.1 AA comprehensive audit and remediation |

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Full Prisma schema from iteration 1** | The architecture spec designed categories and status into the data model. Building the full schema upfront avoids costly migrations later. Feature flags (stretch vs MVP) are enforced at the application layer, not the database. |
| 2 | **Categories and status in forms from iteration 4** | The ArticleForm component includes category selector and status toggle even though category pages and visibility rules are stretch. This means created articles are fully-formed and won't need migration. The form UX is complete from day one. |
| 3 | **Server Components over client-side fetching** | Per architecture spec: read-only pages query Prisma directly. This is the correct Next.js 16 pattern and avoids unnecessary API round-trips. API routes exist for external consumption and E2E test setup. |
| 4 | **Search integration on home page, not a separate page** | Per design spec: search is URL-query-param driven on the home route (`/?q=term`). Results reuse the ArticleList component. This is simpler than a dedicated search results page and keeps navigation consistent. |
| 5 | **Testing after all features** | Unit tests for validators/slug/search can be written as soon as modules exist, but grouping all testing in one iteration avoids context-switching. E2E tests require all MVP features to be functional. |
| 6 | **Responsive design baked into components, verified in polish** | Each component uses Tailwind responsive utilities as it's built. The responsive-polish iteration is verification and edge-case fixes, not a ground-up responsive retrofit. |
| 7 | **CI in iteration 1** | Setting up CI early catches regressions from the start. The workflow validates that the scaffold is correct before any feature code is written. |

---

## Associated Files

- `docs/iterations/iteration-1.md` — Environment & Foundation
- `docs/iterations/iteration-2.md` — Layout, Browsing & Detail
- `docs/iterations/iteration-3.md` — Search
- `docs/iterations/iteration-4.md` — Editing
- `docs/iterations/iteration-5.md` — Organization & Status (Stretch)
- `docs/iterations/iteration-6.md` — Testing
- `docs/iterations/iteration-7.md` — Polish & Documentation

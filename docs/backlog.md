# Implementation Backlog

## MVP Scope Definition
- **In‑Scope (MVP)**
  1. Article browsing (list) and detail pages.
  2. Full‑text search across article titles and content.
  3. Basic markdown editing (create & edit) for all articles.
  4. Minimal authentication (credential login) for content owners.
  5. Unit tests for core logic and Playwright E2E covering browse → search → edit.
- **Stretch / Post‑MVP**
  - Category or tag‑based organization (tag UI, filtering).
  - Article status handling (draft / published) UI and API.
  - Advanced accessibility audits, performance optimisations, deployment scripts.

## Iteration Plan Overview
| Iteration | Goal | Scope |
|-----------|------|-------|
| **1** | Set up local dev environment, repo structure, base dependencies, CI scripts. | Project scaffolding, Next.js, Tailwind, Prisma, authentication stub, lint/format, basic README. |
| **2** | Implement article data model, CRUD API, and list/detail UI. | Prisma schema, migrations, API routes (`GET /api/articles`, `GET /api/articles/:id`), article list page, detail page, React Query hooks, basic styling. |
| **3** | Add full‑text search using SQLite FTS5 and UI integration. | Search endpoint (`GET /api/search`), debounced search bar component, result rendering, fallback empty states. |
| **4** | Build markdown editor for create/edit flows and tag/status basics. | React‑MDE integration, edit page UI, Zod validation, API `POST /api/articles`, `PUT /api/articles/:id`, tag selector (minimal), status toggle. |
| **5** | Testing, QA, and polish. | Jest unit tests, React Testing Library component tests, Playwright E2E suite (browse → search → edit), CI scripts, final documentation updates. |

## Dependency & Sequencing Notes
- **Iteration 2** depends on the Prisma schema and migration from Iteration 1.
- **Iteration 3** requires the article table to exist and the FTS5 virtual table (created via migration).
- **Iteration 4** needs the API endpoints from Iteration 2 and the search route from Iteration 3.
- **Iteration 5** can only run after all functional features are present (iterations 1‑4).
- Critical path: 1 → 2 → 3 → 4 → 5.

## Stretch & Post‑MVP Phasing
- **Tags & Categories** – implement after core editing (Iteration 4) as a separate iteration.
- **Status Handling** – add after basic editing; can be merged with tags if time permits.
- **Advanced Accessibility / Performance** – post‑MVP backlog items.

## Decisions Log
- Chosen **React 19 + Next.js 16** for latest stable server‑component support.
- Selected **SQLite + Prisma** for zero‑config local DB with easy future migration.
- Adopted **Tailwind 4** for rapid utility‑first styling.
- Used **React‑MDE** for lightweight markdown editing per design spec.
- Implemented **SQLite FTS5** for search to avoid external services.
- Scoped authentication to **next‑auth Credentials Provider** for MVP simplicity.
- Testing stack: **Jest**, **React Testing Library**, **Playwright** as defined in architecture.

# Implementation Backlog — Simplified Knowledge Base App

**Version:** 1.0  
**Date:** 2026-07-10  
**Sources of truth:** [`product-brief.md`](./product-brief.md), [`architecture.md`](./architecture.md), [`design-spec.md`](./design-spec.md)

This backlog is the execution plan for v1. A developer should work through iterations **in order**, leaving the app in a runnable state after each one.

| Artifact | Path |
|----------|------|
| Master backlog | `docs/backlog.md` (this file) |
| Iteration 1 | [`docs/iterations/iteration-1.md`](./iterations/iteration-1.md) |
| Iteration 2 | [`docs/iterations/iteration-2.md`](./iterations/iteration-2.md) |
| Iteration 3 | [`docs/iterations/iteration-3.md`](./iterations/iteration-3.md) |
| Iteration 4 | [`docs/iterations/iteration-4.md`](./iterations/iteration-4.md) |
| Iteration 5 | [`docs/iterations/iteration-5.md`](./iterations/iteration-5.md) |
| Iteration 6 | [`docs/iterations/iteration-6.md`](./iterations/iteration-6.md) |

---

## 1. MVP scope definition

### 1.1 In scope (MVP)

Aligned with the product brief’s required features **and** the architecture/design decision to ship categories, tags, and draft/published in v1 (low schema cost; avoids a painful later migration).

| Area | Included capability |
|------|---------------------|
| **Browse** | Home list at `/` with SSR, pagination (`pageSize=20`), sort by `updatedAt` desc, compact rows (title, excerpt, category, status badge, relative date) |
| **Detail** | Article detail at `/articles/[slug]` with sanitized HTML body, meta, Edit/Delete actions |
| **Search** | Header typeahead (`GET /api/search`, 250ms debounce) + full results page `/search?q=`; FTS5 over title + content; **published only** |
| **Edit** | Create (`/articles/new`) and edit (`/articles/[slug]/edit`) with shared form, TipTap WYSIWYG, Zod validation, Server Actions |
| **Delete** | Confirm via `window.confirm`; hard delete; redirect home |
| **Status** | `DRAFT` \| `PUBLISHED`; list default published; status filter (Published / Drafts / All); Draft badge on list/detail |
| **Organize** | Optional single category; many tags; seed-only + select on form; URL filters `?category=` / `?tag=` / `?status=` / `?page=` |
| **UX shell** | Sticky header (wordmark, search, New article), design tokens, empty/error/404 states per design spec |
| **Data** | SQLite + Prisma; seed 8–12 articles, ≥3 categories, ≥5 tags; FTS bootstrap |
| **Security (basic)** | Zod on writes; HTML allowlist sanitize on write; no public auth (localhost-first) |
| **Concurrency** | Optimistic check via `expectedUpdatedAt` on update; conflict banner + reload |
| **Testing (per brief)** | **Unit tests** for core pure logic; **Playwright E2E** for critical journey browse → search → edit |

### 1.2 Stretch / post-MVP (not in this backlog’s delivery bar)

| Item | Notes |
|------|-------|
| Authentication / roles | Architecture A1; add Auth.js later behind flag |
| Admin CRUD pages for categories/tags | Seed + form select only in v1; optional `createCategory`/`createTag` actions if time remains |
| Inline create category/tag on form | Nice-to-have; not required |
| Autosave / collaborative editing | Explicit Save only; last-write-wins with conflict detect |
| Markdown source of truth / import-export | TipTap HTML only |
| Infinite scroll, sort UI, command palette (⌘K) | Pagination only; no ⌘K |
| Dark mode, toasts library, modal system | Banners + `window.confirm` only |
| REST CRUD API, Postgres, external search | Scaling path documented in architecture §6.8 |
| Full a11y audit suite, visual regression, load tests | Explicitly **not MVP** per brief testing scope |
| Exhaustive E2E edge cases | Not MVP; critical journey only |

### 1.3 Explicit non-goals for v1

- No multi-tenant or multi-instance deployment
- No file uploads, comments, or version history
- No separate Express/API process
- No global client state library (URL + form + TipTap only)

---

## 2. Iteration plan overview

| Iteration | Goal | Scope summary | Exit criteria (working state) |
|-----------|------|---------------|-------------------------------|
| **1** — Foundation | Local env, repo structure, data layer | Next.js 16 + TS + Tailwind 4; Prisma schema/migrate; FTS SQL; seed; core utils; design tokens; app shell skeleton; README setup | `npm run dev` serves shell; `npm run db:seed` populates SQLite + FTS |
| **2** — Browse | Read path end-to-end | Queries; UI primitives; list + filters layout (status only if ready); detail; empty/404; relative dates | Browse published seed articles; open detail; empty states work |
| **3** — Edit | Write path end-to-end | Zod schemas; sanitize; create/update/delete actions; TipTap form; draft/published; revalidation | Create, edit, delete articles; status on form; list reflects changes |
| **4** — Organize | Categories & tags | List filters for category/tag; form category select + tag checkboxes; uncategorized meta; empty filter rail | Filter list by category/tag/status via URL; assign org fields on save |
| **5** — Search | Find answers quickly | FTS helpers; `/api/search`; SearchBox typeahead; `/search` results + snippets | Typeahead + full search return published hits; seed terms findable |
| **6** — Verify | Hardening + MVP tests | Conflict UX polish; error boundary; unit tests; Playwright journey; README polish | `npm test` and `npm run test:e2e` pass; critical journey green |

**Recommended session mapping (1–2 sessions total):**

- Session A: Iterations 1 → 3 (runnable browse + edit)
- Session B: Iterations 4 → 6 (organize, search, tests)

If time is tight within a session, cut order of feature depth (not testing scope): categories/tags polish before dropping tests. Never drop unit + critical E2E required by the brief.

---

## 3. Dependency and sequencing notes

### 3.1 Critical path

```
[1 Foundation: app + DB + seed]
        │
        ▼
[2 Browse: queries + list + detail] ──► first user-visible product value
        │
        ▼
[3 Edit: actions + TipTap + status] ──► second value (maintain knowledge)
        │
        ├──────────────────────┐
        ▼                      ▼
[4 Organize: cat/tag filters]  [5 Search: FTS + UI]
        │                      │
        └──────────┬───────────┘
                   ▼
        [6 Hardening + tests]
```

### 3.2 Blocking dependencies

| Dependency | Blocks |
|------------|--------|
| Iteration 1 complete (Prisma client, seed, utils, shell) | All later iterations |
| `listArticles` / `getArticleBySlug` (It. 2) | List UI, detail, later filters, edit prefill |
| Zod + Server Actions + TipTap (It. 3) | Create/edit E2E path; form-bound category/tags |
| FTS table + `syncArticleToFts` on CUD (It. 1 seed + It. 3 writes) | Iteration 5 search correctness |
| Seed articles with distinctive terms (`onboarding`, `deploy`, `vacation`) | Search verification and E2E |
| Sanitize-on-write (It. 3) | Safe detail render (`dangerouslySetInnerHTML`) |
| Working create/edit/search UI (It. 3 + 5) | Iteration 6 Playwright journey |

### 3.3 Parallelism (single developer)

Within an iteration, prefer the task order written in each file. Across iterations, **do not** start It. 5 search UI before FTS sync exists on create/update (It. 3). Category filter UI (It. 4) can technically start after It. 2 if status filters already exist, but form fields require It. 3’s `ArticleForm` — keep order 3 → 4.

### 3.4 Architecture-aligned implementation order (reference)

Architecture §14 maps onto this backlog as:

| Architecture step | Iteration |
|-------------------|-----------|
| Scaffold Next + Tailwind + TS | 1 |
| Prisma + migrate + seed + FTS | 1 |
| Queries list + detail | 2 |
| UI shell, list, detail, empty | 2 |
| Form + TipTap + actions + validation | 3 |
| Status + category/tag on form and filters | 3 (status) + 4 (cat/tag) |
| FTS API + SearchBox + `/search` | 5 |
| Sanitize + conflict | 3 (core) + 6 (UX polish) |
| Vitest + Playwright + README | 6 |

---

## 4. Stretch and post-MVP phasing

| Phase | Features | Trigger |
|-------|----------|---------|
| **v1.1** | Inline `createCategory` / `createTag` from form; optional overwrite-on-conflict; success `?saved=1` banner polish | After MVP green |
| **v1.2** | Auth.js credentials or OIDC; hide drafts from non-editors; bind deploy behind auth | Before any public/network exposure |
| **v2** | Postgres + `tsvector` or Meilisearch; multi-instance; soft-delete/archive | Multi-instance or >10k articles |
| **Later** | Markdown import/export; version history; attachments; full a11y audit program; visual regression | Product demand |

Out-of-scope items from §1.2 land in the phase table above; they are **not** scheduled in iterations 1–6.

---

## 5. Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-B1 | **Categories, tags, and draft/published are MVP** even though the brief lists only features 1–3 as “required” | Architecture §1.2 and design spec include them in v1; low SQLite cost; empty states and filters need them; avoids schema churn |
| D-B2 | **Six iterations**, not one big spike | Matches “multiple developer runs,” leaves a working app after each step, maps cleanly to architecture §14 |
| D-B3 | **Data layer + seed in Iteration 1** (not only scaffold) | Backlog instruction: first iteration establishes env, structure, deps, and seed/scripts so later iterations can run immediately |
| D-B4 | **Status in Iteration 3; category/tag filters in Iteration 4** | Status is on the article form and list default (critical to edit UX); cat/tag filters are additive organization |
| D-B5 | **Search after write path (It. 5 after 3)** | FTS must stay in sync on CUD; search E2E needs create/edit stable; brief journey is browse → search → edit |
| D-B6 | **Testing consolidated in Iteration 6**, with pure utils unit-testable as they land | Brief MVP requires unit + critical E2E; avoid incomplete Playwright until journey surfaces exist; unit tests for slugify/FTS/excerpt/Zod can be added when those modules exist but **must** be complete by It. 6 |
| D-B7 | **No auth, no toast/modal libraries, TipTap HTML, npm, SQLite** | Architecture A1–A8 and design D1–D8; keep finishable in 1–2 sessions |
| D-B8 | **Do not expand testing beyond brief** | MVP = unit (core logic) + Playwright critical journey; no a11y audit suite, no exhaustive E2E, no load tests |
| D-B9 | **If session time runs short:** finish It. 1–3 + 5 + 6 before deep It. 4 polish | Architecture tight-order: 1 → 3 → 2 → 5 → 4; this backlog still sequences browse before edit for user-visible value, but category/tag depth is the first cut of *polish*, not search or tests |
| D-B10 | **Stack versions** | Use architecture-pinned versions (Next 16.2.x, React 19.2.x, Prisma 7.8.x, Tailwind 4.3.x, TipTap 3.27.x, Vitest 4.x, Playwright 1.61.x, Zod 4.x, Node 24.x). Re-verify on install if registry differs; prefer architecture pins |

---

## 6. Testing scope (locked to brief)

| In MVP | Out of MVP |
|--------|------------|
| Vitest unit tests: `slugify`, `toFtsQuery`, `excerpt`/`stripHtml`, Zod `articleFormSchema` | Full accessibility audit suite |
| Playwright: browse → search → edit critical journey (plus create draft visibility as in architecture outline) | Exhaustive E2E edge cases |
| Chromium project; shared SQLite test DB | Visual regression, load testing |

Testing tasks live primarily in **Iteration 6**. Implement pure functions with testability in mind in earlier iterations; do not invent extra test layers.

---

## 7. Definition of done (overall MVP)

- [ ] All six iterations completed with exit criteria met  
- [ ] Features in §1.1 present and wired end-to-end  
- [ ] Design routes S1–S7 exist with copy/tokens from design spec  
- [ ] `npm run dev`, `npm test`, `npm run test:e2e` succeed on a clean setup per README  
- [ ] No stretch features required for “done”  

---

## 8. Quick links for implementers

| Concern | Spec section |
|---------|--------------|
| Stack & versions | architecture §2 |
| Routes & components | architecture §4; design §1–2 |
| Schema & FTS | architecture §6 |
| Server Actions & search API | architecture §5, §7 |
| Validation & sanitize | architecture §7.3, §8.4 |
| UI tokens, states, copy | design §5–8 |
| Seed content rules | architecture §13 |
| Local setup | architecture §12 |

# QA Report — Knowledge Base App (MVP)

**Reviewer:** Senior QA Engineer / Code Reviewer  
**Date:** 2026-05-03  
**Commit:** `68b06f0` (`evals_Apr2026_Kimi-K2.6`)  

---

## 1. Executive Summary

The application is **largely functional** and meets most MVP requirements, but has **two critical defects** (one security vulnerability in search, one the dev server `host` misconfiguration) and **three major issues** (E2E cross-browser flakiness, missing `eslint`/`prettier` configs, `tsc --noEmit` failures). The **codebase is modular, UI is responsive, and the core flows (browse, search, create, edit, delete) all work correctly in Chromium**, but the release readiness is conditional on fixing the search injection vector and documenting the local host caveat.

**Recommendation: Ship with conditions** — see §10.

---

## 2. MVP Flow Results

| Flow | Status | Notes |
|------|--------|-------|
| Browse → View article detail | **Pass** | E2E passes on Chromium. Cards render with title, excerpt, category chip, tags, relative time. Click navigates to detail. |
| Search → Select result → View | **Pass** | Debounced 300 ms, URL sync `?q=`, clear button, empty-search state, result click → detail. FTS5 returns ranked results. |
| Create article → Save → Verify | **Pass** | Title/content/category/tags validated. On success navigates to `/articles/:slug`. localStorage draft cleared. |
| Edit article → Save → Verify | **Pass** | Slug immutability confirmed. Dirty detection, autosave (localStorage), `beforeunload` guard, validation triggers on blur/save. |
| Delete article → Confirm → Removed | **Pass** | Custom ConfirmModal with focus trap + Escape close. Delete succeeds, redirects to `/`. |
| Empty states | **Pass** | "No articles yet" (no DB rows), "No results found" (search with no matches), "Article not found" (nonexistent slug) all present. |
| Validation errors | **Pass** | Client-side Zod on title (required, max 200) and content (required). Tags regex enforced. Server returns same shape. |

*All flows verified via manual API calls (`curl`), local dev server, and Playwright E2E on Chromium. Firefox/WebKit E2E shows flakiness (detailed in §5).*

---

## 3. Local Setup Result

**Status: Partial Pass**

| Step | Result |
|------|--------|
| `npm install` | Works. Node 24.10.0 (not the spec'd 22.14 LTS) present. Spec drift. |
| `npm run db:reset` | Works. Creates FTS5 virtual table + triggers, seeds 4 categories + 10 articles. |
| `npm run dev` | Works. Vite frontend starts on `localhost:5173`, Express API on `localhost:3001`. |
| `npm run build && npm run start` | Works. Express serves `dist/` + SPA fallback. |
| `.env` file | **Missing from README.** Quick-start says `cp .env.example .env` but there is `.env.example`; however README quick-start does *not* mention this step. This is a doc gap. In practice the app works because `dotenv` silently tolerates a missing `.env` and falls back to hard-coded defaults in `server/index.ts`. |

**Caveat:** The dev setup does not document that the Vite dev server only binds to `localhost`. Running on a remote machine or WSL host-access requires `--host` or editing `vite.config.ts`. This is fine for local-only use but should be noted.

---

## 4. Test Suite Results & Coverage Summary

### Unit Tests (Vitest)

| Suite | Tests | Status |
|-------|-------|--------|
| `server/lib/slugify.test.ts` | 10 | Pass |
| `server/services/articleService.test.ts` | 9 | Pass |
| `server/services/searchService.test.ts` | 5 | Pass |
| `server/services/categoryService.test.ts` | 1 | Pass |
| **Total** | **25** | **25/25 Pass** |

- Coverage target: core business logic and utilities ✅
- **Notable gaps:** No unit tests for `server/middleware/validate.ts`, `errorHandler.ts`, or the Express route handlers (those are implicitly covered by E2E). No tests for `server/index.ts` SPA fallback.
- No code-coverage plugin configured; we cannot report actual line/branch percentages.

### E2E Tests (Playwright)

| Spec | Tests | Chromium | Firefox | WebKit |
|------|-------|----------|---------|--------|
| `browse.spec.ts` | 4 | ✅ Pass | ❌ Fail | ❌ Fail |
| `search.spec.ts` | 5 | ✅ Pass | ❌ Fail | ❌ Fail |
| `edit.spec.ts` | 6 | ✅ Pass | ❌ Fail | ❌ Fail |
| **Total** | **15** | **15/15** | **0/15** (timeouts/visibility) | **0/15** (timeouts/visibility) |

Cross-browser E2E is **broken** on Firefox and WebKit. The failures are timeouts (`locator.click` and `expect(locator).toBeVisible()`) and URL mismatch (`expect(page).toHaveURL`). This appears to be an environment issue (the `webServer` may not be reachable for those browsers, or an SPA fallback interaction specific to Firefox/WebKit). It is a **major defect** because the spec states local default should be Chromium only and CI should run Chromium + Firefox + WebKit.

---

## 5. Responsiveness Result

**Status: Pass**

- **Desktop (≥1024 px):** Sidebar visible (`lg`), split-pane editor, header with text logo and "New Article" button. Cards span full width inside centered column (`max-w-3xl`).
- **Tablet (768–1023 px):** Sidebar hidden; hamburger toggles drawer. Editor tab bar hidden; split-pane still shown (`md:flex-row`). "New Article" text appears.
- **Mobile (&lt;768 px):** Single-column layout. Drawer overlay. Editor switches to Write/Preview tabs. Mobile sticky bottom bar (Save/Cancel) in editor. Tags and category inputs stack. Header uses icon-only new-article button. ✅

No horizontal scroll observed. Tailwind breakpoints `sm`/`md`/`lg` used consistently.

**Defect:** On tablet, the drawer does not trap focus (focus can escape to the main page while drawer is open). Only Escape and overlay-click close it. This is a **minor** accessibility issue.

---

## 6. Error Handling Result

**Status: Pass**

| Scenario | Handling | Grade |
|----------|----------|-------|
| Missing article slug | `NOT_FOUND` JSON envelope + 404. UI renders `EmptyState`. | ✅ |
| Empty search result | Empty state with query highlight. | ✅ |
| Invalid POST body | `VALIDATION_ERROR` 400 with field-level `details`. | ✅ |
| Server 500 | Generic `INTERNAL_ERROR` logged to console. No leak. | ✅ |
| Validation on client | Inline red text with `AlertCircle` icon, red border + ring. | ✅ |
| Category load failure | Silently ignored; dropdown shows "None". Acceptable per backlog. | ✅ |
| Delete failure | Toast error shown, modal closes gracefully. | ✅ |

---

## 7. Spec Adherence Summary

| Spec Area | Adherent? | Notes |
|-----------|-----------|-------|
| Architecture — Node/Express/React stack | Yes | React 19, Express 5, Tailwind 4, Prisma 7, Zod 4. |
| Architecture — API contract `{data,error}` | Yes | All routes return consistent envelope. |
| Architecture — FTS5 search via raw SQL + triggers | Yes | `prisma/fts-setup.sql` executed in `seed.ts`. |
| Architecture — shared Zod schemas | Yes | `shared/schemas.ts` used by both FE and BE. |
| Design — Search-first, calm palette | Yes | Matches tokens in `index.css`. |
| Design — Split-pane editor (desktop), tabs (mobile) | Yes | Implemented in `MarkdownEditor.tsx`. |
| Design — Responsive sidebar/drawer/header | Yes | `AppShell` follows breakpoints. |
| Design — Empty states | Yes | `EmptyState` component reused. |
| Design — Toast + ConfirmModal styling | Yes | Variants and positioning match spec. |
| Backlog — Categories/tags in editor only | Yes | Category dropdown + `TagInput` shipped. No browse/filtering. |
| Backlog — Article status deferred | Yes | `DRAFT` default; no filtering. |
| Backlog — E2E coverage for 4 critical journeys | Yes | Browse, Search, Create, Edit, Delete (all covered). |

### Meaningful Deviations

1. **React StrictMode removed** (Iteration 5). This was done to fix Playwright double-render issues. The architecture spec never mandated StrictMode, but it is a standard React best practice for catching side-effects. Removing it was pragmatic but deviates from typical React app setup.
2. **`useSearchParams` for search state** instead of a separate global state store. This was a deliberate decision (Iteration 3 log) and aligns with the spec's preference for simplicity. Not a defect.
3. **Toast on delete may not persist after navigation** — Iteration 4 notes this pre-existing issue. Because Toast is rendered inside the page component, navigating away unmounts it before the 3-second auto-dismiss. A global toast context would fix it. This is a minor UX gap.

---

## 8. Code Signals Review

| Signal | Status | Evidence |
|--------|--------|----------|
| **Linting clean / no obvious warnings** | **No** | No ESLint/Prettier configs exist. `SearchInput.tsx` contains a stray `eslint-disable-next-line react-hooks/exhaustive-deps` comment, proving lint was run during dev but not enforced in CI. |
| **No obvious security holes** | **No** (Critical) | `searchService.ts` uses `$queryRawUnsafe` with a **whitelist-only sanitizer** (`replace(/[^a-zA-Z0-9\s]/g, ' ')`). This prevents SQL injection *for ASCII input*, but **non-ASCII unicode characters are stripped to spaces, losing user intent**, and the raw query still interpolates directly. FTS5 `MATCH` cannot be parameterized, but the defense is shallow. Also, `helmet` is not installed; no security headers (CSP, HSTS, X-Frame-Options, etc.) are set. The app is open to clickjacking and XSS via markdown if a future plugin enables raw HTML. |
| **No god components / modular** | **Yes** | Components are small and single-responsibility: `Header`, `Sidebar`, `SearchInput`, `ArticleCard`, `ArticleList`, `MarkdownEditor`, `TagInput`, `ConfirmModal`, `Toast`, `Skeleton`, `EmptyState`. Max file length ~578 lines (`ArticleEdit.tsx`), which is borderline but acceptable because it is a page-level form with many states. |
| **Follows architecture spec** | **Mostly** | API routes, services, middleware separation matches spec. One deviation: `server/index.ts` SPA fallback is placed *before* `errorHandler`, meaning 404s from unknown `/api/*` paths hit the React `index.html` instead of the JSON error handler. This is a routing-order bug. |
| **Iteration scope followed** | **Yes** | Each iteration matches its summary. No major scope creep observed. |
| **Dependency versions current** | **Mixed** | React 19.2.5 ✅, Vite 8.0.10 ✅, Tailwind 4.2.4 ✅, Express 5.2.1 ✅, Prisma 7.8.0 ✅, Zod 4.3.6 ✅, Playwright 1.59.1 ✅, Vitest 4.1.5 ✅. Node runtime is **24.10.0** instead of spec'd **22.14.0 LTS**. This is not a functional issue but a spec drift. |

---

## 9. Defect Log

### Critical

| # | Title | Repro | Impact |
|---|-------|-------|--------|
| C1 | **SQL injection risk in FTS5 search** | In `server/services/searchService.ts`, `escapeFtsQuery()` strips `[^a-zA-Z0-9\s]`. It then interpolates the "safe" string into `$queryRawUnsafe` inside `WHERE ArticleFts MATCH '${safeQuery}'`. While ASCII-only characters are stripped, the approach is still raw-string interpolation against a SQL virtual table. A future locale/unicode bypass or FTS5 syntax edge case could break the app. | Data integrity; potential unauthorized read. |
| C2 | **SPA fallback masks API 404s** | In `server/index.ts`, `express.static('dist')` and the catch-all `sendFile('dist/index.html')` are placed *before* the global `errorHandler`. Any request to an unknown `/api/xyz` path returns the React `index.html` with a 200 status instead of a JSON 404. | API clients receive HTML instead of JSON errors; debugging is hard. |

### Major

| # | Title | Repro | Impact |
|---|-------|-------|--------|
| M1 | **Cross-browser E2E failing** | Run `npm run test:e2e`. Firefox and WebKit projects fail on timeouts and visibility assertions (see §5). Chromium passes. | Cannot trust CI on non-Chromium browsers. Undermines regression safety. |
| M2 | **No linting or formatting configs** | No `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` exists. The `package.json` lists `eslint` and `prettier` as devDeps but there are no target scripts. | Code style inconsistency; risk of shipping bugs caught by static analysis. |
| M3 | **`tsc --noEmit` failing** | Run `npx tsc --noEmit`. Two errors: `e2e/global-setup.ts` missing Node types (add `@types/node` to tsconfig `types`), and `e2e/specs/edit.spec.ts:93` unused variable `detailUrl`. | CI type-check gate cannot pass. Merge-blocking for typed repos. |

### Minor

| # | Title | Repro | Impact |
|---|-------|-------|--------|
| m1 | **Local dev host binding not documented** | `vite.config.ts` does not expose `--host`. Running in a container or WSL network requires undocumented manual change. | Developer friction. |
| m2 | **Delete toast disappears on navigation** | Delete an article. Toast appears, then user is redirected to `/`. Because Toast is page-local, it unmounts before auto-dismiss completes. | User may miss confirmation feedback. |
| m3 | **Stale localStorage drafts for deleted articles** | If an article is deleted, its `draft:${slug}` key remains in localStorage forever. No cleanup logic. | Minor storage pollution. |
| m4 | **Table drawer focus not trapped** | On tablet/mobile, open the hamburger drawer. Press `Tab`. Focus moves to the main page instead of cycling within the drawer. | Accessibility gap. |
| m5 | **Pagination on search results missing** | When `?search=` is used on `GET /api/articles`, the route delegates to `searchArticles()` which returns an *unpaginated* array. The frontend `Home` simply renders all search results. If the search returns 200+ articles, performance degrades. | Scalability concern for large datasets. |

---

## 10. Spec Drift Log

| Area | Spec | Actual | Severity | Rationale (if intentional) |
|--------|------|--------|----------|----------------------------|
| Node.js version | 22.14.0 LTS | 24.10.0 | Low | Environment-provided Node; app works fine. |
| Architecture — `helmet` middleware | Recommended in §11.3 | Not installed | Low | v1 assumed basic security only. |
| Design — Toast animation | Animate in/out | Works with `prefers-reduced-motion` | None | Follows spec exactly. |
| Iteration 5 — E2E browser matrix | Chromium, Firefox, WebKit | Chromium only passes | Major | Environment issue; not shipped intentionally. |
| No lint/prettier configs | CI checklist expects `npm run lint` | Configs missing | Major | Likely oversight. |

---

## 11. Release Recommendation

### Ship with conditions

The app **meets core MVP functional requirements** on Chromium/Desktop and Mobile. The critical search injection vector (C1) and the API 404 masking (C2) must be fixed before any production deployment. The E2E cross-browser flakiness (M1) and missing lint/type-check gates (M2, M3) must be resolved before CI can be trusted.

**Conditions for shipping:**
1. Fix `searchService.ts` raw-string interpolation (e.g., switch to a parameterized query wrapper or use Prisma ORM search if possible; at minimum, add a clear security comment and input-length cap).
2. Re-order `server/index.ts` so `errorHandler` runs **before** the SPA fallback, or mount a dedicated `/api/*` 404 handler.
3. Add ESLint + Prettier configs with `npm run lint` and `npm run format` scripts, plus `npm run typecheck` script that covers all tsconfig projects.
4. Fix `tsc --noEmit` errors (add `@types/node` to tsconfig, remove unused `detailUrl`).
5. Document `cp .env.example .env` in README quick-start.

**If those 5 items are fixed, the app is ready to ship as an internal MVP.**

---

## 12. Next Steps (Prioritized)

| Priority | Task | Owner hint |
|----------|------|------------|
| P0 | Fix search SQL injection / unsafe interpolation | Backend |
| P0 | Reorder Express middleware so API 404s return JSON | Backend |
| P0 | Add `eslint.config.js` + `.prettierrc` + `lint`/`format` scripts | DevEx |
| P0 | Fix `tsc --noEmit` errors (`@types/node`, unused `detailUrl`) | Type safety |
| P1 | Debug Firefox/WebKit E2E timeouts (likely SPA fallback or webServer URL) | QA / Frontend |
| P1 | Add `csp` / security headers (at minimum `helmet`) | Backend |
| P1 | Document `.env.example` copy step in README | Docs |
| P2 | Implement global Toast context so delete confirmation survives navigation | Frontend |
| P2 | Clean up localStorage drafts when article is deleted | Frontend |
| P2 | Trap focus in mobile/tablet drawer | Frontend / a11y |
| P2 | Add pagination to search results (`searchArticles` returns `{results,total,page,..}`) | Backend |
| P2 | Add code-coverage reporting to Vitest | Testing |
| P3 | Add unit tests for `validate.ts` and `errorHandler.ts` | Testing |

# Iteration 6 Summary — Hardening, MVP tests, and finish

**Date:** 2026-07-16  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

Closed the MVP quality bar: global error boundary, conflict/validation UX polish, Vitest core-logic suite, Playwright critical journey on an isolated SQLite test DB, production build verification, and README finalization.

### T6.1 — Global error boundary

`src/app/error.tsx` (Client Component, design S7):

- Title: “Something went wrong”
- Generic body (no stack in UI; optional `error.digest` reference)
- Primary **Try again** → prefers Next 16 `unstable_retry()`, falls back to `reset()`
- Secondary **Back to articles** → `/`
- Logs to console for local debugging

### T6.2 — Conflict and validation UX polish

| Check | Status |
|-------|--------|
| Stale `expectedUpdatedAt` → `CONFLICT` + design copy | Server action already returns design `form.conflict` message; form now always surfaces that canonical copy + **Reload** |
| Form-level banners `role="alert"` + danger-muted styles | Confirmed on `ArticleForm` |
| Delete confirm `Delete “{title}”? This cannot be undone.` | Matches design §8 on form + detail button |
| `?saved=1` success banner | **Not implemented** (stretch only) |

### T6.3 — Unit tests (Vitest)

| File | Coverage |
|------|----------|
| `tests/unit/slugify.test.ts` | spaces, collapse, strip unsafe, unicode, empty/edge |
| `tests/unit/fts-query.test.ts` | empty, specials, multi-token AND + `*` |
| `tests/unit/excerpt.test.ts` | `stripHtml` + `makeExcerpt` length/word-break |
| `tests/unit/article-schema.test.ts` | title/slug/content/max lengths/tagIds max/valid payload |
| Existing | `dates.test.ts`, `fts.test.ts` (sanitize), `smoke.test.ts` |

`vitest.config.ts`: `environment: "node"`, `@/*` alias, `tests/setup.ts`.

**Result:** `npm test` — **42 passed**.

### T6.4 — Playwright config + test DB

- `playwright.config.ts` — `testDir: ./e2e`, `fullyParallel: false`, `workers: 1`, `baseURL: http://127.0.0.1:3000`, Chromium only, `webServer` with `DATABASE_URL=file:./prisma/test.db`
- `pretest:e2e` — `prisma migrate deploy` + seed against `test.db`
- `next.config.ts` — `allowedDevOrigins: ["127.0.0.1"]` for Playwright host

### T6.5 — E2E critical journey

`e2e/article-journey.spec.ts` (serial):

1. Home list → open first article (title + body)
2. Search `onboarding` → typeahead hit (or full `/search`)
3. Edit `how-we-deploy` title → save → detail shows new title
4. Create **draft** → visible at `/?status=DRAFT`

`e2e/smoke.spec.ts` — shell landmarks on home.

**Result:** `CI=1 npm run test:e2e` — **5 passed**.

### T6.6 — Build and lint

- `npm run build` — success (App Router routes compile)
- `npm run lint` — clean after SearchBox effect setState fix (pre-existing lint blocker)

### T6.7 — README

Updated with product one-liner, setup, full scripts table, MVP testing scope vs non-scope, v1 limitations (no auth, SQLite, published-only search), troubleshooting (FTS, port, E2E wrong DB).

### T6.8 — MVP checklist (honest)

| §1.1 capability | Present |
|-----------------|---------|
| Browse list + pagination + status filter | Yes |
| Detail + Edit/Delete | Yes |
| Search typeahead + `/search` (published only) | Yes |
| Create/edit TipTap + Zod + Server Actions | Yes |
| Categories/tags filters + form assign | Yes |
| Draft/published | Yes |
| Empty/404/error states | Yes |
| Optimistic concurrency conflict banner | Yes |
| Unit + critical E2E | Yes |

**Intentionally not required for done:** auth, toast/modal libs, inline category create, autosave, full a11y audit, visual regression, load tests, `?saved=1` banner.

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| Next 16 error recovery | Docs prefer `unstable_retry` over `reset`; both accepted, Try again uses retry when available |
| E2E port | Prefer free port 3000 or `CI=1` so Playwright does not reuse a `dev.db` server |
| TipTap console warn | Duplicate `link` extension name during editor load; non-blocking; not fixed this iteration |
| Turbopack NFT warning | Build warns about dynamic path tracing via `db.ts` / `fts.ts`; build still succeeds |
| Conflict E2E | Not automated (needs two sessions / stale timestamp); covered by action + form code path and design copy |

---

## Verification (local)

```text
npm test              → 42 passed
npm run lint          → clean
CI=1 npm run test:e2e → 5 passed (pretest seeds test.db)
npm run build         → success
```

App remains runnable via `npm run dev` with `prisma/dev.db` after normal setup.

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-I6-1 | Prefer `unstable_retry` with `reset` fallback in `error.tsx` | Matches Next 16 docs while keeping brief “Try again” behavior |
| D-I6-2 | Canonical conflict copy in form on `CONFLICT` | Guarantees design §8 string even if action message drifts |
| D-I6-3 | `pretest:e2e` migrate+seed `test.db`; workers=1 | Isolated SQLite; avoid parallel write races |
| D-I6-4 | Article list selectors use `a[href^="/articles/"]` | Filter rail also uses `li a`; must not click “Published” |
| D-I6-5 | Clear typeahead state in `onChange`, not empty branch of effect | Satisfies `react-hooks/set-state-in-effect` without changing UX |
| D-I6-6 | No stretch `?saved=1` banner | Iteration marks it optional; redirects already confirm save |

---

## MVP backlog status

Iterations **1–6 complete**. Overall definition of done in `docs/backlog.md` §7 is met for the implementation backlog (features + tests + docs). Stretch/post-MVP items remain out of scope.

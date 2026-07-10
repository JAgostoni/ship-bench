# Iteration 6 — Hardening, MVP tests, and finish

**Goal:** Close MVP quality bar: polish remaining error/conflict UX, implement the **brief-mandated** unit and E2E tests, and finalize README so a clean machine can verify the critical journey.

**Scope:** Error boundary, conflict UX verification, Vitest suite for core logic, Playwright critical journey (browse → search → edit), test DB wiring, README polish. **Do not** add full a11y audits, exhaustive E2E matrices, visual regression, or load tests.

**Sources:** product brief Testing Scope; architecture §§11, 12, 14 steps 8–11; design S7, conflict copy.

**Depends on:** Iterations 1–5 (full user journeys available).

---

## Exit criteria

- [ ] `npm test` passes with unit coverage for slugify, toFtsQuery, excerpt/stripHtml, articleFormSchema  
- [ ] `npm run test:e2e` passes critical journey on Chromium against seeded test DB  
- [ ] `error.tsx` shows calm recovery UI  
- [ ] Edit conflict path returns CONFLICT and shows reload banner (manual or light automated check)  
- [ ] README documents setup, test commands, and known v1 limitations (no auth, etc.)  
- [ ] Production build succeeds: `npm run build`  

---

## Task list

### T6.1 — Global error boundary

Implement `src/app/error.tsx` (client boundary) per design S7:

- Title: “Something went wrong”
- Generic body (no stack in UI)
- Primary: “Try again” calling `reset()`
- Secondary: “Back to articles” → `/`

**Deliverable:** Uncaught render errors don’t white-screen the app.

---

### T6.2 — Conflict and validation UX polish

1. Manually verify: two edit sessions / stale `expectedUpdatedAt` → banner  
   “This article changed since you opened it. Reload to get the latest version.” + Reload.
2. Ensure form-level error banners use `role="alert"` and danger-muted styles.
3. Optional: `?saved=1` one-shot success on detail — **stretch only**.
4. Confirm delete confirm strings match design §8.

**Deliverable:** Write-path edge UX matches design without new libraries.

---

### T6.3 — Unit tests (Vitest) — MVP required

Add tests under `tests/unit/` (architecture §11.1):

| File | Cases |
|------|--------|
| `slugify.test.ts` | spaces → hyphens; collapse multiples; strip unsafe/unicode as designed; empty/edge |
| `fts-query.test.ts` | empty/whitespace → empty string or no tokens; strips quotes/specials; multi-token `AND` + `*` suffix |
| `excerpt.test.ts` | strips tags; length cap ~240; plain text spacing reasonable |
| `article-schema.test.ts` | missing title; bad slug; content required; max lengths; valid payload; tagIds max |

Configure `tests/setup.ts` if needed. `vitest.config.ts`: `environment: "node"`, alias `@/*`.

**Not required:** TipTap component tests, full Prisma integration tests.

**Deliverable:** `npm test` green.

---

### T6.4 — Playwright configuration and test DB

1. Finalize `playwright.config.ts` per architecture §11.2:
   - `testDir: ./e2e`
   - `fullyParallel: false` (shared SQLite)
   - `baseURL: http://127.0.0.1:3000`
   - `webServer`: `npm run dev` with `DATABASE_URL=file:./prisma/test.db`
   - Chromium project only
2. Add script or document pretest: migrate + seed **test.db** (e.g. `pretest:e2e` running prisma migrate deploy + seed with test env).
3. `npx playwright install` documented in README (one-time).

**Deliverable:** E2E runner boots app against isolated DB.

---

### T6.5 — E2E critical journey — MVP required

Implement `e2e/article-journey.spec.ts` covering architecture outline:

1. Open home — expect article list **or** empty state (with seed: list).
2. Click first article — expect title + body content visible.
3. Use search box — type known seed term (e.g. `onboarding`) — expect result in typeahead **or** after full search navigation.
4. Open edit from detail — change title to a unique value — save — expect updated title on detail.
5. Create new article as **draft** — appear when filter includes drafts (`?status=DRAFT` or Drafts control).

Optional second file `e2e/smoke.spec.ts`: home loads 200 / key landmark visible — only if it stays minimal.

**Do not** expand into exhaustive edge-case suites (brief: not MVP).

**Deliverable:** `npm run test:e2e` green.

---

### T6.6 — Build and lint sanity

1. Run `npm run build` and fix any type or App Router issues.
2. Run lint if configured; fix blockers only.
3. Smoke production: `npm start` optional locally.

**Deliverable:** Release-shaped build works.

---

### T6.7 — README and verification notes

Update README to include:

- Product one-liner + link to `docs/`
- Prerequisites and first-time setup
- Scripts table (`dev`, `db:*`, `test`, `test:e2e`)
- Testing notes: what MVP covers / what it does not (no full a11y audit)
- v1 limitations: no auth, single-tenant SQLite, published-only search
- Troubleshooting (FTS table missing, better-sqlite3, port in use)

**Deliverable:** Evaluator can run and verify without tribal knowledge.

---

### T6.8 — Final MVP checklist pass

Walk `docs/backlog.md` §1.1 and §7:

- Browse, detail, search, edit, delete, status, categories/tags, empty states, validation, basic a11y (labels, focus rings, skip link, non-color-only badges)
- Confirm stretch items were **not** required for done

**Deliverable:** Honest done state; any intentional gaps listed under limitations.

---

## Iteration-specific dependency notes

- **Testing scope is fixed by the brief** — implement unit + critical E2E only; do not “improve” scope by adding audit suites.
- If a pure function was missing tests because it landed late, add them here — this iteration is the **gate**.
- Prefer fixing product bugs found by E2E immediately; do not disable tests with `.skip` without documenting blocker.
- After this iteration, MVP implementation backlog is complete.

## Suggested verification

```bash
npm test
# prepare test db + seed
npm run test:e2e
npm run build
npm run dev
# manual: conflict banner, 404, error boundary (optional throw in dev), full happy path
```

## Mapping to brief deliverables

| Brief deliverable | Status after It. 6 |
|-------------------|--------------------|
| Working application | Yes (It. 1–5) |
| Tests and verification notes | Yes (this iteration + README) |
| Implementation backlog | `docs/backlog.md` + `docs/iterations/*` |
| Decisions log | `docs/backlog.md` §5 + architecture/design assumptions |

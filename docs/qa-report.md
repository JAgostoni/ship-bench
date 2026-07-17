# QA Report — Simplified Knowledge Base App (MVP)

**Reviewer role:** Senior QA Engineer / Code Reviewer  
**Date:** 2026-07-17  
**Branch:** `evals_june2026_grok_4.5`  
**Sources of truth:** `docs/product-brief.md`, `docs/architecture.md`, `docs/design-spec.md`, `docs/backlog.md`, iteration plans/summaries, README  
**Method:** Spec comparison + static code review + live local verification (HTTP + Playwright Chromium) + unit/E2E/lint/build runs. Developer claims were not trusted without re-verification.

---

## Executive summary

The MVP is **functionally complete** against the brief’s required features (browse, search, edit) and the architecture/backlog decision to ship categories/tags and draft/published in v1. Critical user journeys work end-to-end, including empty, validation, not-found, conflict, and draft-visibility states. Unit tests (42) and Playwright E2E (5) pass; lint is clean; production build succeeds.

**Release recommendation: Ship with conditions** (see §10). No critical functional blockers for the intended **local / internal** use case. Conditions address security boundary (no auth), small polish items, and dependency pin hygiene.

---

## 1. MVP flow results

| Flow | Result | Notes / evidence |
|------|--------|------------------|
| **Browse published list** | **PASS** | `GET /` → 200; heading “Articles”; 8 published seed articles; drafts hidden by default; relative dates + category/tags meta. Verified HTTP + Playwright. |
| **Open article detail** | **PASS** | List row → `/articles/[slug]`; H1, prose body (`.prose-article`), “All articles”, Edit, Delete. |
| **Draft visibility** | **PASS** | Default list excludes drafts; `/?status=DRAFT` shows seed drafts; new draft appears under Drafts; draft badge on detail. Drafts excluded from search API. |
| **Category / tag filters** | **PASS** | `?category=engineering` includes deploy/incident, excludes vacation; `?tag=onboarding` works; unknown category → “No matching articles” + Clear filters. Desktop rail + mobile selects both present. |
| **Search typeahead** | **PASS** | Header search, 250ms debounce, `GET /api/search?q=onboarding&limit=8` returns published hits; keyboard/listbox UI; click navigates to detail. Seed terms `onboarding`, `deploy`, `vacation` findable. |
| **Full search page** | **PASS** | `/search?q=onboarding` results + count; empty `q` → “Search the knowledge base”; no matches → “No results for …”; snippets use sanitized `<mark>` (observed marks on “deploy”). |
| **Create article** | **PASS** | `/articles/new` form; TipTap editor; draft + published create; redirect to detail; draft badge when draft. E2E + interactive create verified. |
| **Edit article** | **PASS** | Edit title → Save changes → detail shows new title (E2E on `how-we-deploy`; also interactive). |
| **Delete article** | **PASS** | Confirm dialog uses design copy `Delete “{title}”? This cannot be undone.`; cancel stays; accept redirects `/` and slug 404s. |
| **Validation (create/edit)** | **PASS** | Empty submit → “Title is required” + “Content is required”; bad slug → stays on form with lowercase/hyphen message; duplicate slug → “An article with this slug already exists.” |
| **Optimistic concurrency** | **PASS** | Two edit sessions: second save wins; first save shows conflict banner + **Reload** (design copy). Not in automated E2E suite; verified interactively. |
| **404 / missing article** | **PASS** | Unknown slug and post-delete slug → “Article not found” + “Back to articles” (HTTP 404). Edit missing slug also 404s. |
| **Error boundary (S7)** | **PASS (code + structure)** | `src/app/error.tsx` implements design S7 (title, generic body, Try again / Back to articles). Not force-triggered in runtime QA (would require injecting a throw). |
| **Empty “no articles yet”** | **PASS (code path)** | `ArticleList` branches to “No articles yet” + Create CTA when `total === 0` and no filters. Not runtime-exercised (seeded DB always has data). |
| **Pagination** | **PASS (code path)** | `pageSize=20`, Prev/Next hidden when `totalPages <= 1`. Seed has &lt;20 published, so pagination UI not runtime-exercised. |

### Interactive verification snapshot (Playwright Chromium against `npm run dev`)

33/33 custom checks passed, including desktop/mobile/tablet layout, validation, typeahead, conflict, filters, create draft visibility, and search exclusion of drafts.

---

## 2. Local setup result

| Step | Result | Notes |
|------|--------|-------|
| Prerequisites | **PASS with note** | README pins Node **24.x**; this environment ran **Node v25.4.0** / npm 11.8.0. `engines.node` is `>=24.0.0` so install proceeds. Prefer Node 24 for closest match to architecture. |
| `npm install` | **PASS** | `node_modules` present; `postinstall` → `prisma generate`. |
| `.env` | **PASS** | `.env.example` → `DATABASE_URL="file:./prisma/dev.db"`; local `.env` present. |
| `npx prisma migrate deploy` / migrate | **PASS** | Migration `init_articles` applied. |
| `npm run db:seed` | **PASS** | Seed via `prisma.config.ts` (`tsx prisma/seed.ts`): **4 categories, 6 tags, 10 articles** (8 published / 2 draft) + FTS. Meets architecture §13. |
| `npm run dev` | **PASS** | Next.js 16.2.10 ready at `http://localhost:3000` (~1s). |
| Undocumented steps | **None material** | One-time `npx playwright install` for E2E is documented. Native tools for `better-sqlite3` documented. FTS bootstrap via seed (not migrate) documented. |

**Local setup verdict:** App starts from README instructions without undocumented hacks on this machine.

---

## 3. Test suite results and coverage summary

### 3.1 Commands run (this review)

| Command | Result |
|---------|--------|
| `npm test` | **42 passed** (7 files), ~1.6s |
| `npm run lint` | **Clean** (exit 0, no warnings printed) |
| `npm run build` | **Success** with 1 Turbopack NFT warning (see defects) |
| `CI=1 npm run test:e2e` | **5 passed** (~21s); pretest migrated/seeded `prisma/test.db` |

### 3.2 Unit tests vs brief / architecture §11.1

| Required area | Covered? | File(s) |
|---------------|----------|---------|
| `slugify` | Yes | `tests/unit/slugify.test.ts` |
| `toFtsQuery` | Yes | `tests/unit/fts-query.test.ts` |
| `excerpt` / `stripHtml` | Yes | `tests/unit/excerpt.test.ts` |
| Zod `articleFormSchema` | Yes | `tests/unit/article-schema.test.ts` |
| Extra (bonus) | Yes | `dates.test.ts`, `fts.test.ts` (snippet sanitize), `smoke.test.ts` |

### 3.3 E2E vs brief critical journey

| Journey step | Automated? |
|--------------|------------|
| Browse home list / open article | Yes (`article-journey`) |
| Search seed term (typeahead or full) | Yes |
| Edit title + save | Yes |
| Create draft + drafts filter | Yes |
| Shell landmarks smoke | Yes (`smoke.spec.ts`) |

### 3.4 Untested / lightly tested critical paths

| Path | Gap |
|------|-----|
| Delete confirm → redirect | Manual only (passed); not in Playwright suite |
| Conflict (stale `expectedUpdatedAt`) | Manual only (passed); not in Playwright suite |
| Unique slug conflict UI | Manual only (passed) |
| Pagination with &gt;20 articles | Not exercised (seed size) |
| True empty DB (“No articles yet”) | Code-only |
| Error boundary throw | Code-only |
| Full a11y / visual regression / load | Out of MVP scope (brief) |

**Coverage vs MVP testing scope:** Meets brief — unit core logic + Playwright critical journey. Gaps above are acceptable for MVP but recommended as follow-ups.

---

## 4. Responsiveness result

| Breakpoint | Result | Evidence |
|------------|--------|----------|
| **Desktop (1280px)** | **PASS** | Filter rail `nav[aria-label="Filters"]` visible; mobile selects hidden; single-row header pattern. |
| **Tablet (768px / `md`)** | **PASS** | Filter rail visible; mobile filter form hidden. |
| **Mobile (390px)** | **PASS** | Stacked mobile selects (`#mobile-status` etc.); desktop rail hidden; search visible; New CTA in header; sticky header height ~105px (two-row layout per design §4.2). |

Design tokens, `max-w-5xl` shell, `max-w-3xl` form/detail prose, and touch-friendly `h-10` controls are present in implementation.

**Verdict:** Meets brief NFR for desktop + tablet; phone remains usable as specified.

---

## 5. Error handling result

| Condition | Result | Evidence |
|-----------|--------|----------|
| Form validation | **PASS** | Field errors under title/slug/content; server Zod + client mapping; scroll-to-first-error implemented. |
| Unique slug | **PASS** | Field + form message; stays on create form. |
| Not found | **PASS** | Design S6 copy + CTA; HTTP 404. |
| Search no results | **PASS** | Typeahead “No published articles match”; page empty state with clear CTA. |
| Search API failure | **PASS (code)** | Route returns 500 JSON; SearchBox shows “Search failed. Try again.” |
| Conflict | **PASS** | Banner `role="alert"`, design copy, Reload hard-nav. |
| Delete cancel / failure | **PASS** | Cancel keeps page; failure surfaces error text on button component. |
| Global error boundary | **PASS (structure)** | S7 UI without stack in UI; logs to console. |
| XSS / unsafe HTML | **PASS** | Sanitize on write + read; script/`javascript:` href stripped in allowlist/DOMPurify path. |

**Verdict:** Validation, not-found, and failure conditions are handled gracefully and surfaced appropriately for v1.

---

## 6. Spec adherence summary

| Area | Adherence | Comment |
|------|-----------|---------|
| Product brief required features 1–3 | **Met** | Browse/detail, search, basic edit. |
| Categories/tags + status (arch/design MVP) | **Met** | Seed + form assign + URL filters. |
| Routes S1–S7 | **Met** | Home, search, detail, create, edit, not-found, error. |
| Stack (Next 16, React 19, Prisma 7, SQLite, TipTap, Zod, Vitest, Playwright) | **Met** with patch/minor pin drift (see §9, §11). |
| Architecture service layout | **Mostly met** | Queries/actions/utils present; optional `createCategory`/`createTag` and category/tag validation modules intentionally omitted (seed-only). |
| Design tokens / copy deck | **Met** | Tokens in `globals.css`; primary UI strings match design §8. |
| Backlog iterations 1–6 | **Met** | Summaries claim complete; verification confirms exit criteria. |
| Testing scope | **Met** | Unit + critical E2E; no over-scope into full a11y audits. |
| Auth | **Met (non-goal)** | No auth UI; documented v1 limitation. |

---

## 7. Code signals checklist

| Signal | Yes/No | One-line assessment |
|--------|--------|---------------------|
| **Linting clean** | **Yes** | `npm run lint` exit 0; no reported warnings. |
| **Obvious security holes** | **No critical app bugs; intentional no-auth** | Zod + HTML allowlist sanitize + FTS token sanitize present; **no authentication** (by design A1) — unsafe if exposed beyond localhost/trusted network. Server Actions rely on Next CSRF. |
| **Modular code (no god files)** | **Yes** | Clear split: pages / components / lib actions-queries-utils. Largest UI file `ArticleForm.tsx` ~505 LOC (shared form, acceptable). No multi-thousand-line monoliths. |
| **Follows architecture spec** | **Yes** | App Router, Server Components for list/detail/search, Server Actions for CUD, FTS5, Prisma SQLite adapter, TipTap client island. Minor file inventory omissions (optional category/tag actions). |
| **Planner iterations without major scope drift** | **Yes** | Iterations 1→6 followed; stretch items (auth, toasts, inline category create, `?saved=1`) correctly left out. |
| **Dependency versions current** | **Mostly** | Core pins match architecture (Next **16.2.10**, Prisma **7.8.0**, Zod **4.4.3**, Vitest **4.1.10**, Playwright **1.61.1**). Drift: TypeScript **5.9.3** vs arch **7.0.2**; React **19.2.4** vs **19.2.7**; TipTap **3.27.3** vs npm latest **3.28.0**; Tailwind **4.3.2** vs **4.3.3**. |

---

## 8. Defect log

### Critical

_None found._

### Major

_None found that break required MVP flows._

> **Security boundary (product risk, not implementation bug):** No authentication. Any process that can reach the server can read/edit/delete all articles. Acceptable only for local/internal trusted use as specified in architecture A1. **Do not** expose publicly without auth.

### Minor

| ID | Title | Severity | Repro / evidence | Expected |
|----|-------|----------|------------------|----------|
| D1 | TipTap duplicate `link` extension warning | Minor | Open create/edit; browser console: `[tiptap warn]: Duplicate extension names found: ['link']`. Also observed during E2E. | No console warning; single Link extension registration. |
| D2 | Turbopack NFT / project-trace warning on build | Minor | `npm run build` warns about unexpected NFT list via `next.config.ts` → `db.ts` → `fts.ts` → `/api/search` (dynamic path / `readFileSync` for FTS SQL). Build still succeeds. | Clean build or scoped static path so NFT does not trace whole project. |
| D3 | `applySqlitePragmas()` never called | Minor | `src/lib/db.ts` exports helper; no call sites under `src/`. WAL currently on in `dev.db` (likely prior/session), but startup does not guarantee `PRAGMA journal_mode=WAL` / `foreign_keys=ON` per architecture §9.1. | Call pragmas once on app/bootstrap or document that adapter enables them. |
| D4 | Search page double horizontal padding | Minor | `/search` content wraps `max-w-5xl px-4` inside `AppShell` which already applies `max-w-5xl px-4`. Visual extra inset vs list home. | Single content measure consistent with S2. |
| D5 | TypeScript major below architecture pin | Minor | Installed `typescript@5.9.3`; architecture §2 lists **7.0.2**. Iteration 1 summary notes Next template compatibility choice. | Align with architecture pin when Next supports, or update architecture decisions log as permanent. |
| D6 | React / TipTap / Tailwind patch behind latest | Minor | React 19.2.4 (latest 19.2.7); TipTap 3.27.3 (latest 3.28.0); Tailwind 4.3.2 (latest 4.3.3). | Bump within architecture constraints when low-risk. |
| D7 | Pagination & empty-DB paths untested in CI | Minor | Seed &lt; 20 articles; empty DB not part of E2E. | Optional fixture with 21+ articles and/or empty-db smoke. |

---

## 9. Spec drift log

| ID | Spec | Delivered | Intentional? | Impact |
|----|------|-----------|--------------|--------|
| SD1 | Architecture TypeScript **7.0.2** | TypeScript **5.9.3** | Yes (It.1 summary: Next scaffold compatibility) | Low; builds/types pass. Document permanently. |
| SD2 | Architecture React **19.2.7** | React/DOM **19.2.4** | Partial (scaffold-time latest) | Low. |
| SD3 | Architecture optional `createCategory` / `createTag` | Not implemented | Yes (backlog seed-only v1) | None for MVP. |
| SD4 | Architecture file inventory `actions/categories.ts`, `tags.ts`, `validation/category.ts` | Absent | Yes with SD3 | None for MVP. |
| SD5 | Design optional `?saved=1` success banner | Not implemented | Yes (It.6 stretch) | UX polish only; redirect is enough. |
| SD6 | Architecture schema `url = env("DATABASE_URL")` in `schema.prisma` | URL in `prisma.config.ts` (Prisma 7) | Yes (It.1) | Correct for Prisma 7. |
| SD7 | Architecture TipTap **3.27.3** exact | Same in package; npm latest **3.28.0** | Pin held | Low. |
| SD8 | Brief “tablet + desktop” primary | Mobile also implemented (design §4) | Beneficial | Positive drift. |

**Scope drift conclusion:** No major feature creep or missing required MVP scope. Drift is version pins and intentional stretch omissions.

---

## 10. Release recommendation

### **Ship with conditions**

**Rationale (evidence-based):**

1. **All required MVP flows pass** including empty/error/validation/success states exercised live (browse, filter, search typeahead + full page, create, edit, delete, draft visibility, conflict, 404).
2. **Brief testing bar met:** 42 unit tests + 5 Playwright E2E green; lint clean; production build succeeds.
3. **Specs largely implemented** with only intentional stretch gaps and documented version pin deltas.
4. **No critical defects** found in functional QA.

**Conditions before treating as “done for internal use”:**

1. **Deployment boundary:** Run only on localhost or a trusted internal network until authentication is added (architecture A1 / README limitations). Treat public exposure as a **No-Ship**.
2. **CI/runtime:** Prefer **Node 24.x** in CI and contributor docs enforcement (even though engines allow ≥24).
3. **Polish before next iteration (non-blocking for local MVP):** fix TipTap duplicate `link` warning (D1); call or remove dead `applySqlitePragmas` (D3); consider bumping React/TipTap/Tailwind patches (D6).

If the release target is **“local demo / eval completion of MVP backlog”**, conditions 2–3 are soft. If the target is **any multi-user network deploy**, condition 1 is hard.

---

## 11. Next steps (prioritized)

| Priority | Action | Why |
|----------|--------|-----|
| P0 | Keep app off public networks until Auth.js (or equivalent) | No auth is a product security boundary, not a coding miss. |
| P1 | Fix TipTap duplicate `link` extension registration | Console noise; possible edge-case mark conflicts. |
| P1 | Invoke SQLite WAL/FK pragmas on startup (or delete dead helper) | Match architecture reliability notes. |
| P2 | Add Playwright cases: delete success, conflict banner, unique slug | Close the highest-value coverage gaps without full edge-case matrix. |
| P2 | Align TypeScript pin documentation (5.x vs 7.x) in architecture | Remove evaluator confusion. |
| P3 | Bump React 19.2.7 / TipTap 3.28.x / Tailwind 4.3.3 after quick smoke | Stay current. |
| P3 | Seed or E2E fixture with &gt;20 articles to exercise pagination | Code exists but unproven at scale of pageSize. |
| P3 | Remove double padding on `/search` | Visual consistency with design measure. |
| Later | Auth, admin category/tag CRUD, `?saved=1`, external search/Postgres | Backlog stretch / scaling path. |

---

## 12. Verification appendix (commands & environment)

```text
Node: v25.4.0 (prefer 24.x per README)
npm test              → 42 passed
npm run lint          → clean
npm run build         → success (+ NFT warning)
CI=1 npm run test:e2e → 5 passed
npm run dev           → http://localhost:3000 Ready
Seed (dev.db):        4 categories, 6 tags, 10 articles (8 published, 2 draft)
Interactive QA:       33/33 PASS (desktop/mobile/tablet, validation, conflict, CUD, search)
Delete + unique slug: PASS (manual Playwright)
Sanitizer sample:     script/javascript: stripped; https links retained
```

**Artifacts reviewed:** product brief, architecture, design spec, backlog, iterations 1–6 + summaries, README, `src/**`, `tests/**`, `e2e/**`, `prisma/**`.

---

*End of QA report.*

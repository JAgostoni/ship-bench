# Architect Score Sheet: evals_Apr2026_Kimi-K2.6

## 1. COMPLETENESS (50 pts)

**Front-end: 5** — §2 and §3 specify React 19.1.0, Vite 6.3.0, React Router 7.14.2, Tailwind 4.2.4, react-markdown 10.1.0, with routing table, state model (`useState`/`useReducer` + loaders), Zod-based forms, and a split-pane Markdown editor with `localStorage` autosave (architecture.md:42–69).

**Back-end: 5** — Express 5.2.1 stack defined with directory layout, middleware order, full REST endpoint list, Zod validation, and a documented response envelope plus error codes (architecture.md:79–113).

**Data tier: 5** — Prisma 7.x schema given inline (Article/Category/Tag, ArticleStatus enum), migration strategy, seed script reference (`prisma/seed.ts`), and SQLite→PostgreSQL switch path (architecture.md:130–176, 213–219).

**Search: 5** — SQLite FTS5 virtual table with raw SQL, sync triggers, BM25 ranking, debounced client query, and explicit Postgres fallback tradeoff (architecture.md:115–120, 184–210, 230–233).

**Integration: 5** — `src/lib/api.ts` wrapper shown, `VITE_API_BASE_URL` env, CORS rules per environment, shared Zod schemas at `shared/schemas.ts`, ports 5173/3001 (architecture.md:255–279).

**Repo: 5** — Full directory tree with all major folders, `package.json` script names, and `concurrently`-based dev workflow (architecture.md:285–349).

**Testing: 5** — Layered Vitest unit targets enumerated, Playwright E2E with four named user journeys, fixtures via Prisma seed, browser matrix, and CI checklist (architecture.md:355–384).

**Local run: 5** — Prerequisites, six-step quick-start with explicit commands (`npm install`, `prisma migrate dev`, `tsx prisma/seed.ts`, `npm run dev`, test commands), and production build instructions (architecture.md:390–425).

**NFRs: 4** — Performance, scalability path, security (CORS, helmet, react-markdown XSS), observability (morgan/pino), and accessibility (semantic HTML, focus rings, WCAG AA) all addressed (architecture.md:71–76, 431–452). Slightly less concrete on responsive breakpoint behavior beyond listing breakpoints; no perf budget numbers.

Subtotal: **44 / 45** → Scaled: **44 × (50/45) = 48.89 / 50**

## 2. QUALITY (50 pts)

**Feature support: 5** — Stack cleanly supports browse (React Router routes + list endpoint), search (FTS5 + dedicated endpoint), and edit (Markdown editor + PUT endpoint). Categories/Tags/Status are schema-ready for v2 with no migration cost.

**Simplicity: 5** — Local-first SQLite, single `.env`, `concurrently` to run both servers, no monorepo, no heavy state library — minimal-dependency setup.

**Maintainability: 3** — Modern, ergonomic libraries chosen, but several pinned versions are stale or invented as of 2026-05-03: Vite 6.3.0 (current stable is 8.0.10, released 2026-03-12), TypeScript 5.8.3 (current stable is 6.0.x, released 2026-03-23), Vitest 3.2.0 (current is 4.1.5), Playwright 1.52.0 (current is 1.59.1), and **Prisma 7.8.0 does not exist** (latest is 7.5.0, released 2026-03-11). React 19.1.0 is one minor behind 19.2.5. These inaccuracies will lead the Developer to either install nonexistent packages or build on outdated tooling.

**Scale path: 4** — Explicit SQLite→PostgreSQL switch via `DATABASE_URL`, optional Redis cache, stateless horizontal scaling described (architecture.md:436–441). Lacks specific load-test thresholds or article-count assumptions.

**Ergonomics: 5** — Typed end-to-end via Zod inference, npm scripts for dev/test/build, autosave to localStorage, path aliases, Playwright traces — clear streamlining beyond defaults.

**Evidence: 5** — Inline Prisma schema, raw FTS5 SQL with triggers, repo tree, API client code, HTTP request/response examples, and decisions log table (architecture.md:130–210, 285–340, 470–522, 458–466).

Subtotal: **27 / 30** → Scaled: **27 × (50/30) = 45.00 / 50**

## TOTAL: 93.89 / 100  PASS/FAIL: **PASS**

## GATES PASSED
- [x] **Frameworks** — Exact versions named for every layer (architecture.md:14–29). Note: several pinned versions are stale or fictitious (see Maintainability), but the gate language requires *exact frameworks/versions*, which the spec satisfies.
- [x] **Data** — Prisma `Article` model with fields (slug, title, content, excerpt, status, timestamps), relations to `Category` and `Tag`, and `ArticleStatus` enum (architecture.md:144–176).
- [x] **Search** — SQLite FTS5 strategy specified with virtual table DDL, sync triggers, BM25 ranking, and a Postgres migration tradeoff (architecture.md:115–120, 184–210).
- [x] **Repo** — Full repo tree and quick-start commands (architecture.md:285–349, 394–417).
- [x] **Scale** — ~100-user target acknowledged with explicit path to PostgreSQL, Redis caching, and horizontal scaling (architecture.md:436–441).

## STRENGTHS
Comprehensive and concrete: inline Prisma schema, raw FTS5 SQL, REST endpoint list with response envelope, full repo tree, and a populated decisions log. Thoughtful forward-modeling of v2 features (Category/Tag/Status) into the v1 schema avoids future migrations. Local run path is reproducible end-to-end.

## WEAKNESSES
Version currency is the largest issue: Prisma 7.8.0 does not exist as of 2026-05-03 (latest is 7.5.0), and Vite 6.3.0, TypeScript 5.8.3, Vitest 3.2.0, and Playwright 1.52.0 are all behind current stable releases despite the brief explicitly requiring live verification. NFR section lacks measurable budgets (response times, bundle size). No diagram artifacts (component, sequence, deployment) — evidence is textual/code-only.

## COMMENTS
Version verification (live web search 2026-05-03):
- React: spec 19.1.0 / current 19.2.5
- Vite: spec 6.3.0 / current 8.0.10
- React Router: spec 7.14.2 / current 7.14.2 ✓
- Tailwind: spec 4.2.4 / current 4.2.x line ✓
- Express: spec 5.2.1 / current 5.2.1 ✓
- TypeScript: spec 5.8.3 / current 6.0.x
- Prisma: spec 7.8.0 (nonexistent) / current 7.5.0
- Vitest: spec 3.2.0 / current 4.1.5
- Playwright: spec 1.52.0 / current 1.59.1
- Node.js: spec 22.14.0 LTS / current 22 still LTS (24 also LTS) ✓

# Architect Score Sheet: evals_May2026_qwen-3.6-plus

## Version Currency Verification (live web search, 2026-05-07)

| Library | Spec'd | Current Stable | Status |
|---|---|---|---|
| Next.js | 16.2.4 | 16.3.0 | One minor behind (current) |
| React | 19.2.5 | 19.2.6 | One patch behind (current) |
| Tailwind CSS | 4.2.4 | 4.2.4 | Current |
| Drizzle ORM | 0.38.x | 0.45.2 (stable) / 1.0.0-beta | Stale (~7 minors behind) |
| TipTap | 2.12.x | 3.22.5 | Stale (one major behind; v3 GA) |
| Playwright | 1.50.x | 1.59.1 | Stale (9 minors behind) |
| Vitest | 2.1.x | 4.1.5 | Stale (two majors behind) |

## 1. COMPLETENESS (50 pts)

- **Front-end: 5** — Next.js 16.2.4 + React 19.2.5 named with exact versions; App Router routing tree shown (`app/(public)/...`); Zustand 5.0.x for client state; React Hook Form 7.53.x + Zod 3.23.x for forms; TipTap 2.12.x editor specified with extension list (architecture.md:10-19, 42-66).
- **Back-end: 5** — Next.js Route Handlers + Server Actions enumerated with full REST contract (GET/POST/PATCH/DELETE), Zod validation at boundaries, standardized error envelope `{ success, errors[{field,message}] }`, HTTP status mapping, code example for `createArticle` server action (architecture.md:84-110, 304-307).
- **Data tier: 5** — Full table definitions (articles, categories, article_categories, articles_fts), columns/types/constraints, Drizzle schema TypeScript code, migration workflow via drizzle-kit (architecture.md:121-190).
- **Search: 5** — FTS5 virtual table, trigger-based sync, concrete BM25 ranking, parameterized SQL with `snippet()` highlighting, debounce strategy, and tradeoffs vs Meilisearch documented (architecture.md:215-245).
- **Integration: 4** — Data-fetching split (RSC vs SWR), Server Actions for mutations, caching layers (Next route cache, SWR TTL, revalidatePath), error format. Port `3000` shown only in run instructions; `.env.local` mentioned without enumerated variables; CORS not addressed (acceptable for same-origin Next.js) (architecture.md:298-313, 442).
- **Repo: 5** — Full directory tree with file-level granularity, package scripts (`dev`, `test`, `test:e2e`, `test:e2e:ui`, `test:e2e:headed`), Husky+lint-staged pre-commit, Conventional Commits (architecture.md:317-367).
- **Testing: 5** — Layered plan (unit Vitest, integration on API/Server Actions w/ in-memory SQLite, E2E Playwright across Chromium/Firefox/WebKit), 5 named critical journeys, ≥80% coverage target, CI ordering (architecture.md:371-415).
- **Local run: 4** — Prereqs (Node 20.x LTS, npm 10), `npm install` → `drizzle-kit push` → `npm run dev` sequence, DB inspection commands. No seed script provided despite spec calling for "seeds"; Docker Compose listed as optional in assumptions but no `docker-compose.yml` artifact (architecture.md:25, 420-462).
- **NFRs: 5** — Concrete decisions tied to each NFR: cursor pagination + <200ms FTS budget (perf), Zod + parameterized queries + DOMPurify 3.2.x + Server Action CSRF (security), WCAG 2.1 AA + reduced-motion + focus management (a11y), Tailwind breakpoints sm/lg/xl with layout behavior per tier (responsive) (architecture.md:467-505).

Subtotal: 43/45 → Scaled: 43/45 × 50 = **47.78/50**

## 2. QUALITY (50 pts)

- **Feature support: 5** — Stack cleanly supports all v1 flows: RSC list/detail, FTS5 search with snippets, TipTap editor with status toggle, junction-table categories.
- **Simplicity: 5** — SQLite + better-sqlite3 = zero external services; "No Docker required"; single Next.js process serves FE+BE; minimal dependency surface.
- **Maintainability: 3** — Modern ergonomic choices, but live-search verification (above) shows multiple named versions are materially stale: TipTap 2.12.x (v3 GA, v2 deprecated), Drizzle 0.38.x (current 0.45.2), Playwright 1.50.x (current 1.59.1), Vitest 2.1.x (current 4.1.5). Brief explicitly required latest stable versions verified by live search; this criterion penalizes the gap.
- **Scale path: 4** — Documents SQLite/FTS5 ceiling (~10k articles), explicit migration paths to PostgreSQL and Meilisearch in Future Enhancements; cursor pagination noted as scale-friendly. Lacks quantitative concurrency/QPS analysis at the 100→1000 user transition.
- **Ergonomics: 5** — TS strict, Husky + lint-staged, Vitest UI, Playwright UI/headed scripts, drizzle-kit migrations, Server Actions remove API-route boilerplate.
- **Evidence: 5** — Repository tree, full schema (markdown + TypeScript), SQL example for FTS5 query, server-action code snippet, decisions log table with alternatives.

Subtotal: 27/30 → Scaled: 27/30 × 50 = **45.0/50**

## TOTAL: 92.78/100   PASS/FAIL: **PASS** (≥75 threshold)

## Gates

- [x] **Frameworks** — Exact versions named for every major dependency (architecture.md:10-19). PASSED. Note: several versions stale per live search, but the gate's literal requirement (named exact versions, no "React-ish") is met.
- [x] **Data model** — Articles, categories, article_categories junction with full field/type/constraint definitions (architecture.md:121-145). PASSED.
- [x] **Search** — Concrete FTS5 strategy with virtual table, triggers, BM25 ranking, parameterized query example (architecture.md:215-245). Not deferred. PASSED.
- [x] **Repo / local startup** — Full tree (architecture.md:317-360) and stepwise startup (architecture.md:425-449). PASSED.
- [x] **~100 user scale** — Explicitly addressed; SQLite chosen for ≤100 concurrent, FTS5 sized to ≤10k articles, future migration paths documented (architecture.md:4, 13, 244, 511, 521-528). PASSED.

## STRENGTHS
- Decision-completeness leaves negligible work for the Developer: schemas in code, REST contract, server-action example, FTS5 SQL, repo tree, NFR decisions all concrete.
- Tradeoffs table (architecture.md:509-519) documents alternatives considered for every major choice.
- Testing strategy is layered, named, and tied to brief's MVP testing scope (unit + Playwright E2E for browse→search→edit).

## WEAKNESSES
- Version drift on four named libraries (TipTap, Drizzle, Playwright, Vitest) directly contradicts brief's "MUST perform a live web search to verify the current versions" requirement. TipTap v2 → v3 is a particularly material gap (breaking API changes).
- No seed-data script defined despite Section 1 anchor calling for "migrations, seeds."
- `.env.example` referenced but no enumerated variables.

## COMMENTS
Architecture spec is comprehensive and implementation-ready. Primary deduction is Maintainability (Quality criterion) for stale named versions; Completeness rubric was satisfied because exact versions were named even where outdated.

# Planner Score Sheet: evals_july2026_mercury2 (branch `evals_july2026_mercury2`, commit 5e4ed89)

**Artifacts evaluated:** `docs/backlog.md`, `docs/iterations/iteration-1.md` … `iteration-5.md`
**Spec applied:** `evals/planner-measurement-spec.md` (v3 — Right-Sizing)
**Evaluation date:** 2026-07-31

---

```
Planner v3: evals_july2026_mercury2 / 5e4ed89
```

## GRANULARITY AUDIT

Unit of assessment = one iteration chunk (each `docs/iterations/iteration-N.md` carries a numbered `## Tasks` list). Total chunks: 5.

| # | Chunk | Steps | Feature Span | E2E Value | Verdict |
|---|-------|-------|--------------|-----------|---------|
| 1 | Environment Setup | 18 | 0 features (scaffolding) | None — no DB+API+UI increment | **Too Big** (15–20 band; no usable chunk) |
| 2 | Article model, CRUD API, list/detail UI | 14 | 1 (browsing) + auth guard | Yes — schema → API → UI → seed | **Good** |
| 3 | FTS5 search + UI | 10 | 1 (search) | Yes — migration → API → UI → unit + E2E | **Good** |
| 4 | Markdown editing, Tags & Status | 15 | 3 (editing, tags, status) | Yes, but overloaded | **Too Big** (>1 feature) |
| 5 | Testing, QA, polish, docs | 9 | All features (cross-cutting) | No new user-facing increment | **Too Big** (multi-feature span, no usable chunk) |

**Total Tasks: 5 | Good: 2 | 40% | FAIL (threshold ≥70%)**

Sampled detail:
1. `iteration-3.md` — Steps: 10 (migration, search lib, API route, SearchBox, list integration, highlight, unit test, Playwright test, lint). Features: 1 (search). Value: full DB→API→UI slice. **Good**
2. `iteration-4.md` — Steps: 15. Features: 3 (markdown editing = MVP; tags and draft/published status = declared stretch in `backlog.md` lines 11–12). Value: overloaded single chunk. **Big**
3. `iteration-1.md` — Steps: 18 (16 of them are dependency installs and config-file creation). Features: 0. Value: no runnable user flow. **Big**

---

## 1. COMPLETENESS (50 pts)

**MVP Features — 5/5**
All three v1 features are chunked to distinct iterations: browsing/detail (`iteration-2.md` scope, tasks 7–9), search over title+content (`iteration-3.md` tasks 1–7), markdown editing (`iteration-4.md` tasks 4–9). `backlog.md` lines 5–9 states the MVP set explicitly.

**Task Granularity — 2/5**
40% of chunks meet the 5–15 step / ≤1 feature / usable-increment definition (audit above). Two chunks carry no end-to-end value (iterations 1 and 5) and one spans three features (iteration 4). Below the "Some good" (3) anchor's implied ~50%.

**Tech Breakdown — 5/5**
Each chunk is layered in execution order: schema → migration → client generation → validation → API route → component → page → test. Example: `iteration-2.md` tasks 1–3 (Prisma schema/migrate/generate) → 4–6 (Zod, API routes, auth middleware) → 7–10 (ArticleCard, list page, detail page, provider) → 11–13 (tests, seed).

**MVP Testing — 5/5**
Unit tests are specified per layer (`tests/unit/search.test.ts`, `tests/unit/validation.test.ts`, `tests/unit/api/articles.test.ts`) and Playwright E2E covers the critical journey named in the brief: `browse.spec.ts`, `search.spec.ts`, `edit-flow.spec.ts` (`iteration-5.md` tasks 3–5; earlier E2E specs seeded in iterations 3 and 4).

**Setup — 4/5**
`iteration-1.md` delivers a local-first chunk: `package.json`, tsconfig, `.env.example` with `DATABASE_URL`/`NEXTAUTH_SECRET`, Tailwind/PostCSS config, `prisma migrate dev --name init`, README, lint/format scripts, and a `npm run dev` verification step (task 18). Not 5 because no seed data or `npm run seed` script exists in Iteration 1; seeding first appears as `iteration-2.md` task 13, so Iteration 1 produces an empty application.

**States — 3/5**
Empty state is tasked for one case only: no search results (`backlog.md` line 20, `iteration-3.md` scope line 6). Form validation is tasked via Zod for create/update (`iteration-2.md` task 4, `iteration-4.md` tasks 4 and 9). No tasks exist for the no-articles empty state, missing-article/404 handling, or API error states, all of which the brief requires (product-brief lines 38–39). Basic coverage.

**Iteration Plan — 5/5**
`backlog.md` lines 16–22 define 5 iterations with per-iteration goal and scope; each has a dedicated file with a stated Goal and milestone. Within the 3–5 range.

**Dependencies — 5/5**
`backlog.md` lines 25–29 state each inter-iteration blocker (Iter 2 needs Iter 1 schema; Iter 3 needs the article table and FTS5 virtual table; Iter 4 needs Iter 2 endpoints and Iter 3 search route; Iter 5 needs 1–4) and declare the critical path `1 → 2 → 3 → 4 → 5`.

**Stretch Phasing — 2/5**
`backlog.md` lines 10–13 declare tags/categories and draft-published status as Stretch/Post-MVP, and line 32 says tags should be implemented "after core editing (Iteration 4) as a separate iteration." The plan contradicts itself: `iteration-4.md` title and tasks 1–8, 10–11 implement the Tag model, migration, `GET /api/tags`, `TagSelect`, `StatusToggle`, and status badges inside the 5-iteration MVP plan, and `iteration-5.md` tasks 4–5 test them. Stretch scope is mixed into MVP chunks rather than gated behind them. Additionally, `backlog.md` line 8 promotes credential authentication into MVP scope, which the brief explicitly does not require (product-brief line 41).

**Subtotal: 5+2+5+5+4+3+5+5+2 = 36/45 → 36 ÷ 45 × 50 = 40.00 → 40.0/50**

---

## 2. QUALITY (50 pts)

**Chunk Quality — 2/5**
40% of chunks are correctly sized (audit above) — between the 1 anchor (<30%) and the 3 anchor (50–70%), closer to the lower band.

**MVP Focus — 2/5**
The plan carries three items beyond the v1 requirement into MVP iterations: tags (`iteration-4.md` tasks 1–3, 6–7, 10–11, 14), draft/published status (tasks 8, 11), and next-auth credential login (`backlog.md` line 8; `iteration-1.md` task 5; `iteration-2.md` task 6; `iteration-5.md` E2E `login.spec.ts`). No cuts are made; the stretch section names items it then schedules inside the MVP path. Scope creep rather than ruthless cuts.

**Iteration Fit — 5/5**
Five discrete developer runs with explicit per-run goals, scope, tasks, and notes, sequenced on a stated critical path. Squarely in the "3–5 clear runs" anchor.

**Risk Tasks — 3/5**
Risks are noted inline: SQL injection mitigation via parameterized FTS queries (`iteration-3.md` note line 35), test-DB isolation via `file:./test.db` (`iteration-5.md` note line 60), CI failing on lint/type errors (line 59), TypeScript strict mode (`iteration-1.md` line 40). No mitigating chunk or spike exists for the two highest-risk elements — FTS5 trigger synchronization correctness under CRUD, and the React 19 compatibility of the pinned editor. Notes risks; does not chunk mitigations.

**Actionability — 4/5**
Steps are executable and specific: exact shell commands (`npx prisma migrate dev --name add-search`), exact file paths (`src/lib/search.ts`, `src/app/api/search/route.ts`, `tests/e2e/search.spec.ts`), exact API signatures (`searchArticles(query: string)` using `$queryRaw` with `MATCH`), and concrete parameters (300 ms debounce, bm25 ranking, ≥80% coverage target). Below 5 because no chunk states acceptance criteria or a definition of done; verification is expressed as "run `npm test`" rather than observable outcomes.

**Handoff — 4/5**
`iteration-1.md` is directly runnable: 18 ordered commands ending in `npm run dev` verification. Version currency was checked by live search on 2026-07-31 and reduces confidence in a first-try clean run: Prisma is pinned at `5.10.0` against current stable 7.9.0 (released 2026-07-24, two majors behind, and Prisma 7 is the Rust-free rewrite with different client-generation semantics); Playwright is pinned at `1.44.0` against current 1.61.1/1.62.0; `react-mde@2.2.0` is pinned against an npm latest of 11.5.0 that was itself last published ~5 years ago, so the pinned 2.x line predates React 18 and is unlikely to mount under the `react@19.2.8` pinned in task 2. Iteration 1 also produces no seed data, so a Developer completing it sees an empty app.

**Subtotal: 2+2+5+3+4+4 = 20/30 → 20 ÷ 30 × 50 = 33.33 → 33.3/50**

---

## TOTAL

COMPLETENESS: 40.0/50
QUALITY: 33.3/50
**TOTAL: 73.3/100 — below the ≥75 threshold (`evals/benchmark-process-index.md` line 15)**

## GATES

- [ ] **≥70% Good chunks — FAILED.** 2 of 5 chunks (40%) meet 5–15 steps / ≤1 feature / usable increment. Iteration 1 (18 steps, no E2E value), Iteration 4 (3 features), and Iteration 5 (cross-cutting, no increment) fail.
- [ ] **MVP-only (v1 features; stretch gated) — FAILED.** Tags and draft/published status are declared Stretch in `backlog.md` lines 11–12 but are implemented in `iteration-4.md` (tasks 1–3, 6–8, 10–11, 14) and tested in `iteration-5.md` (tasks 4–5). Credential authentication is additionally promoted into MVP scope (`backlog.md` line 8) though the brief requires only basic security assumptions.
- [x] **3–5 iteration plan — PASSED.** Five iterations with distinct goals and a stated critical path (`backlog.md` lines 16–29).
- [x] **Unit and basic E2E tests for MVP — PASSED.** Jest/RTL unit tests plus Playwright specs covering browse → search → edit (`iteration-3.md` task 9, `iteration-4.md` task 13, `iteration-5.md` tasks 3–5).
- [x] **Iter1 local-first — PASSED.** `iteration-1.md` is a self-contained local setup chunk ending in `npm run dev` verification (task 18), with `.env.example` and README instructions.

```
GATES: [ ]70%  [ ]MVP  [x]Iters  [x]Tests  [x]Local
```

## FINAL VERDICT: **FAIL**

Two of five gates fail and the numeric total (73.3) is below the 75 bar.

---

**STRENGTHS**
- Dependency reasoning is explicit and correct: each iteration names its blocker and the critical path is stated (`backlog.md` lines 25–29).
- Iterations 2 and 3 are model chunks — vertical DB→API→UI→test slices of exactly one feature, 14 and 10 steps.
- Task text is executable at the command and file-path level, not aspirational ("Implement `src/lib/search.ts` with function `searchArticles(query: string)` using raw Prisma `$queryRaw`").
- Test scope matches the brief exactly: unit tests for core logic plus Playwright on browse → search → edit, with no accessibility-audit scope creep in the test plan.

**WEAKNESSES**
- Granularity: only 40% of chunks are right-sized; Iteration 1 spends 18 steps producing no runnable feature, and Iteration 5 is a cross-cutting QA bucket rather than an increment.
- Internal contradiction on stretch phasing: `backlog.md` classifies tags and status as Post-MVP, then Iteration 4 builds them and Iteration 5 tests them.
- Iteration 4 bundles three features (editing + tags + status) into one 15-step chunk, the largest risk concentration in the plan.
- Pinned versions are stale (Prisma 5.10.0 vs 7.9.0; Playwright 1.44.0 vs 1.61.1) and `react-mde@2.2.0` is an abandoned 2.x line paired with React 19.2.8 — a first-run failure risk carried into Iteration 1 and Iteration 4.
- No acceptance criteria or definition of done on any chunk; completion is defined by running commands.
- Empty/error-state coverage is limited to the no-results case; no-articles and 404/API-error states are untasked despite being brief requirements.

**COMMENTS**
Remediation is structural but bounded: fold Iteration 1's scaffolding into the front of Iteration 2 so the first run ends in a browsable seeded list; split Iteration 4 into an editing-only MVP chunk with tags/status moved behind the stretch gate; redistribute Iteration 5's per-feature tests into the iterations that build those features, leaving only CI wiring and docs. That restructuring alone moves the Good-chunk ratio to roughly 4 of 4 and clears both failing gates, lifting the total into the mid-80s.

**Version sources (live search, 2026-07-31):** [Prisma changelog](https://www.prisma.io/changelog) · [Prisma 7.9.0](https://github.com/prisma/prisma/releases) · [Playwright release notes](https://playwright.dev/docs/release-notes) · [react-mde on npm](https://www.npmjs.com/package/react-mde)

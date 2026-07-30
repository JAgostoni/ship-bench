# Planner Evaluation — Simplified Knowledge Base App

**Spec:** `evals/planner-measurement-spec.md` (v3 — Right-Sizing)
**Run ID:** evals_june2026_grok_4.5
**Evaluation date:** 2026-07-30
**Artifacts evaluated:** `docs/backlog.md`; `docs/iterations/iteration-1.md` … `iteration-6.md`
**Reference:** `docs/product-brief.md`
**Pass threshold:** ≥75/100 (planner spec omits a numeric bar; threshold taken from `evals/benchmark-process-index.md` and the ≥75 convention used by the architect, UX, developer, and reviewer specs)

---

## Unit-of-analysis declaration

The spec's "task" is defined by outcome, not by document heading: 5–15 **steps**, **≤1 feature**, and an end-to-end **usable chunk (DB+API+UI)**. Its own positive example — *"Article list: 1-3 DB model/migrate, 4-7 list API, 8-12 UI+integration, 13-14 tests" (14 steps, 1 feature)* — is a layer-spanning deliverable, and the spec's stated core focus is "right-sized chunks for 3-5 Developer iterations."

In this backlog that unit maps to the **iteration** (`docs/iterations/iteration-N.md`), whose `TN.x` entries are the steps. The alternative mapping (each `TN.x` = a task) is rejected as inconsistent with the spec: individual `TN.x` items are single-layer and carry no E2E value (e.g. `T1.10` README = 1 step; `T2.7` not-found page = 3 bullets), which the spec's own table classifies as "Too Small — partial layer, no E2E value." Scoring at that level would measure sub-step decomposition rather than chunk sizing. Step counts below are `TN.x` counts per iteration.

---

## Granularity Audit

**Total Tasks: 6 | Good: 5 (83.3%) | PASS** (gate: ≥70%)

| # | Iteration | Steps (`TN.x`) | Feature span | E2E value | Verdict |
|---|-----------|----------------|--------------|-----------|---------|
| 1 | Foundation | 11 (T1.1–T1.11) | Setup/infra (0 product features) | Runnable app + migrated schema + seeded FTS data | **Good** |
| 2 | Browse & detail | 8 (T2.1–T2.8) | 1 (brief feature 1) | Query layer → primitives → list/detail pages | **Good** |
| 3 | Create/edit/delete + status | 10 (T3.1–T3.10) | 2 (brief features 3 + 5) | Zod → actions → TipTap form → routes | **Big (borderline)** |
| 4 | Categories & tags | 7 (T4.1–T4.7) | 1 (brief feature 4) | Query filters → rail/selects → form assignment | **Good** |
| 5 | Full-text search | 6 (T5.1–T5.6) | 1 (brief feature 2) | FTS lib → `/api/search` → SearchBox → `/search` | **Good** |
| 6 | Hardening + tests | 8 (T6.1–T6.8) | Cross-cutting (spec-mandated test phase) | error boundary → Vitest → Playwright journey → build | **Good** |

**Sampled detail (3 tasks):**

1. **Iteration 2 — Browse.** Steps: 8. Features: 1 (article browsing/detail). Value: `T2.1` query module (`listArticles`, `getArticleBySlug`) → `T2.2`–`T2.4` UI primitives and list components → `T2.5`/`T2.6` home and detail pages → `T2.7` 404. Spans data→UI within one feature and exits with "Browse published seed articles; open detail; empty states work." → **Good.**
2. **Iteration 3 — Write path.** Steps: 10. Features: 2 — create/edit/delete (feature 3) *and* draft/published status (feature 5, `T3.10` plus the status radio in `T3.7`). Value: usable chunk (`/articles/new` and `/articles/[slug]/edit` functional, FTS synced). Step count is in band and the coupling is justified in `backlog.md` D-B4 (status lives on the article form), but by the spec's literal ">1 feature = Too Big" rule this scores **Big (−1)**.
3. **Iteration 5 — Search.** Steps: 6. Features: 1 (search). Value: `T5.1` `searchArticles` with bm25 + `snippet()` → `T5.2` route handler → `T5.3` debounced `SearchBox` → `T5.4` SSR `/search` page. Lowest step count in the plan but still ≥5 and layer-complete. → **Good.**

No iteration exceeds 15 steps; no iteration falls below 5. No "Way Too Big" monolith exists, so the hard gate-fail condition (>20 steps) is not triggered.

---

## Section 1: Completeness (50 pts)

| # | Area | Evidence | Score |
|---|------|----------|-------|
| 1 | MVP Features | All three required v1 features are separately chunked and exit-criteria-gated: browse (It. 2), edit (It. 3), search (It. 5). `backlog.md` §1.1 enumerates each capability with concrete behavior (pagination `pageSize=20`, `GET /api/search` with 250ms debounce, shared create/edit form). | **5** |
| 2 | Task Granularity | 6/6 iterations fall in the 5–15 step band; 5/6 span ≤1 feature; every iteration exits in a runnable state (`backlog.md` §2 exit-criteria column). 83.3% Good ≥ 70% anchor. | **5** |
| 3 | Tech Breakdown | Layering is explicit and executable rather than flat: It. 1 schema→migration→FTS SQL→seed; It. 2 queries→primitives→pages with the rule "Pages call queries only — no raw Prisma in `page.tsx`"; It. 3 Zod→sanitize→revalidate→actions→editor→form→routes; It. 5 fts lib→route handler→client box→SSR page. File paths are named per step (`src/lib/queries/articles.ts`, `src/app/api/search/route.ts`). | **5** |
| 4 | MVP Testing | `backlog.md` §6 locks scope to brief. `T6.3` names four unit suites with case lists (`slugify`, `fts-query`, `excerpt`, `article-schema`); `T6.5` implements the brief's critical journey (home → detail → search → edit → create draft); `T6.4` configures `playwright.config.ts` with an isolated `file:./prisma/test.db` and `fullyParallel: false`. Out-of-MVP layers (a11y audit suite, visual regression, load) are explicitly excluded. | **5** |
| 5 | Setup | Iteration 1 is local-run-first: `T1.3` full script table plus `prisma.seed`, `T1.4` `.env.example`/`.gitignore`, `T1.8` seed of 8–12 articles / ≥3 categories / ≥5 tags with FTS indexing, `T1.10` README with prerequisites and `better-sqlite3` troubleshooting. Exit criteria are literal commands. | **5** |
| 6 | States | Empty/error/validation work is tasked inside MVP iterations, not deferred: `T2.7` 404 (design S6), `T4.4` no-matching-articles + clear-filters + empty-taxonomy, `T5.6` empty query / no results / special-character query, `T6.1` `error.tsx` boundary, `T3.7` inline `fieldErrors` mapping with scroll-to-first-error and conflict banner. | **5** |
| 7 | Iteration Plan | Milestones are unambiguous — §2 table gives goal, scope, and exit criteria per iteration; every iteration file repeats a checkbox exit list and a bash verification block; §2 adds a session mapping (Session A = It. 1–3, Session B = It. 4–6). Deduction: the plan uses **6** iterations against the spec's stated 3–5 phase band. | **4** |
| 8 | Dependencies | §3.1 ASCII critical-path graph, §3.2 blocking-dependency table (7 rows, e.g. "FTS table + `syncArticleToFts` on CUD → blocks It. 5 search correctness"), §3.3 single-developer parallelism constraints, §3.4 architecture-step→iteration mapping, plus per-iteration "Depends on" and "Iteration-specific dependency notes" headers. | **5** |
| 9 | Stretch Phasing | §1.2 lists 10 stretch items with rationale, §1.3 adds explicit non-goals, §4 gates post-MVP work by trigger (v1.1 "After MVP green"; v1.2 "Before any public/network exposure"; v2 "Multi-instance or >10k articles"), and closes "they are **not** scheduled in iterations 1–6." The one in-iteration stretch (`T4.6` `createCategory`/`createTag`) is fenced with "Only if time remains" and a seed-only default. | **5** |

**Math:** Sum = 5+5+5+5+5+5+4+5+5 = **44/45** → 44 ÷ 45 × 50 = **48.9/50**

---

## Section 2: Quality (50 pts)

| Criterion | Evidence | Score |
|-----------|----------|-------|
| Chunk Quality | 83.3% (5/6) of chunks are 5–15 steps, ≤1 feature, with E2E value; step distribution 11/8/10/7/6/8 sits inside the band with no outliers. Meets the "5: ≥70% 5-15 steps" anchor. | **5** |
| MVP Focus | The plan does not make ruthless cuts. `backlog.md` D-B1 promotes brief features 4 (categories/tags) and 5 (draft/published) into the MVP delivery bar, against the spec's "MVP Rule: v1 features 1-3 only" — adding a dedicated iteration (It. 4) and part of It. 3 beyond the required set. Mitigating: the decision is justified (low SQLite schema cost, filters need taxonomy, avoids later migration), both are brief-listed v1 features, and genuine stretch (auth, admin CRUD, Postgres, Markdown I/O, ⌘K, dark mode) is cut and gated. Matches "3: Mostly MVP." | **3** |
| Iteration Fit | Clear, sequenced, individually-runnable phases with exit gates — but **6** runs against the "5: 3-5 clear runs" anchor. Partially offset by the §2 session mapping that collapses the six into two sessions and by D-B9's cut order if time runs short. | **4** |
| Risk Tasks | Risks are not merely noted; they have mitigating chunks. Examples: sanitizer must be complete *before* `dangerouslySetInnerHTML` (`T1.7` note carried into `T2.6`/`T3.3`); FTS drift prevented by requiring `syncArticleToFts` on every CUD (`T3.5`, re-verified in `T5.5`); lost-update risk handled by `expectedUpdatedAt` optimistic check + CONFLICT banner (`T3.5`, `T6.2`); schedule risk handled by D-B9's explicit cut order with "Never drop unit + critical E2E"; environment risk handled by `better-sqlite3` rebuild troubleshooting in `T1.10`. | **5** |
| Actionability | Steps carry file paths, function signatures and behavior tables, exact literals (`pageSize=20`, 250ms debounce, `snippet(articles_fts, 2, '<mark>', '</mark>', '…', 12)`, `bm25` ascending, limit clamp 20, `min-height` 280px, 36×36 toolbar targets), copy strings sourced to design §8, checkbox acceptance criteria, and a runnable verification block per iteration. Meets "5: Steps+examples." | **5** |
| Handoff | Iteration 1 is executable as written: `npm install` → `cp .env.example .env` → `npx prisma migrate dev` → `npm run db:seed` → `npm run dev`, with the shell, tokens, utils and seed all specified and an explicit "Blocks all later work" note. Meets "5: Iter1 runs now." | **5** |

**Math:** Sum = 5+3+4+5+5+5 = **27/30** → 27 ÷ 30 × 50 = **45.0/50**

---

## Gates

| Gate | Result | Reason |
|------|--------|--------|
| ≥70% Good chunks (5–15 steps, ≤1 feature, E2E value) | **PASS** | 5/6 = 83.3%. Only It. 3 deviates (2 features); no chunk is out of the step band and none approaches the >20-step fail condition. |
| MVP-only (v1 features; stretch gated) | **PASS** | All scheduled work is drawn from brief features 1–5 with no invented scope; §1.2/§1.3/§4 cut and trigger-gate all post-MVP items. Qualified: features 4–5 were promoted into the required bar contra the spec's "features 1-3 only" rule — penalized under MVP Focus rather than gated, since nothing outside the brief's v1 feature set is scheduled. |
| 3–5 iteration plan (not single-run) | **PASS (with deviation)** | The gate's stated failure condition — single-run — is not met: six sequenced, independently-runnable phases exist with per-phase exit criteria. The count exceeds the nominal 3–5 band by one; penalized under Iteration Plan (4/5) and Iteration Fit (4/5). |
| Unit and basic E2E tests for MVP | **PASS** | `T6.3` four unit suites with named cases; `T6.5` Playwright critical journey browse → search → edit plus draft-visibility check; `T6.4` isolated test DB and Chromium-only project. Scope explicitly capped at brief level (§6, It. 6 scope note). |
| Iter1 local-first | **PASS** | Iteration 1 exit criteria are the local bootstrap commands; scripts, `.env.example`, migration, seed and README all land in It. 1 before any product feature. |

---

## Supplementary: version currency check

Not a scored criterion in this spec, but `backlog.md` D-B10 defers stack pins to the architecture and instructs re-verification at install. Live searches (2026-07-30) confirm the pins are current major/minor lines:

| Pinned (D-B10) | Verified latest | Match |
|---|---|---|
| Next 16.2.x | 16.2.12 LTS (2026-07-25) | Yes |
| Prisma 7.8.x | 7.8.0 | Yes |
| Tailwind 4.3.x | 4.3.3 (2026-07-16) | Yes |
| Vitest 4.x | 4.1 | Yes |
| Playwright 1.61.x | 1.61 stable (1.63 pre-release) | Yes |

React 19.2.x and Node 24.x returned no direct confirming result in the searches performed; no independent verification is asserted for those two pins.

---

## Score Summary

```
Planner v3: evals_june2026_grok_4.5

**Granularity Audit**:
Total Tasks: 6 | Good: 5 (83.3%) | PASS
Sample (3 tasks):
1. It. 2 Browse            Steps: 8  Features: 1 Value: queries→list→detail  [Good]
2. It. 3 Create/edit/delete Steps: 10 Features: 2 Value: actions→form→routes  [Big]
3. It. 5 Search            Steps: 6  Features: 1 Value: fts→api→box→page     [Good]

COMPLETENESS: 48.9/50
QUALITY: 45.0/50
TOTAL: 93.9/100 PASS

GATES: [x]70% [x]MVP [x]Iters [x]Tests [x]Local
```

**Verdict: PASS** (93.9 ≥ 75)

**Deductions concentrated in two findings:**
1. Scope bar expanded from the required three v1 features to five (D-B1), costing MVP Focus 2 pts.
2. Six iterations against the spec's 3–5 phase band, costing Iteration Plan and Iteration Fit 1 pt each.

**Sources (version verification):**
- [July 2026 Security Release | Next.js](https://nextjs.org/blog/july-2026-security-release)
- [Next.js EOL / 16.2.12 LTS](https://eosl.date/eol/product/nextjs/)
- [Prisma ORM Release Notes](https://www.prisma.io/changelog)
- [Prisma releases and maturity levels](https://www.prisma.io/docs/orm/more/releases)
- [Tailwind CSS EOL / 4.3.3](https://eosl.date/eol/product/tailwind-css/)
- [Tailwind CSS 4.3 — VersionLog](https://versionlog.com/tailwind-css/4.3/)
- [Vitest 4.1 is out!](https://vitest.dev/blog/vitest-4-1.html)
- [Releases · microsoft/playwright](https://github.com/microsoft/playwright/releases)

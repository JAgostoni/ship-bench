# Planner Phase Evaluation

**Spec:** `evals/planner-measurement-spec.md` (v3 — Right-Sizing)
**Artifacts evaluated:** `docs/backlog.md`, `docs/iterations/iteration-1.md` … `iteration-8.md`
**Reference documents:** `docs/product-brief.md`, `docs/architecture.md`, `docs/design-spec.md`
**Date:** 2026-09-17

**Version-currency note:** The Planner rubric contains no criterion concerning library versions, tech-stack currency, or version naming. No live version verification was therefore required or performed for scoring purposes.

---

```
Planner v3: evals_sep2026_deepseek-flash-4.1

**Granularity Audit**:
Unit of assessment: one iteration file = one developer run ("task"); its numbered
subsections (e.g. 4.1–4.8) = "steps".
Total Tasks: 8 | Good: 6 (75%) | PASS

Per-task audit:
1. Iter 1 Foundation            Steps: 9  Features: 0 (infra)   Value: runnable clone, migrated+seeded DB, verify gate  [Good]
2. Iter 2 Domain core           Steps: 10 Features: 0 (lib layer) Value: pure functions only, no user-visible surface  [Small — partial layer]
3. Iter 3 Repository layer      Steps: 7  Features: 0 (data layer) Value: SQL layer only, no route consumes it         [Small — partial layer]
4. Iter 4 Shell + browse/detail Steps: 8  Features: 1 (F1)      Value: DB→UI browse + detail, 5 empty states           [Good]
5. Iter 5 Search + read API     Steps: 7  Features: 1 (F2)      Value: DB→API→UI search, filters, pagination           [Good]
6. Iter 6 Editing               Steps: 8  Features: 1 (F3)      Value: DB→Action→UI create/edit, persisted             [Good]
7. Iter 7 E2E + CI              Steps: 8  Features: 0 (test)    Value: MVP-required E2E journeys, executable gate      [Good]
8. Iter 8 Hardening + docs      Steps: 10 Features: 0 (evidence) Value: required brief deliverables, measured budgets  [Good]

Step counts: min 7, max 10 — 8/8 within the 5–15 band; 0 tasks >15 steps;
0 tasks spanning >1 feature. No "Way Too Big" monolith → gate-fail condition absent.
Deduction: Iterations 2 and 3 are horizontal layer slices with no end-to-end
user value (`backlog.md` B2, B3 justify the split as a toolchain/testability
tradeoff). 6/8 = 75% ≥ 70% threshold.

COMPLETENESS: 47.8/50
QUALITY: 46.7/50
TOTAL: 94.5/100 PASS (threshold ≥75, `evals/benchmark-process-index.md` line 13)

GATES: [x]70% [x]MVP [x]Iters [x]Tests [x]Local
```

---

## Section 1: Completeness (50 pts)

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | MVP Features | 5 | `backlog.md` §1.1 maps F1/F2/F3 to **P0** and F4/F5 to **P1** with the UI declared cuttable. Browse+detail (Iter 4), search (Iter 5), and edit (Iter 6) each occupy a dedicated iteration with their own definition of done. |
| 2 | Task Granularity | 4 | All 8 iterations fall in the 5–15 step band (7–10) and none spans more than one feature; 75% deliver a usable chunk. Iterations 2 and 3 are layer-only slices, below the "DB+API+UI" value standard. |
| 3 | Tech Breakdown | 5 | Explicit layered progression: schema+migration (Iter 1.5), DB client/FTS5 bootstrap (1.6), repositories (Iter 3), JSON API routes (5.6), Server Actions (6.1), UI (4.1–4.6). Each task names concrete files and their contracts. |
| 4 | MVP Testing | 5 | `backlog.md` §1.3 tabulates unit (Vitest, `src/lib/**` ≥90%), integration (real SQLite, `src/server/**` ≥85%), component, and E2E layers, with non-MVP rows marked "Not MVP". Iter 7.3–7.6 specify the browse→search→edit journeys plus empty-state/responsive specs; B10 explicitly refuses additional journeys. |
| 5 | Setup | 5 | Iteration 1 delivers `npm install && npm run db:setup && npm run dev`, `db:*` scripts (1.8), an idempotent seed (1.7), env validation (1.4), the `verify` gate and CI skeleton (1.9), each with an executable "Done when" command. |
| 6 | States | 5 | Task 4.5 tables all five empty states with exact copy, CTA targets, icons, and a dedicated test file; `error.tsx`/`global-error.tsx`/`not-found.tsx` in 4.4/4.6; validation schemas in 2.7–2.8; conflict banner in 6.4. |
| 7 | Iteration Plan | 4 | §2 provides 8 discrete phases with goal, scope, dependency, and per-file DoD, plus a "Why this shape" rationale. Phase count exceeds the spec's nominal 3–5 band. |
| 8 | Dependencies | 5 | §3.1 is a 15-row hard-blocker table (blocker → unblocks → why); §3.2 records soft sequencing constraints; §2 states the critical path `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`; each iteration file repeats intra-iteration ordering. |
| 9 | Stretch Phasing | 5 | §1.4 enumerates out-of-MVP items; §4.1 assigns the brief's four stretch deliverables to Iteration 8; §4.2 gates Phases 2–7 behind explicit trigger conditions ("when read traffic grows", "when a second app instance is needed"). |

**Math:** Sum = 5+4+5+5+5+5+4+5+5 = **43/45**. 43 × (50/45) = 47.78 → **47.8/50**.

---

## Section 2: Quality (50 pts)

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Chunk Quality | 5 | 6/8 = 75% of chunks are 5–15 steps, ≤1 feature, with end-to-end value — above the ≥70% anchor for 5. Step counts are tightly clustered (7–10); no outliers in either direction. |
| 2 | MVP Focus | 4 | Ruthless cuts are present and reasoned: F4/F5 UI declared cuttable (§1.2), B10 refuses extra E2E specs, §1.4 excludes auth, tags, uploads, revision diffing, Docker, i18n. Offsetting: the plan retains non-required surface inherited from the upstream specs (command palette 5.2, table of contents 4.6, revision history 6.5, theme toggle 4.2), widening MVP execution cost. |
| 3 | Iteration Fit | 4 | 8 clearly bounded runs, each ending green with a stated DoD — unambiguously multi-run with defined milestones, but 3 phases beyond the spec's 3–5 band; B1 documents the choice against the 4-iteration alternative. |
| 4 | Risk Tasks | 5 | §3.3 maps six named risks to iterations with mitigations embedded as tasks rather than notes: hand-editing the `CHECK` constraint before first migrate (1.5), an FTS-trigger reflection test (3.6), `workers: 1` for Playwright SQLite contention (7.2), `next/dynamic` for editor bundle size (6.3). Iteration 1 notes flag the single irreversible mistake. |
| 5 | Actionability | 5 | Every task names target files, required props/exports, and exact copy strings, and closes with a verifiable "Done when" — several as runnable commands (e.g. 1.6 asserts `{ c: 4 }` for the FTS virtual table plus three triggers; 7.1 asserts `GET /api/search?q=deploy` returns exactly 3 results). |
| 6 | Handoff | 5 | Iteration 1's DoD is executable from a clean clone: `npm install`, `npm run db:setup`, `npm run db:check`, `npm run dev`, `npm run verify`, with expected outputs stated. No prerequisite work is assumed outside the file. |

**Math:** Sum = 5+4+4+5+5+5 = **28/30**. 28 × (50/30) = 46.67 → **46.7/50**.

---

## Pass/Fail Gates

| Gate | Result | Reason |
|---|---|---|
| ≥70% Good chunks (5–15 steps, ≤1 feature, E2E value) | **PASS** | 6/8 = 75%. All 8 within the step band; 2 penalized as layer-only slices (Iter 2, 3). |
| MVP-only (v1 features; stretch gated) | **PASS** | §1.1 P0 = F1–F3; §1.4 out-of-MVP list; §4.2 post-MVP phases gated behind explicit triggers. |
| 3–5 iteration plan (not single-run) | **PASS (with deviation)** | The plan is 8 iterations, exceeding the nominal 3–5 band. The gate's stated failure condition — a single-run plan — is not met: §2 defines 8 sequenced runs with individual goals, dependencies, and definitions of done. Scored as a deduction in Completeness §7 and Quality §3 rather than a gate failure. |
| Unit and basic E2E tests for MVP | **PASS** | §1.3 testing matrix; unit/integration tests co-located in Iterations 2–3 (B3); five Playwright journeys covering browse→search→edit in Iteration 7. |
| Iter1 local-first | **PASS** | Iteration 1 goal is a clean clone reaching `npm run dev` with a migrated, seeded, FTS5-bootstrapped database and a passing `verify` gate. |

---

## Final Verdict

**TOTAL: 94.5 / 100 — PASS** (threshold ≥75).

**Principal deductions:** (1) Iterations 2 and 3 are horizontal layer slices without user-visible value, reducing the good-chunk rate to 75%; (2) the iteration count (8) exceeds the spec's 3–5 band; (3) retained non-required UI surface (command palette, TOC, revision history, theme toggle) widens MVP execution cost beyond the brief's three required features.

# Planner v3 Evaluation: evals_May2026_qwen-3.6-plus

**Artifacts evaluated**: `docs/backlog.md` (scope, iteration plan, decisions log) and `docs/iterations/iteration-{1..5}.md` (per-iteration task breakdowns with numbered steps).

---

## Granularity Audit

The plan is hierarchical: 5 iterations → 30 numbered sub-tasks → numbered "Steps:" lists per sub-task. The spec's chunking unit ("≤1 feature, DB+API+UI value, 5–15 steps") best maps to **iteration-level chunks** (matches the spec's worked example: "Article list: 1–3 DB model/migrate, 4–7 list API, 8–12 UI+integration, 13–14 tests"). Sub-task-level evaluation is provided as a secondary lens.

### Lens A — Iteration as task (5 chunks)

Step counts are the sum of numbered Steps across an iteration's sub-tasks.

| Iteration | Numbered Steps | Feature Span | E2E Value | Verdict |
|-----------|---------------|--------------|-----------|---------|
| 1 Foundation | 6+7+5+4+4+3+5 = **34** | 0 (infrastructure) | Local-run scaffold | **Way Too Big** (>20 → gate fail) |
| 2 Browse & Detail | 4+4+4+3+5 = **20** | 1 (browse) | Read flow E2E | **Too Big** (15–20, −1 pt) |
| 3 Search | 3+2+3+2 = **10** | 1 (search) | Search flow E2E | **Good** |
| 4 Editor | 4+2+3+2+2+3+4 = **20** | 1 (edit) | Write flow E2E | **Too Big** (15–20, −1 pt) |
| 5 Test & Polish | 4+5+4+4+4+4+3 = **28** | Cross-cutting tests for 3 features | Verification gate | **Way Too Big** (>20 → gate fail) |

Good ratio: **1/5 = 20%**.

### Lens B — Sub-task as task (30 chunks)

Counting the numbered "Steps:" list per sub-task (1.1, 1.2, …):

- **Good (5–15 steps)**: 1.1(6), 1.2(7), 1.3(5), 1.7(5), 2.5(5), 5.2(5) = **6**
- **Too Small (<5)**: 24 sub-tasks (most have 2–4 numbered steps; many compensate with deep sub-bullets but the literal step count is below threshold)
- Good ratio: **6/30 = 20%**

Both lenses converge on ≈20% Good chunks. **Granularity gate FAILS** under either reading.

### Sample audit

1. **Iteration 1 — Foundation**: 34 numbered steps across 7 sub-tasks; spans scaffold, DB schema, seed, design tokens, primitives, shell, and dev workflow. Value: full local-run scaffold. Verdict: **Way Too Big**.
2. **Iteration 3 — Search**: 10 steps across 4 sub-tasks; ≤1 feature; FTS5 → API → UI → page. Verdict: **Good**.
3. **Sub-task 4.5 — Server Actions for Create & Update**: 2 numbered steps. ≤1 feature. Has rich sub-bullets but literal step count below 5. Verdict: **Too Small**.

---

## Section 1: Completeness (50 pts)

| Area | Score | Justification |
|------|-------|---------------|
| MVP Features | 5 | Browse (Iter 2), search (Iter 3), and edit (Iter 4) each get dedicated iterations with full task breakdowns (`iteration-2.md` §2.1–2.5; `iteration-3.md` §3.1–3.4; `iteration-4.md` §4.1–4.7). |
| Task Granularity | 2 | Strictly ~20% of chunks fall in the 5–15 step range under either lens; many sub-tasks have only 2–4 numbered steps and two iterations exceed 20 steps. |
| Tech Breakdown | 5 | Each feature iteration sequences DB → API → UI → integration explicitly (e.g., `iteration-3.md`: 3.1 FTS5 schema → 3.2 API route → 3.3 SearchInput/Dropdown → 3.4 results page). |
| MVP Testing | 5 | `iteration-5.md` §5.1–5.5 covers Vitest setup + DB/lib/component unit tests + Playwright config + E2E specs for browse/search/edit/states. |
| Setup | 5 | `iteration-1.md` §1.1–1.7 covers scaffold, Drizzle config, schema push, seed script, scripts in `package.json` (`db:push`, `seed`, `dev`), and lint. |
| States | 4 | Empty states defined in 2.1 (no articles), 2.3 (article not found), 3.3 (no search results); validation in 4.6; states are spread across tasks rather than enumerated as a dedicated track. |
| Iteration Plan | 5 | Five iterations with explicit goals and milestones (`backlog.md` lines 42–48; one file per iteration). |
| Dependencies | 5 | Critical-path diagram (`backlog.md` lines 54–66) plus per-iteration "Dependency:" notes (e.g., `iteration-4.md` line 152). |
| Stretch Phasing | 5 | Three-tier post-MVP table (`backlog.md` lines 76–80) plus decisions log (lines 86–94) defers categories, status UI, autosave, accessibility audit. |

**Sum**: 5+2+5+5+5+4+5+5+5 = 41/45 → 41 × (50/45) = **45.6/50**

---

## Section 2: Quality (50 pts)

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Chunk Quality | 1 | Strict step-count gives 20% Good chunks under both Lens A (1/5) and Lens B (6/30); meets the spec's "<30% good" anchor. |
| MVP Focus | 5 | Decisions log explicitly cuts TipTap, category filtering, status UI, and autosave with rationale (`backlog.md` lines 86–94; `iteration-4.md` lines 153–157). |
| Iteration Fit | 5 | Exactly 5 iterations within the spec's 3–5 range, each with a defined goal (`backlog.md` lines 42–48). |
| Risk Tasks | 4 | FTS5 sequencing risk mitigated by writing migration in Iter 1 but applying in Iter 3 (`backlog.md` lines 67–69; `iteration-1.md` §1.2 step 7); Markdown storage-format decision documented (`iteration-4.md` §4.4 step 2 and lines 153–154). |
| Actionability | 5 | Sub-tasks include exact commands (`npx drizzle-kit push`, `npm install drizzle-orm better-sqlite3`), file paths (`src/db/schema/articles.ts`), SQL snippets (`iteration-3.md` §3.1 step 3), and component prop signatures (`iteration-2.md` §2.1 step 4). |
| Handoff | 5 | Iter 1 ends with a runnable shell at localhost:3000 plus seeded DB (`iteration-1.md` §1.7 step 4 and Iteration Notes); Iter 5 produces README run instructions (`iteration-5.md` §5.7). |

**Sum**: 1+5+5+4+5+5 = 25/30 → 25 × (50/30) = **41.7/50**

---

## Gates

- [ ] **≥70% Good chunks**: **FAIL** — 20% Good under both iteration-level (1/5) and sub-task-level (6/30) lenses; Iterations 1 and 5 exceed 20 steps (Way Too Big).
- [x] **MVP-only**: PASS — features 4 and 5 deferred with rationale (`backlog.md` lines 28–36, 86–94).
- [x] **3–5 iteration plan**: PASS — exactly 5 iterations.
- [x] **Unit and basic E2E tests for MVP**: PASS — Vitest + Playwright with browse → search → edit specs (`iteration-5.md` §5.1–5.5).
- [x] **Iter1 local-first**: PASS — `iteration-1.md` §1.1–1.7 produces a running app shell with seeded DB.

---

## Final Score

```
Planner v3: evals_May2026_qwen-3.6-plus

Granularity Audit:
Total Tasks (iterations): 5 | Good: 1 (20%) | FAIL
Total Tasks (sub-tasks):  30 | Good: 6 (20%) | FAIL
Sample:
1. Iteration 1 Foundation — Steps: 34 | Features: 0 (infra) | Value: Local-run scaffold | Way Too Big
2. Iteration 3 Search — Steps: 10 | Features: 1 | Value: Search E2E | Good
3. Sub-task 4.5 Server Actions — Steps: 2 | Features: 1 | Value: Write path | Too Small

COMPLETENESS: 45.6/50
QUALITY:      41.7/50
TOTAL:        87.3/100  PASS-by-score / FAIL-by-gate

GATES: [ ]70% [x]MVP [x]Iters [x]Tests [x]Local
```

**Verdict**: **FAIL** — score is 87.3/100, but the spec requires all five gates to pass and the ≥70% Good-chunk gate fails (20% under both granularity lenses). Iterations 1 and 5 are Way Too Big (>20 steps); Iterations 2 and 4 are Too Big (15–20). The agent decomposed work into well-named sub-tasks with concrete commands and file paths, but most sub-tasks fall below the 5-step floor while iterations exceed the 15-step ceiling — the chunking unit lands on neither side of the spec's right-sizing window.

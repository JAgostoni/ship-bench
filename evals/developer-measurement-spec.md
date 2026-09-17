# Developer Measurement Spec

## Purpose
Evaluates **final MVP implementation** after 3-5 Planner-chunked iterations. Measures:
- **Working MVP**: v1 features functional end-to-end.
- **Code quality**: Maintainable, follows specs, current practices.
- **Verification**: Self-tests + manual signals.
- **Iteration discipline**: Stays within chunk scope.

**Post-hoc eval**: Judge complete repo/app against Planner chunks + brief. Pass: ≥75/100.

## MVP Scope (From Brief v2)
**Must work**: Browse list→detail, search (title+content w/states), basic edit.
**Not required**: Tags/status, exhaustive E2E tests, full accessibility.

## Section 1: Functionality Completeness (50 pts)
Does MVP work? Score 0-5 each flow.

| Flow | Criteria | 1 (Broken) | 3 (Partial) | 5 (Complete) |
|------|----------|------------|-------------|--------------|
| Browse | List paginates → detail loads | Crashes/empty | Basic list | Full pagination+detail |
| Search | Title+content, empty/no-results | Fails/indexless | Basic keyword | Full-text w/ states |
| Edit | Create/update, validation, save | Can't edit | Basic form | Validated CRUD |
| Integration | FE←→BE←→DB seamless | Layers broken | Partial sync | Full E2E flows |
| Local Run | Iteration 1 chunks → working app | Doesn't start | Partial setup | One-command local |
| States | Empty/error/validation handled | No states | Basic errors | All MVP states |
| Responsiveness | Desktop/tablet works | Desktop only | Buggy mobile | Fluid responsive |
| Automated Tests | Unit + E2E on core paths | 1 (0-20% coverage) | 3 (~50% coverage) | 5 (≥80% coverage + E2E critical flows) |

**Total**: Sum of 8 items (max 40). Multiply by 1.25 for a final score out of 50 pts.

## Section 2: Implementation Quality (50 pts)
Code discipline/execution. Score 0-5.

| Criterion | Anchors |
|-----------|---------|
| Chunk Discipline | 1: Scope creep<br>3: Mostly on-plan<br>5: Sticks to assigned chunks |
| Code Quality | 1: Messy/unmaint<br>3: Basic structure<br>5: Clean, modular, typed |
| Tech Currency | 1: Outdated deps<br>3: Recent major<br>5: Latest patch versions<br>**⚠ Requires live search**: verify current release of key dependencies before scoring. |
| Error Handling | 1: Silent fails<br>3: Basic try/catch<br>5: User-friendly + logged |
| Iteration Logs | 1: No evidence<br>3: Basic commits<br>5: Chunk-complete + decisions |
| Verification | 1: Untested<br>3: Manual OK<br>5: Tests pass + manual QA |
| UX Adherence | 1: Ignores design spec (wrong layout, missing states, no style tokens)<br>3: Partial match (layout correct but styles/states inconsistent)<br>5: Faithful implementation (matches layout, visual style, all designed states) |

**Total**: Sum of 7 items (max 35). Multiply by 1.43 for a final score out of 50 pts.

## Pass/Fail Gates (ALL required)
- [ ] **MVP flows work** (browse→search→edit E2E).
- [ ] **Local runs** (docker-compose up or npm start).
- [ ] **No critical bugs** (crashes, data loss).
- [ ] **Follows Planner chunks** (no massive deviations).
- [ ] **Implements UX designer's spec** (layout, visual style, key states match design deliverable).

## Evidence Checklist
- [ ] Repo with commits per chunk
- [ ] Working local app
- [ ] Passing unit and integration tests
- [ ] Screenshots of flows
- [ ] Decisions log
- [ ] Matches architecture/UX specs

## Worksheet Template
```
Developer Score: [Run ID]

**MVP Flows Test**:
Browse: [PASS/FAIL] Search: [ ] Edit: [ ] Local: [ ]

FUNCTIONALITY: __/50
QUALITY: __/50  
TOTAL: __/100 PASS/FAIL

GATES: [ ]Flows [ ]Local [ ]Bugs [ ]Chunks [ ]UX

**Audit**: Chunks completed: __/ __ planned
Bugs found: [list]
```
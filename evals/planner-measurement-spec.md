
# Planner Measurement Spec (v3 - Right-Sizing)

## Purpose
Measures Implementation Backlog/Execution Plan. **Core focus**: Right-sized chunks for 3-5 Developer iterations.

**MVP Rule**: v1 features 1-3 only. Accessibility/E2E testing = design-only, not MVP implementation.

## Right-Sizing Rules (Objective)
**Per-task assessment** (count steps, features, value):

| Category | Steps | Feature Span | Value | Score |
|----------|-------|--------------|--------|-------|
| **Too Small** | <5 | Partial layer | No E2E value | -2 pts |
| **Good** | **5-15** | **≤1 feature** | **Usable chunk** (DB+API+UI) | ✅ Full pts |
| **Too Big** | 15-20 | >1 feature | Overloaded | -1 pt |
| **Way Too Big** | >20 | Multiple | Monolith | ❌ Gate fail |

**Examples**:
- ✅ **Good**: "Article list: 1-3 DB model/migrate, 4-7 list API, 8-12 UI+integration, 13-14 tests" (14 steps, 1 feature)
- ❌ **Small**: "Create model" (3 steps)
- ❌ **Big**: "CRUD+search fullstack" (28 steps)

**Gate**: ≥70% tasks = Good size.

## Section 1: Completeness (50 pts)
Score 0-5 each area.

| Area | Description | 1 | 3 | 5 |
|------|-------------|---|----|---|
| MVP Features | Browse/search/edit chunked | Missing | Partial | Complete |
| Task Granularity | **5-15 steps, ≤1 feat, E2E** | Wrong sizes | Some good | **≥70% good** |
| Tech Breakdown | Schema→API→UI chunks | Flat | Layered | Executable layers |
| MVP Testing | Unit tests only | None | Basic | Critical paths |
| Setup | Iteration 1 local-run | Missing | Basic | Scripts/seeds |
| States | Empty/error validation | Ignored | Basic | MVP-tasked |
| Iteration Plan | 3-5 run phases | Single-run | Multi-aware | Clear milestones |
| Dependencies | Blockers explicit | Unclear | Basic | Critical path |
| Stretch Phasing | Post-MVP explicit | Mixed | Prioritized | Gated |

**Total**: Sum 9 (max 45) → 50 pts.

## Section 2: Quality (50 pts)
Score 0-5.

| Criterion | Anchors |
|-----------|---------|
| Chunk Quality | 1: <30% good size<br>3: 50-70%<br>**5: ≥70% 5-15 steps** |
| MVP Focus | 1: Scope creep<br>3: Mostly MVP<br>5: Ruthless cuts |
| Iteration Fit | 1: Single run<br>3: 2-3 chunks<br>5: 3-5 clear runs |
| Risk Tasks | 1: Blind<br>3: Notes risks<br>5: Mitigating chunks |
| Actionability | 1: Vague<br>3: Basic ACs<br>5: Steps+examples |
| Handoff | 1: Unclear<br>3: Runnable<br>5: Iter1 runs now |

**Total**: Sum 6 (max 30) → 50 pts.

## Gates (ALL required)
- [ ] **≥70% Good chunks** (5-15 steps, ≤1 feature, E2E value)
- [ ] **MVP-only** (v1 features; stretch gated)
- [ ] **3-5 iteration plan** (not single-run)
- [ ] **Unit tests MVP-only**
- [ ] **Iter1 local-first**

## Worksheet Template
```
Planner v3: [Run ID]

**Granularity Audit**:
Total Tasks: __ | Good: __ (70%+) | PASS/FAIL
Sample (2-3 tasks):
1. [Task] Steps:__ Features:__ Value:__ [Good/Small/Big]
2. ...

COMPLETENESS: __/50
QUALITY: __/50
TOTAL: __/100 PASS/FAIL

GATES: [ ]70% [ ]MVP [ ]Iters [ ]Units [ ]Local
```

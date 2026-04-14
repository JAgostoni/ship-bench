# Agentic SDLC Benchmark: Evaluation Process & Index

## Overview
**5-phase evaluation** with independent specs per role → granular failure diagnosis. Poor Architect, UX, or Planner specs → optional canonical re-run for subsequent phases.

**Total Score**: Average of 5 phase scores (0-100 each). **Capability Verdict**: Can it complete full SDLC? (Y/N/Partial)

## Evaluation Flow
```
1. ARCHITECT
   ↓ Pass (≥75)? → Proceed | Fail → Note + optional canonical
2. UX/DESIGNER  
   ↓ Pass (≥75)? → Proceed | Fail → Note + optional canonical
3. PLANNER
   ↓ Pass (≥75)? → Proceed | Fail → Note + optional canonical
4. DEVELOPER
   ↓ Pass → Final QA
5. REVIEWER
   ↓ AGGREGATE SCORE + VERDICT
```

## Phase Independence Rules
| Phase Fail | Action | Rationale |
|------------|--------|-----------|
| Architect, UX, or Planner <75 | **Canonical re-run**: Use reference spec for next phase | Isolates downstream phases from flawed upstream specs |
| Developer <75 | **Fail run** (MVP must work) | Core deliverable |
| Reviewer | Final judgment | |

## Run Report Template
```
BENCHMARK RUN: [Model/Tool] #[ID]

PHASE SCORES:
├── Architect: __/100 [PASS/FAIL] Notes:
├── UX: __/100 [PASS/FAIL]  
├── Planner: __/100 [PASS/FAIL] Granularity: __%
├── Developer: __/100 [PASS/FAIL] MVP flows: [PASS/FAIL]
└── Reviewer: __/100 [PASS/FAIL] Verdict: [Y/N/P]

**AVERAGE**: __/100 **CAPABILITY**: [Can it do SDLC?]
**RE-RUN?** [Y/N] Phase: [Which] Canonical: [Y/N]

EVIDENCE:
├── Architect spec [link]
├── Repo [link] 
├── Screenshots [link]
└── Full logs [link]
```

## Process Steps
1. **Run phases sequentially (Fresh session per phase/iteration)** w/ file-based handoffs.
2. **Score each** using spec worksheet.
3. **Canonical intervention**: If Architect, UX, or Planner fails → provide reference spec to next phase.
4. **Aggregate** + capability verdict.
5. **Archive** full evidence.

## Files Index
- [Architect](./architect-measurement-spec.md)
- [UX/Designer](./ux-designer-measurement-spec.md)
- [Planner](./planner-measurement-spec.md)
- [Developer](./developer-measurement-spec.md)
- [Reviewer](./reviewer-measurement-spec.md)

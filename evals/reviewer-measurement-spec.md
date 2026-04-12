
# Reviewer Measurement Spec (v2 - Code Signals)

## Purpose
Final QA + light code review. Verifies MVP, defects, release rec, benchmark verdict.

## Section 1: Verification Completeness (50 pts)
[unchanged table from v1]

## Section 2: Assessment Quality (50 pts)
[unchanged table + new row]

| Criterion | Anchors |
|-----------|---------|
| [prior 6 unchanged] | |
| **Code Signals** | 1: Major smells<br>3: Lints, basic structure<br>5: Clean, modular, secure |

## Code Signals Checklist (Required)
```
CODE SIGNALS [PASS/FAIL]:
├── Linting: Clean [Y/N]
├── Security: No obvious holes [Y/N] 
├── Modularity: No god-components [Y/N]
├── Architecture Match: Follows spec [Y/N]
├── Planner Fidelity: Chunks complete [Y/N]
└── Tech Currency: Latest versions [Y/N]
```

## Output Template (Updated)
```
REVIEWER REPORT v2

**MVP Flows**: [table]
**Tests**: [coverage] 
**CODE SIGNALS**: [checklist above]
**Defects**: [list]
**Spec Drift**: [deviations]

**Release**: [SHIP/NO-SHIP] 
**Benchmark**: [Can it do it?]
**Score**: __/100
```

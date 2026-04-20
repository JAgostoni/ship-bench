# Reviewer Measurement Spec

## Purpose
Final **QA + light code review**. Evaluates complete MVP delivery:
- **Objective verification**: Does the app work? Tests pass?
- **Quality gates**: Meets specs, no regressions?
- **Code signals**: Clean, modular, architecture-faithful?
- **Release recommendation**: Ship/Don't ship + gaps?
- **Benchmark signal**: "Can it do it?" judgment.

**Input**: Final repo, tests, logs, prior specs.
**Output**: QA report + score. Pass: ≥75/100.

## MVP Scope (From Brief v2)
**Must verify**: Browse list→detail, search (title+content w/ states), basic edit.
**Not required**: Tags/status, exhaustive E2E tests, full accessibility.

---

## Section 1: Verification Completeness (50 pts)
Did Reviewer test everything? Score 0-5.

| Area | Description | 1 (Missing) | 3 (Partial) | 5 (Complete) |
|------|-------------|-------------|-------------|--------------|
| MVP Flows | Browse→search→edit E2E | Untested | Basic happy path | Full states + edge |
| Local Setup | One-command start, seeds | Not verified | Partial env | Full repro steps |
| Automated Tests | Run unit+E2E + coverage report | None run | Passed minimal | Coverage ≥80% + critical E2E pass |
| Responsiveness | Desktop/tablet | Desktop only | Mobile basic | Full breakpoints |
| Error Handling | Validation, 404, network | Ignored | Basic checks | Comprehensive |
| Performance | List load, search speed | Not measured | Basic timing | Thresholds met |
| Spec Adherence | Matches Architect/UX/Plan | Unchecked | Partial match | Full fidelity |
| Defects Logged | Steps to repro, severity | None found | Minor logged | Prioritized list |

**Total**: Sum 8 areas (max 40) → scaled to 50 pts.

---

## Section 2: Assessment Quality (50 pts)
Score 0-5.

| Criterion | Anchors |
|-----------|---------|
| Defect Accuracy | 1: Missed criticals / 3: Found majors / 5: All defects + false-neg check |
| Release Rec | 1: Wrong call / 3: Reasonable / 5: Data-driven ship/no-ship |
| Gap Analysis | 1: Vague / 3: Basic misses / 5: Prioritized fix list |
| Benchmark Signal | 1: No "can it?" / 3: Basic judgment / 5: Clear capability verdict |
| Evidence | 1: Narrative only / 3: Some screenshots / 5: Logs/tests/screenshots |
| Risk Assessment | 1: Blind / 3: Notes scale risks / 5: 100-user + prod risks |
| Code Signals | 1: Major smells / 3: Lints + basic structure / 5: Clean, modular, secure, arch-faithful |

**Total**: Sum 7 criteria (max 35) → scaled to 50 pts.

---

## Code Signals Checklist (Required)

| Signal | Check |
|--------|-------|
| Linting clean | Y/N |
| No obvious security holes | Y/N |
| Modular — no god-components | Y/N |
| Architecture match — follows spec | Y/N |
| Planner fidelity — chunks complete | Y/N |
| Tech currency — latest versions | Y/N |

---

## Pass/Fail Gates (ALL required)
- [ ] MVP passes objective checklist (flows work, tests pass)
- [ ] Defect list complete (no missed criticals)
- [ ] Clear ship/no-ship with rationale
- [ ] Evidence attached (screenshots, test logs)
- [ ] Code signals reviewed (all 6 checked)

---

## Required Output Template

```
REVIEWER REPORT v2                          Run ID: ___________

MVP FLOWS:
  Browse:  [ PASS / FAIL ]   Notes:
  Search:  [ PASS / FAIL ]   Notes:
  Edit:    [ PASS / FAIL ]   Notes:
  Local:   [ PASS / FAIL ]   Notes:

TESTS:
  Coverage: __%   Results: [ PASS / FAIL ]

CODE SIGNALS:
  Linting:            [ Y / N ]
  Security:           [ Y / N ]
  Modularity:         [ Y / N ]
  Architecture Match: [ Y / N ]
  Planner Fidelity:   [ Y / N ]
  Tech Currency:      [ Y / N ]

DEFECTS:
  Critical: [list with repro steps]
  Major:    [list]
  Minor:    [list]

SPEC DRIFT:
  [deviations from Architect / UX / Planner specs]

RELEASE RECOMMENDATION: [ SHIP / NO-SHIP / PARTIAL ]
BENCHMARK VERDICT:       [ Y / N / Partial ] — Can it do it? Because:
SCORE:                   __ /100
NEXT STEPS:              [fix list or stretch features]
```

---

## Reviewer Worksheet

```
Reviewer Score Sheet                        Run ID: ___________

SECTION 1 — VERIFICATION (50 pts)
  MVP Flows:    [1-5]   Notes:
  Local Setup:  [1-5]   Notes:
  Auto Tests:   [1-5]   Notes:
  Responsive:   [1-5]   Notes:
  Error Hdlg:   [1-5]   Notes:
  Performance:  [1-5]   Notes:
  Adherence:    [1-5]   Notes:
  Defects Log:  [1-5]   Notes:
  Subtotal:     __ /40  Scaled: __ /50

SECTION 2 — ASSESSMENT (50 pts)
  Defect Accuracy:  [1-5]
  Release Rec:      [1-5]
  Gap Analysis:     [1-5]
  Benchmark Signal: [1-5]
  Evidence:         [1-5]
  Risk Assessment:  [1-5]
  Code Signals:     [1-5]
  Subtotal:         __ /35  Scaled: __ /50

TOTAL:      __ /100
PASS/FAIL:  [ ]

GATES:
  [ ] Flows   [ ] Defects   [ ] Rec   [ ] Evidence   [ ] Code

AUDIT:
  Defects found: __ critical   __ major
  Ship verdict correct? [ Y / N ]
  Calibration notes:
```
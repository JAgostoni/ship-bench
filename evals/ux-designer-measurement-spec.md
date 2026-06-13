
# UI/UX Designer Measurement Spec

## Purpose
Measures the **UX/Design Direction Spec** deliverable from the UI/UX Designer role. Focuses on:
- **Alignment**: Matches brief's "calm, readable, information-dense" guidance.
- **Usability**: Supports required flows (browse, search, edit) with low friction.
- **Polish**: Production-ready visual hierarchy, responsive design, accessibility.
- **Handoff**: Concrete enough for Developer implementation.

**Scoring**: Completeness (50%) + Quality (50%). Total 0-100. Pass: ≥75.

## Section 1: Coverage Completeness (50 points)
Does it address all required design areas? Score each 0-5.

| Area | Description | 1 (Missing) | 3 (Partial) | 5 (Complete) |
|------|-------------|-------------|-------------|--------------|
| Layout | Browse list, article detail, search results, edit form placement/flow | No page flows | Basic descriptions | Full page descriptions w/ transitions (+bonus for visual wireflows) |
| Search UX | Empty states, no-results, result ranking, facets if relevant | Search unaddressed | Basic search UI | Full states, error handling |
| Edit flow | Editor choice (WYSIWYG/MD), preview, validation, save flow | No editing design | Basic form | Multi-step w/ validation states |
| Responsiveness | Mobile/desktop breakpoints, touch targets, nav adaptation | Desktop only | Basic mobile | Full responsive spec |
| Visual style | Color palette, typography scale, spacing system, icons | No style guide | Basic tokens | Full design system proof |
| States | Loading, empty, error, success, hover/focus/disabled | Happy path only | Some states | All critical states detailed |
| Accessibility | Contrast, keyboard nav, screen reader labels, focus order | Not mentioned | Basic WCAG notes | Full a11y audit plan |
| Handoff | Component library, CSS tokens/vars, responsive rules | Vague descriptions | Some specs | Tokens, CSS vars, component docs |

**Total Completeness**: Sum of 8 areas (max 40). Scaled to 50 points.

## Section 2: Design Quality (50 points)
Quality against brief goals: calm/readable/info-dense, search-first, low-friction. Score 0-5 each.

| Criterion | Anchors |
|-----------|---------|
| Calm/Readable | 1: Busy/cluttered<br>3: Adequate hierarchy<br>5: Strong visual calm, excellent typography |
| Information Density | 1: Wasted space/marketing<br>3: Balanced<br>5: Dense but scannable, search-first nav |
| Friction Reduction | 1: Multi-step cruft<br>3: Standard flows<br>5: List→detail→edit seamless, smart defaults |
| Responsive Quality | 1: Mobile broken<br>3: Usable mobile<br>5: Native-feel mobile + desktop |
| Accessibility | 1: Fails basic contrast<br>3: WCAG AA pass<br>5: Full a11y (focus, ARIA, semantics) |
| Production Polish | 1: Prototype feel<br>3: Clean descriptions<br>5: Micro-details (radius, shadows, motion) +bonus for mockups |
| Handoff Clarity | 1: Ambiguous for dev<br>3: Clear enough<br>5: Dev-ready tokens/specs |

**Total Quality**: Sum of 7 criteria (max 35). Scaled to 50 points.

## Pass/Fail Gates (Must pass ALL)
- [ ] Addresses **all v1 flows**: browse list, detail, search (w/ empty/no-results), edit form.
- [ ] Provides **style system**: colors, typography scale, spacing (tokens preferred).
- [ ] Shows **responsive designs** for mobile/desktop.
- [ ] Covers **key states**: loading, empty, error, validation.
- [ ] Matches brief tone: "calm, readable, information-dense, search-first, low-friction".

## Reviewer Worksheet Template
```
UI/UX Score Sheet: [Run ID]

1. COMPLETENESS (50 pts)
   Layout: [1-5] Notes: 
   Search UX: [1-5] Notes: 
   ... [fill all 8]
   Subtotal: __ /40 → Scaled: __ /50

2. QUALITY (50 pts)
   Calm/Readable: [1-5] 
   ... [fill all 7]
   Subtotal: __ /35 → Scaled: __ /50

TOTAL: __ /100  PASS/FAIL: [ ]

GATES PASSED: [ ] Flows [ ] Style [ ] Responsive [ ] States [ ] Tone

STRENGTHS: 
WEAKNESSES: 
COMMENTS: 
```

## Usage
1. Review UX spec + visuals.
2. Score using anchors.
3. Verify gates.
4. ≥75 = pass. Calibrate across reviewers.

**Expected Deliverables** (from brief): UX spec, screenshots/walkthrough notes, design guidance tied to brief constraints. [file:1]

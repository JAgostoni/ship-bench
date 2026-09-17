
# Architect Measurement Spec

## Purpose
This spec defines how to measure the **Technical Architecture Spec** deliverable from the Architect role in the Simplified Knowledge Base App benchmark. It emphasizes:
- **Decision completeness**: No late-game architectural decisions for the Developer.
- **Choice quality**: Stack supports required features, local simplicity, maintainability, and scale path.
- **Evidence quality**: Concrete artifacts over vague narrative.

**Scoring**: Two sections — Completeness (50%) + Quality (50%). Total score 0-100. Pass bar: ≥75.

## Section 1: Decision Completeness (50 points)
Judge if the spec leaves **no major implementation decisions** for the Developer. Score each area 0-5.

| Area | Description | 1 (Missing) | 3 (Partial) | 5 (Complete) |
|------|-------------|-------------|-------------|--------------|
| Front-end | Framework/version, routing, state, forms, editor choice | Generic/no specifics | Framework named, some details | Exact versions, full stack decisions |
| Back-end | Framework/version, API style, validation, errors | No BE or vague | Framework named, basic API | Exact, with contracts/examples |
| Data tier | DB/ORM, schema, migrations, seeds | No persistence plan | DB named, basic schema | Full model, migrations, seeds |
| Search | Engine/indexing/ranking for titles+content | Search unaddressed | Basic full-text | Concrete strategy w/ tradeoffs |
| Integration | FE-BE connection, envs, ports, CORS | Layers disconnected | Basic API calls noted | Full contracts, env setup |
| Repo | Mono/poly, package mgmt, layout, scripts | No repo plan | Basic structure | Tree, scripts, workflow |
| Testing | Coverage plan, tools, critical paths | No tests mentioned | Basic unit tests | Layered strategy w/ examples |
| Local run | Startup steps, services, env vars | No local plan | Basic commands | Scripts, docker-compose, seeds |
| NFRs | Responsive/access/perf/security | Ignored | Mentioned | Design decisions tied to NFRs |

**Total Completeness**: Sum of 9 areas (max 45). Scaled to 50 points.

## Section 2: Tech Choice Quality (50 points)
Judge choices against brief goals: v1 features, local ease, maintainability, ~100→future users. Score 0-5 each.

| Criterion | Anchors |
|-----------|---------|
| Feature support | 1: Core flows impossible<br>3: Awkward workarounds<br>5: Clean support for browse/search/edit |
| Simplicity | 1: Heavy/enterprise<br>3: Works but complex setup<br>5: Local-first, minimal deps |
| Maintainability | 1: Obsolete/unmaintained<br>3: Current but verbose<br>5: Modern, ergonomic, documented<br>**⚠ Requires live search**: verify current release status of named libraries before scoring. |
| Scale path | 1: Hits limits at 100 users<br>3: Works now, unclear future<br>5: Clear path to 1000+ users |
| Ergonomics | 1: High-friction workflow<br>3: Standard but basic<br>5: Scripts/types streamline dev |
| Evidence | 1: Narrative only<br>3: Some diagrams<br>5: Repo tree, schemas, examples |

**Total Quality**: Sum of 6 criteria (max 30). Scaled to 50 points.

## Pass/Fail Gates (Must pass ALL)
- [ ] Names **exact frameworks/versions** (no "React-ish"). **⚠ Requires live search**: confirm each named version is the current stable release.
- [ ] Defines **data model** for articles (fields/relations).
- [ ] Specifies **search strategy** (not deferred).
- [ ] Provides **repo layout** and local startup steps.
- [ ] Addresses **~100 user scale** path.

## Reviewer Worksheet Template
```
Architect Score Sheet: [Run ID]

1. COMPLETENESS (50 pts)
   Front-end: [1-5] Notes: 
   Back-end: [1-5] Notes: 
   ... [fill all 9]
   Subtotal: __ /45 → Scaled: __ /50

2. QUALITY (50 pts)
   Feature support: [1-5] 
   ... [fill all 6]
   Subtotal: __ /30 → Scaled: __ /50

TOTAL: __ /100  PASS/FAIL: [ ]

GATES PASSED: [ ] Frameworks [ ] Data [ ] Search [ ] Repo [ ] Scale

STRENGTHS: 
WEAKNESSES: 
COMMENTS: 
```

## Usage
1. Read Architect artifact.
2. Fill worksheet row-by-row using anchors.
3. Check gates.
4. Total scores. ≥75 = pass.

**Calibration**: Two humans score independently. If >10pt gap, discuss. Average scores.

# Reviewer Phase Evaluation

**Artifact under evaluation:** `docs/qa-report.md` (commit `9c5498e`, "docs: add final QA review report")
**Supporting artifact:** `docs/verification-notes.md` (developer-authored; treated as a claim to be audited, not as reviewer output)
**Spec applied:** `evals/reviewer-measurement-spec.md`
**Evaluator environment:** Windows 11, Node.js 24.21.0, npm 11.19.0, Playwright 1.63.0 (Chromium + WebKit)
**Evaluation date:** 2026-09-17

---

## Independent verification performed

All scores below are anchored to first-hand reproduction, not to the reviewer's narrative.

| Check | Command / probe | Evaluator result | Matches QA report? |
|---|---|---|---|
| Unit/integration/component | `npm run test:coverage` | 492 passed (48 files), exit 0 | Yes |
| Coverage | same | 95.13 Stmts / 86.74 Branch / 91.96 Funcs / **95.46 Lines**; `categories.ts` 83.33 lines / 62.5 branches, lines 134–150 | Yes, to the decimal |
| E2E | `npm run test:e2e` | **28 passed (2.3m)**, Chromium + WebKit | Yes |
| Lint | `npx eslint .` | 0 errors, 1 warning (`postcss.config.mjs` `import/no-anonymous-default-export`), exit 0 | Yes |
| Format | `npm run format:check` | No `src/` violations; all 26 flagged files are post-review additions (`evals/`, `.kilo/`, `.claude/`) | Yes |
| Local setup | `npm run db:reset`, `npm run dev` | exit 0; server ready, seed loaded | Yes |
| Browse (browser) | Playwright 1280×900 | 7 published articles, 4 categories + `Uncategorized`, 9 article links incl. drafts hidden | Yes |
| Detail (browser) | `/articles/deploying-the-api-to-production` | `h1` correct, 7 `.prose h2`, 1 `<table>`, 2 `<pre><code>`, TOC present; no literal Markdown in body | Yes |
| Search (browser) | `/search?q=deploy` | "3 results", 6 `<mark>`; `?q=zzzqqq` → "0 results" + "No results" empty state | Yes |
| Edit persistence (browser) | edit `code-review-guidelines`, save, **full reload** | Marker text persisted; `History (2 revisions)` | Yes |
| Error paths (HTTP) | 14 probes | 404/400/403/415/422/409/204 all as tabulated by the reviewer; FTS injection `?q=" AND` → 200 | Yes |
| Soft-404 (QA-4) | `GET /articles/does-not-exist` | **200** (correct surface); `/no-such-page-xyz` → 404 | Yes |
| **QA-1** | Playwright: fill `#title` + `textarea#bodyMd`, click "Save & create another" | URL became `/articles/qa-eval-probe-three`; form gone; article created | **Confirmed exactly** |
| **QA-2** | Playwright 834×1112, `pointer: coarse`, box∩clipping-ancestor intersection | Chips: box 32px, expanded 44px, **effective 32px**, clipper `overflow-x:auto` | **Confirmed exactly** |
| **QA-5** | `node scripts/responsive-matrix.cjs http://localhost:3000` | `TOC present=false visible=undefined FAIL` at 1280 and 1440; `editor not mounted` at all widths; `/articles/deploy-guide-1` → soft-404 | **Confirmed exactly** |
| **QA-6** | `npm run dev` then `npm run test:e2e` | `Another next dev server is already running.` — E2E aborted | **Confirmed exactly** |
| Responsive | `responsive-matrix.cjs` + 360px probe | 0 px horizontal overflow at 360/768/834/1024/1280/1440; sidebar ≥1024; TOC ≥1280 | Yes |
| Tech currency (live search) | see below | `next` 16.3.4 vs **16.3.5** latest; `zod` 4.6.2 vs **4.6.5** latest; `eslint` 9.39.5 vs **10.10.0** latest; `drizzle-orm` 0.45.2 = latest | Yes (reviewer's figures were current at its review date) |

**Live version searches (required by evaluation protocol):** Next.js latest stable = **16.3.5** ([npm](https://www.npmjs.com/package/next)); Zod latest = **4.6.5** ([npm](https://www.npmjs.com/package/zod)); ESLint latest = **10.10.0** ([npm](https://www.npmjs.com/package/eslint), [v10 release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)); drizzle-orm latest = **0.45.2** ([npm](https://www.npmjs.com/package/drizzle-orm)). The reviewer's §7 tech-currency verdict ("Mostly", three documented drifts) is factually correct.

### Defect found by the evaluator and NOT reported by the reviewer

**EV-1 — Raw Markdown syntax leaks into search-result snippets.** On `/search?q=deploy`, the
rendered snippets read `## Overview This runbook covers a standard production deploy…` and
`…filed. ## Notes…`. The list-view `excerpt` field is stripped of Markdown (`/api/articles`
returns `"Overview This runbook covers…"`), but the FTS5 `snippet()` output is emitted
unstripped. `design-spec.md:258` illustrates the snippet as prose (`…Run the ▓deploy▓ script
with the production flag…`), so this is a spec deviation on the app's primary surface for a
search-first product. Severity: minor-to-major cosmetic/content defect; not critical (no flow
blocked). Not listed in the QA report's defect log or spec-drift table.

### Coverage gaps in the QA report itself

- **No performance verification.** The report contains no measured latency, throughput, or
  bundle figure of its own. The only performance reference (line 597) questions which dataset
  the developer's numbers came from. `architecture.md` §13.1 budgets were not re-checked.
- **No 100-concurrent-user risk analysis.** The brief's stated technical goal ("roughly 100
  concurrent users") is not evaluated. SQLite single-writer behaviour, connection handling,
  and scale risk are not discussed. The only production risk stated is the no-auth deployment
  bound (§10, condition 4).
- **Required output template not followed.** `docs/qa-report.md` uses its own structure; the
  spec's `REVIEWER REPORT v2` block (MVP FLOWS PASS/FAIL, TESTS, CODE SIGNALS Y/N, DEFECTS,
  SPEC DRIFT, RELEASE RECOMMENDATION, **BENCHMARK VERDICT**, **SCORE**, NEXT STEPS) is absent.
  Every field except BENCHMARK VERDICT and SCORE has an equivalent section elsewhere in the
  document.

---

## Section 1 — Verification Completeness (50 pts)

| Area | Score | Justification |
|---|---|---|
| MVP Flows | **5** | 17 enumerated flows (F1.1–NFR.4) covering browse, detail, search, create, edit, conflict, archive, category, status, plus success/empty/validation/error states. The report distinguishes "Verified" (driven live) from "Covered" (asserted by re-run tests), which is calibration rather than overclaim. I independently re-drove browse→detail→search→edit and reproduced every result. |
| Local Setup | **5** | §2 walks the README "First run" block step by step with observed output for `.nvmrc`, `npm install`, `.env.local`, `db:reset`, `db:setup`, `dev`, `db:check`, `build`, `test:e2e`, and states "no undocumented manual intervention was required." It additionally found two setup-documentation gaps (QA-6, README category count), both of which I reproduced. |
| Automated Tests | **5** | Re-ran `test:run` (492/492), `test:coverage` (95.46% lines, thresholds enforced), and `test:e2e` (28/28) and mapped measured coverage against the layer targets in `architecture.md` §11.1. §3.4 enumerates specific untested paths by file and line. Coverage ≥80% and critical E2E pass — anchor-5 conditions met and independently reproduced. |
| Responsiveness | **5** | §4 measures all six `design-spec.md` §6.2 widths for horizontal overflow, sidebar visibility, hamburger presence, TOC visibility and chip wrapping, and adds a coarse-pointer touch-target measurement that the project's own script cannot perform. My intersection probe reproduced the 32px effective chip height. |
| Error Handling | **5** | §5 tabulates 14 distinct failure conditions (404, soft-404, 422 field errors, 200k-char body, 409 stale version, 409 duplicate, 415, 403 cross-origin, 400 malformed JSON, guarded test endpoint, empty `q`, FTS injection) with expected vs observed. All 14 reproduced on my run. |
| Performance | **1** | No performance measurement was performed. The report has no timing, TTFB, LCP, or bundle figure of its own and does not re-verify any `architecture.md` §13.1 budget. Anchor 1 ("Not measured") applies; anchor 3 requires "basic timing," which is absent. |
| Spec Adherence | **5** | §6 checks layering enforcement, D25/D26 seams, FTS5 design (bm25 weights, sentinels, trigger form), the 7-route map, 8 API endpoints, schema column fidelity, security posture, and token rules; §9 is a 15-row spec-drift table that separates previously-recorded deviations (with IDs) from new ones. I spot-verified the CSP/security headers, the route map, and the pinned dependency set. |
| Defects Logged | **5** | Six defects, each with severity, component, spec citation, executable reproduction, captured observed output, root cause, and suggested fix; §11 ranks fixes P0→P3 with effort and risk, plus an explicit "not recommended" list. QA-1, QA-2, QA-5 and QA-6 reproduced verbatim. |

**Subtotal:** 5 + 5 + 5 + 5 + 5 + 1 + 5 + 5 = **36 / 40**
**Scaling:** 36 ÷ 40 × 50 = 0.9 × 50 = **45.0 / 50**

---

## Section 2 — Assessment Quality (50 pts)

| Criterion | Score | Justification |
|---|---|---|
| Defect Accuracy | **4** | Zero false positives: QA-1, QA-2, QA-5 and QA-6 reproduced exactly, including QA-1's root cause (`intent` written by the form, never read by `createArticle()`) and QA-2's clipping mechanism. The report also performs a genuine false-negative check by auditing why the project's own `responsive-matrix.cjs` could not detect QA-2. One user-visible defect was missed (EV-1, raw Markdown in search snippets) on a P0 surface. No critical defect missed. |
| Release Rec | **5** | "Ship with conditions" with six evidence-cited reasons for, four named conditions, and explicit "why not No-Ship" / "why not unconditional Ship" reasoning. The call is correct against my findings: all three required flows verified working, no critical defect, two narrow non-blocking defects. |
| Gap Analysis | **5** | §11 is a prioritized fix list (P0 blocking conditions → P1 baseline integrity → P2 cleanups → P3 quality) with per-item effort and risk, each mapped to a defect ID, plus two explicitly de-scoped items with justification. |
| Benchmark Signal | **3** | No explicit "Can it do it? Y / N / Partial" verdict exists; the spec's required BENCHMARK VERDICT field is absent. The executive summary's "a genuinely working, well-engineered MVP" and §10's evidence list constitute a basic capability judgment, satisfying anchor 3 but not anchor 5's "clear capability verdict." |
| Evidence | **4** | Command transcripts with exit codes, full coverage tables, 14-row HTTP status table, raw Playwright probe output (including the DOM ancestor chain for QA-2), a 6-width responsive matrix, and an appendix listing every command run. No screenshots were captured by the reviewer; the only screenshot reference (line 73) points to developer-committed images. Anchor 5 requires logs + tests + screenshots. |
| Risk Assessment | **2** | The no-auth internal-network-only bound is stated as a hard operational production risk (§7 signal 2, §10 condition 4), which is a real production-risk note. However the brief's ~100-concurrent-user target is not assessed anywhere, and no scale risk (SQLite single-writer serialization, connection/WAL behaviour, dataset growth) is discussed. Anchor 3 ("notes scale risks") is not met; scored above anchor 1 ("blind") because a concrete production risk is identified and bounded. |
| Code Signals | **5** | All six signals verdicted with concrete evidence: lint output, grep counts for `dangerouslySetInnerHTML` / `rehype-raw` / `sql.raw`, mutation-guard inventory, `npm audit` result, a 117-file modularity survey that identifies `article-form.tsx` (727 lines) as the one god-component, architecture conformance, `I1`–`I8` planner fidelity, and a version-by-version currency comparison. I reproduced the lint result and confirmed the version claims against live registry data. |

**Subtotal:** 4 + 5 + 5 + 3 + 4 + 2 + 5 = **28 / 35**
**Scaling:** 28 ÷ 35 × 50 = 0.8 × 50 = **40.0 / 50**

---

## Pass/Fail Gates

| Gate | Result | Reason |
|---|---|---|
| MVP passes objective checklist (flows work, tests pass) | **PASSED** | Browse, search, and edit independently re-driven in Chromium; edit persists across a full page reload with a new revision. 492/492 unit and 28/28 E2E reproduced. |
| Defect list complete (no missed criticals) | **PASSED** | No critical defect exists or was missed. One non-critical defect (EV-1) was missed; the gate is scoped to criticals. |
| Clear ship/no-ship with rationale | **PASSED** | §10 gives "Ship with conditions" with enumerated evidence and four named conditions. |
| Evidence attached (screenshots, test logs) | **PASSED** | Extensive command transcripts, test/coverage output, HTTP tables and raw browser probe output; committed screenshots referenced. |
| Code signals reviewed (all 6 checked) | **PASSED** | §7 verdicts all six signals with cited evidence. |

**Gates: 5 / 5 PASSED.**

---

## Reviewer Worksheet

```
Reviewer Score Sheet                        Run ID: evals_sep2026_deepseek-flash-4.1

SECTION 1 — VERIFICATION (50 pts)
  MVP Flows:    [5]   17 flows, states + edge cases; browse/search/edit re-driven and reproduced
  Local Setup:  [5]   README first-run walked step by step; 2 setup-doc gaps found (QA-6 reproduced)
  Auto Tests:   [5]   492/492, 28/28, coverage 95.46% lines — all reproduced to the decimal
  Responsive:   [5]   6 widths, 0px overflow everywhere; coarse-pointer touch measurement found QA-2
  Error Hdlg:   [5]   14 failure conditions tabulated; all 14 reproduced
  Performance:  [1]   No measurement of any kind; §13.1 budgets not re-verified
  Adherence:    [5]   Conformance audit + 15-row spec-drift table separating recorded vs new
  Defects Log:  [5]   6 defects with severity, repro, observed output, root cause, fix
  Subtotal:     36 /40  Scaled: 36/40 x 50 = 45.0 /50

SECTION 2 — ASSESSMENT (50 pts)
  Defect Accuracy:  [4]   0 false positives; QA-1/2/5/6 reproduced exactly; missed EV-1 (non-critical)
  Release Rec:      [5]   Evidence-driven "Ship with conditions"; correct against evaluator findings
  Gap Analysis:     [5]   P0-P3 prioritized fix list with effort/risk + explicit non-recommendations
  Benchmark Signal: [3]   Implicit capability judgment only; no explicit Y/N/Partial verdict
  Evidence:         [4]   Logs + tests + raw probe output; no reviewer-captured screenshots
  Risk Assessment:  [2]   No-auth prod bound stated; 100-concurrent-user target and scale risk absent
  Code Signals:     [5]   All 6 verdicted with grep/lint/audit/version evidence; god-component named
  Subtotal:         28 /35  Scaled: 28/35 x 50 = 40.0 /50

TOTAL:      85 /100
PASS/FAIL:  [ PASS ]   (threshold >= 75)

GATES:
  [X] Flows   [X] Defects   [X] Rec   [X] Evidence   [X] Code

AUDIT:
  Defects found: 0 critical   2 major (QA-1, QA-2)   4 minor (QA-3, QA-4, QA-5, QA-6)
  Evaluator-found, unreported: 1 (EV-1, raw Markdown in search snippets)
  Ship verdict correct? [ Y ]
  Calibration notes:
    - Reviewer claims are reproducible. Every numeric claim checked (coverage percentages,
      test counts, HTTP status codes, chip pixel measurements, script FAIL lines) matched
      on an independent run. No overclaim detected in either direction.
    - The report's Verified/Covered labelling is honest: items marked "Covered" (command
      palette, dark mode, undo/restore) were indeed not browser-driven.
    - Two systematic omissions drive the score loss: performance was not measured at all,
      and the brief's ~100-concurrent-user technical goal was never assessed.
    - The spec's required REVIEWER REPORT v2 output template was not used. Content coverage
      is otherwise near-complete; only BENCHMARK VERDICT and SCORE have no equivalent.
```

---

## Final Verdict

**TOTAL SCORE: 85 / 100 — PASS** (threshold ≥ 75).

The Reviewer phase produced a reproducible, evidence-dense QA report with zero false-positive
defects and a correct, well-conditioned release recommendation. Score loss is concentrated in
three measurable omissions: no performance verification, no assessment of the brief's
100-concurrent-user goal, and no explicit benchmark capability verdict. One non-critical,
user-visible defect (raw Markdown in search snippets) went unreported.

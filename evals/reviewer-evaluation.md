# Reviewer Phase Evaluation

**Artifact under evaluation**: `docs/qa-report.md` (commit `7bca070` "QA run")
**Spec applied**: `evals/reviewer-measurement-spec.md`
**Evaluator verification method**: independent execution of `npm run lint`, `npm test`, `npx jest` per-suite, `npx playwright test tests/e2e`, `npm run seed`, `npx prisma migrate deploy`, direct SQLite inspection of `prisma/dev.db`, HTTP status probing, and headless Chromium (Playwright) exploratory testing of `/`, `/articles`, `/articles/[id]`, `/articles/[id]/edit`, `/login`, an invalid article id, and the 768px tablet breakpoint. Live web searches performed for dependency currency.
**Date**: 2026-07-31

---

## Independent Ground-Truth Established

The following facts were verified by the evaluator and form the baseline against which the Reviewer's claims are scored.

| # | Verified fact | Method |
|---|---------------|--------|
| G1 | `/articles/[id]` (article detail page) returns **HTTP 500**. `PrismaClientValidationError` in `src/lib/articles.ts:12` — `src/app/articles/[id]/page.tsx:8` passes `params.id` synchronously; `params` is a Promise in Next.js 16, so `id` is `undefined`. | Playwright navigation; screenshot of Next.js error overlay |
| G2 | `GET /api/search?query=Test` returns **HTTP 500** with an empty body. The `article_fts` virtual table **does not exist** in `prisma/dev.db` (`Error: in prepare, no such table: article_fts`). `scripts/migrate-search.ts` is not part of any Prisma migration and cannot execute (same `@/lib` alias failure as the seed script). It is also structurally invalid: it assigns a UUID string to FTS5 `rowid`, which requires an integer. | `curl -o /dev/null -w %{http_code}`; `sqlite3 prisma/dev.db ".tables"` |
| G3 | **Tailwind CSS is not applied anywhere in the application.** `src/app/layout.tsx` imports `src/app/globals.css`, which contains only 4 lines of plain CSS and no `@import "tailwindcss"` / `@tailwind` directives. `src/styles/globals.css` is a 0-byte file. Rendered pages are entirely unstyled (default serif, no padding, blue underlined links). Served HTML contains 0 occurrences of "tailwind". | Playwright screenshots at 1280px and 768px; `curl` of served HTML; file inspection |
| G4 | **No `/login` route exists.** `src/app/api/auth/[...nextauth]/route.ts` declares `pages: { signIn: '/login' }`, but `src/app/` contains no login page. `/login` returns **HTTP 404**. No authenticated flow is reachable through the UI regardless of seed data. | Playwright navigation; `find src/app -type f` |
| G5 | The edit page never renders. It fetches `/api/articles/undefined` (same Promise-params bug), receives 404, and returns early without clearing `loading`, so the page is permanently stuck on "Loading…". No form fields render. | Playwright: `NO TITLE INPUT (edit form did not render)`; HTTP 404 on `/api/articles/undefined` |
| G6 | `npm run lint` **fails**: `sh: eslint: command not found`. ESLint is not a declared dependency and is not installed. | direct execution |
| G7 | `npm test` — 2 of 6 unit suites **pass** (`tests/unit/search.test.ts`, `tests/unit/api/articles.test.ts`, 1 test each). 4 fail: `ArticleCard`, `StatusToggle` (suite failed to run), `SearchBox` (assertion failure), `TagSelect` (hard Node crash, `fetch is not defined`). Aggregate run aborts; no coverage report is produced. | per-suite `npx jest` execution |
| G8 | `npm run test:e2e` is **not runnable as configured** — no `playwright.config.*` exists, so Playwright collects the Jest unit tests and errors. Scoped to `tests/e2e`: **4 failed, 1 passed**. | direct execution |
| G9 | `npm run seed` fails: `ERR_MODULE_NOT_FOUND` — `@/lib/prisma` alias unresolved under `ts-node`. | direct execution |
| G10 | `/` (home) is still the unimplemented scaffold: "This is the initial scaffold. Implement features in later iterations." No navigation to `/articles` exists anywhere in the app. | Playwright; `grep -rniE "hamburger\|drawer\|<nav\|sidebar" src/` → no matches |
| G11 | Invalid article id (`/articles/does-not-exist`) returns **HTTP 500**, not a 404/not-found state. | Playwright |
| G12 | Article content is rendered via `dangerouslySetInnerHTML` from `remark-html` without a sanitizer; `src/middleware.ts` sets `Access-Control-Allow-Origin: *` on all `/api/*` routes. | source inspection |
| G13 | Dependency currency (live web search, July 2026): `@prisma/client`/`prisma` **^5.0.0** vs latest stable **7.9.1 / 7.9.0**; `zod` **^3.23.8** vs latest **4.4.3**; `jest` **^29.7.0** vs latest **30.4.2**; `next-auth` **^4.24.15** is the legacy line (Auth.js v5 ships as `next-auth@beta`). Current: `next` 16.2.12, `react` 19.2.8, `tailwindcss` 4.3.3. | WebSearch |
| G14 | The search input produces no observable effect. `src/app/articles/page.tsx:20` falls back to `allArticles` whenever results are empty, so the 500 is silently swallowed and no empty state can ever appear. | Playwright: list content identical before and after typing "Test" |

---

## Section 1 — Verification Completeness (50 pts)

### MVP Flows — 2/5
Verification was conducted almost exclusively via `curl` against API endpoints. Two of four flow verdicts are factually wrong: "Article Detail ✅ Pass" (G1: the page 500s) and "Search ✅ Pass (empty result)" (G2: the endpoint 500s; the FTS table does not exist). Browse (Pass) and Edit (Fail) verdicts are correct, though the Edit failure is attributed to the auth block rather than the actual Promise-params defect (G5). No client-side rendering, interactivity, or state was verified.

### Local Setup — 4/5
`npm ci`, `npx prisma migrate deploy`, `npm run dev`, and endpoint reachability were each executed and reported with per-step results (§2). The broken seed script was correctly identified with the exact error (G9). Deduction: `npm run lint` is reported as passing (§7) when the binary is not installed (G6).

### Automated Tests — 2/5
Unit tests were run and reported as failing, which is directionally correct, but "0 % (no tests executed)" is inaccurate — 2 suites and 2 tests pass (G7). E2E was **not executed at all** ("Playwright not run"), despite brief v2 placing basic E2E for browse→search→edit inside MVP scope; the suite is runnable when scoped and yields 4 failed / 1 passed (G8). No coverage report was produced or attempted.

### Responsiveness — 1/5
§4 asserts a two-column desktop grid, a working tablet "navigation drawer", a mobile "hamburger menu", and "touch targets ≥ 44 dp", and grades the area ✅ Pass. None of these exist: no navigation component is present in the codebase (G10) and no CSS framework is active (G3). Rendered output at 1280px and 768px is unstyled default-agent HTML. The claim is unsupported by the artifact.

### Error Handling — 2/5
Three scenarios were checked and two are correctly marked unverified (validation, server errors), which is honest. However "Search with no results → UI displays 'no results' message ✅" is false on both counts (G2, G14), the missing-article path returns 500 rather than a not-found state (G11), and no 500-class error was detected anywhere despite three distinct 500s being reachable in the primary flows.

### Performance — 1/5
The report contains no performance section. List load time, search latency, and thresholds are not measured or mentioned.

### Spec Adherence — 2/5
A spec-conformance table exists (§6) and is honest on markdown editing, authentication, and testing scope. Four of eight rows are wrong: "Full-text search ✅" (G2), "Responsive layout ✅" and "Design tokens & UI ✅ … color contrast, ARIA attributes present" (G3), and "Dependency versions (latest) ✅" (G13). The Architect spec's FTS5 search layer is absent from the database, so architectural conformance was not actually checked.

### Defects Logged — 3/5
§8 provides a severity-tiered table with concrete reproduction commands and exact error strings, and §10 gives an ordered fix list — structurally the strongest part of the report. Score capped at 3 because coverage is incomplete: 6 defects logged against ≥5 unlogged criticals/majors (G1, G2, G3, G4, G10). Accuracy is penalized separately under Defect Accuracy.

**Subtotal**: 2 + 4 + 2 + 1 + 2 + 1 + 2 + 3 = **17 / 40**
**Scaling**: 17 ÷ 40 × 50 = 21.25 → **21.3 / 50**

---

## Section 2 — Assessment Quality (50 pts)

### Defect Accuracy — 1/5
Five critical defects were missed, three of them in the two flows the report grades as passing: article detail page 500 (G1), search endpoint 500 with no FTS table (G2), Tailwind never applied so the entire UI is unstyled (G3), no `/login` route despite auth being configured to require one (G4), and home page still scaffold with no navigation (G10). Anchor 1 ("Missed criticals") applies directly. No false-negative check was performed.

### Release Rec — 4/5
**NO-SHIP** is the correct verdict, stated unambiguously with a four-point rationale tied to observed failures (§10). Deduction: the rationale rests on the seed/test/auth blockers only, so the decision is correct while the supporting data set is materially incomplete.

### Gap Analysis — 3/5
Seven prioritized next steps in sensible dependency order (fix seed → verify login → enable writes → repair tests → coverage → audit → integration tests), with an explicit re-evaluation condition. Capped at 3 because executing the entire list would not yield a working app: detail rendering, search, styling, and the missing login route are absent from the plan.

### Benchmark Signal — 1/5
The spec's required output template mandates a `BENCHMARK VERDICT: [ Y / N / Partial ] — Can it do it? Because:` line. No benchmark verdict, capability judgment, or Run ID appears anywhere in the report. The assessment stops at a release recommendation.

### Evidence — 2/5
Evidence is real but text-only and partly unsupported. Verifiable artifacts cited: exact error strings (`ReferenceError: ntest is not defined`, `fetch is not defined`, `Cannot find package '@/lib'`), the `npm audit` high-severity count, and specific curl invocations. Absent: screenshots (§4 claims "manual inspection via browser" with no capture), attached test logs, coverage output. Two evidentiary claims are contradicted by re-execution (G3, G6), which the spec's Evidence criterion cannot credit.

### Risk Assessment — 1/5
No assessment of the brief's 100-concurrent-user target, SQLite single-writer contention, or production/deployment risk appears anywhere. The only risk-adjacent statement is a Minor-severity note on npm vulnerabilities, itself dismissed in §2 as "not blocking".

### Code Signals — 1/5
All six checklist rows are present, but four verdicts are wrong: Linting ✅ (G6 — eslint not installed), Security ✅ (G12 — unsanitized `dangerouslySetInnerHTML` on user-supplied article content plus wildcard CORS on all API routes), Architecture match ✅ (G2 — the specified FTS5 search layer does not exist), Tech currency ✅ "checked via live web" (G13 — Prisma two majors behind, Zod one major behind, Jest one major behind, next-auth on the legacy line). Modularity ✅ and Planner fidelity ✅ are defensible. Anchor 1 applies: major smells present and undetected.

**Subtotal**: 1 + 4 + 3 + 1 + 2 + 1 + 1 = **13 / 35**
**Scaling**: 13 ÷ 35 × 50 = 18.571 → **18.6 / 50**

---

## Pass/Fail Gates

| Gate | Result | Reason |
|------|--------|--------|
| MVP passes objective checklist (flows work, tests pass) | **FAILED** | Detail page and search both return HTTP 500 (G1, G2); edit form never renders (G5); 4 of 6 unit suites and 4 of 5 E2E specs fail (G7, G8). Two of these failures are recorded as PASS in the report. |
| Defect list complete (no missed criticals) | **FAILED** | Five criticals unlogged (G1–G4, G10). |
| Clear ship/no-ship with rationale | **PASSED** | §10 states NO-SHIP with an explicit four-point rationale and re-evaluation condition. |
| Evidence attached (screenshots, test logs) | **FAILED** | No screenshots, no attached logs, no coverage report; §4's browser inspection is asserted without capture and is contradicted on re-execution. |
| Code signals reviewed (all 6 checked) | **PASSED** | All six signals present in §7 with verdicts and comments. Accuracy penalized under Section 2, not this gate. |

**Gates passed: 2 / 5** (all five required)

---

## Reviewer Worksheet

```
Reviewer Score Sheet                        Run ID: mercury2-reviewer-2026-07-31

SECTION 1 — VERIFICATION (50 pts)
  MVP Flows:    2   curl-only; detail + search 500s both graded PASS; no client-side verification
  Local Setup:  4   npm ci / migrate / dev / seed all executed with real errors; lint claim false
  Auto Tests:   2   unit run but "0%" wrong (2 suites pass); E2E never executed; no coverage
  Responsive:   1   grid / drawer / hamburger / 44dp all asserted; no CSS active, no nav in repo
  Error Hdlg:   2   401 + empty-list checked; three reachable 500s undetected; no-results claim false
  Performance:  1   no performance section present
  Adherence:    2   table present; 4 of 8 rows wrong (search, responsive, tokens, versions)
  Defects Log:  3   severity tiers + repro commands + ordered fixes; >=5 criticals absent
  Subtotal:     17 /40  Scaled: 21.3 /50   (17 / 40 x 50 = 21.25)

SECTION 2 — ASSESSMENT (50 pts)
  Defect Accuracy:  1   5 missed criticals; no false-negative check
  Release Rec:      4   NO-SHIP correct, rationale explicit, evidence set incomplete
  Gap Analysis:     3   7 prioritized steps; would not produce a working app
  Benchmark Signal: 1   no "can it do it?" verdict; no Run ID
  Evidence:         2   error strings + commands cited; no screenshots/logs; 2 claims contradicted
  Risk Assessment:  1   no 100-user, SQLite contention, or prod risk analysis
  Code Signals:     1   all 6 checked; 4 verdicts wrong (lint, security, arch match, currency)
  Subtotal:         13 /35  Scaled: 18.6 /50   (13 / 35 x 50 = 18.571)

TOTAL:      39.9 /100
PASS/FAIL:  [ FAIL ]   (threshold 75)

GATES:
  [FAIL] Flows   [FAIL] Defects   [PASS] Rec   [FAIL] Evidence   [PASS] Code

AUDIT:
  Defects found by Reviewer:   2 critical   2 major   2 minor
  Defects found by evaluator but unlogged: 5 critical (detail-page 500, search 500 /
    missing FTS table, Tailwind never applied, no /login route, home page still
    scaffold with no navigation), 2 major (no playwright.config so test:e2e
    unrunnable, invalid id returns 500 instead of not-found), 2 minor (unsanitized
    dangerouslySetInnerHTML, wildcard CORS on all /api routes)
  Ship verdict correct? [ Y ]  — NO-SHIP is right; the app is further from shippable
    than the report indicates
  Calibration notes:
    - Dominant failure mode is verification method, not reporting discipline. The
      report's structure (10 sections, severity tiers, repro commands, ordered fix
      list, spec-drift log) is close to spec-compliant; the inputs feeding it are not.
    - curl-based verification is the proximate cause of every missed critical. All
      three unlogged 500s and the total absence of CSS are invisible to an HTTP
      status/body check and immediately visible in a browser.
    - Two claims are affirmatively contradicted by re-execution: "npm run lint passes"
      (eslint not installed) and section 4's breakpoint/drawer/touch-target findings
      (no CSS active, no nav component in the repo). Section 4 states "manual
      inspection (via browser)"; its content cannot have come from one.
    - "Dependency versions current — checked via live web" cites React 19 / Next 16 /
      Tailwind 4, which are current, and generalizes to "all major deps". Prisma
      (5 vs 7.9.1), Zod (3.23 vs 4.4.3), Jest (29 vs 30.4.2), and next-auth (v4
      legacy) were not checked.
    - Reporting inconsistency: search is graded PASS in section 1 while section 9
      records it as unintentional drift ("FTS5 query does not match"). The drift log
      identified a symptom the flow table then cleared as passing, and the assigned
      root cause (insert-ordering) is wrong — the FTS table was never created.
    - Missing template sections: BENCHMARK VERDICT, Run ID, coverage percentage.
    - Process hygiene: the QA commit adds cookie.txt (a curl cookie jar) to version
      control and modifies package.json, mixing remediation into a review-only phase.
```

---

## Final Verdict

**TOTAL SCORE: 39.9 / 100 — FAIL** (threshold ≥ 75; 2 of 5 required gates passed)

The Reviewer produced a well-structured report with correct reporting mechanics and the correct ship decision, but verified the application through `curl` rather than a browser. That single methodological choice invalidated the majority of its findings: three HTTP 500s in the required MVP flows and the complete absence of applied CSS went undetected, two failing flows were graded PASS, and two sections contain claims contradicted by re-execution.

# Reviewer Evaluation

**Run ID:** `evals_june2026_grok_4.5` / QA report dated 2026-07-17 / evaluated 2026-07-30
**Artifact under evaluation:** `docs/qa-report.md`
**Spec applied:** `evals/reviewer-measurement-spec.md`
**Independent verification method:** re-ran `npm test`, `npm run lint`, `npm run build`, `CI=1 npm run test:e2e`; started `npm run dev`; executed 27 scripted Playwright Chromium checks (1280 / 768 / 390 px) against the live app; inspected `src/**`, `prisma/dev.db` runtime pragmas, `npm audit`, and live npm registry / vendor advisory data for version currency.

---

## Independent verification log (evaluator, not the Reviewer)

| Evaluator check | Result | Observation |
|---|---|---|
| `npm test` | PASS | 42 tests / 7 files, 1.02 s — matches report §3.1 |
| `npm run lint` | PASS | exit 0, no output — matches report |
| `npm run build` | PASS | compiled 5.4 s; Turbopack NFT warning listing `next.config.ts → src/lib/db.ts → src/lib/fts.ts → src/app/api/search/route.ts` — reproduces D2 |
| `CI=1 npm run test:e2e` | PASS | 5 passed (14.0 s); `[tiptap warn]: Duplicate extension names found: ['link']` emitted — reproduces D1 |
| Browse list | PASS | `h1="Articles"`, 8 published rows, 970 ms first load (dev) |
| Drafts hidden by default | PASS | seed drafts absent from default list; `?status=DRAFT` returns them |
| List → detail navigation | PASS | `getByRole('link', /how we deploy/i)` → `/articles/how-we-deploy`, H1 renders |
| Typeahead search | PASS | 3 listbox options for `onboarding` after debounce; `/api/search` returns JSON |
| Full search page | PASS | `/search?q=deploy` results in 677 ms; `q=zzzqqq` → "No results" |
| Content-body search | PASS | new published article found by body-only token `wumpusprobe` (FTS synced on write) |
| Create validation | PASS | empty submit → "Title is required" |
| Create → edit → delete | PASS | published create redirects to detail; title edit persists; delete → slug returns 404 |
| 404 unknown slug | PASS | HTTP 404 + "not found" copy |
| Category / tag filters | PASS | `?category=engineering` excludes vacation; unknown category/tag → "No matching articles" |
| Optimistic concurrency | PASS | stale save shows "This article changed since you opened it. Reload…" |
| Responsive 768 px | PASS | `nav[aria-label="Filters"]` visible |
| Responsive 390 px | PASS | stacked selects; no horizontal overflow (`scrollWidth == clientWidth`) |
| Runtime SQLite pragmas | Note | `dev.db` reports `journal_mode=wal`, `foreign_keys=1` despite `applySqlitePragmas()` having zero call sites (`grep` confirms definition only) — D3 is real but lower-impact than filed |
| `npm audit` | Finding | 9 advisories (4 high). Reviewer ran no dependency scan. |
| `prisma/dev.db` state | Finding | Seed article `security-faq` title overwritten with `Conflict Writer 1784323981611`; orphan `qa-draft-1784323987181` present — undisclosed residue from the Reviewer's own QA session |

Version currency (live registry + vendor sources, 2026-07-30): TypeScript latest stable **7.0.2** (GA 2026-07-08); Next.js **16.2.12** (16.2.11 = 2026-07-21 security release, 16.2.12 = 2026-07-25); React **19.2.8**; Prisma **7.9.1**; `@tiptap/react` **3.29.2**; Tailwind **4.3.3**; Playwright **1.62.0**; Zod **4.4.3** and Vitest **4.1.10** are current. Installed: TS 5.9.3, Next 16.2.10, React 19.2.4, Prisma 7.8.0, TipTap 3.27.3, Tailwind 4.3.2, Playwright 1.61.1. The Reviewer's stated "latest" figures (React 19.2.7, TipTap 3.28.0, Tailwind 4.3.3, TS 7.0.2) are consistent with the registry state on 2026-07-17; the Next.js 16.2.11/16.2.12 releases postdate the report and are therefore not chargeable to the Reviewer.

---

```
Reviewer Score Sheet                        Run ID: evals_june2026_grok_4.5 / 2026-07-30

SECTION 1 — VERIFICATION (50 pts)
  MVP Flows:    [5]   Notes: §1 documents 15 flows including draft visibility, filters,
                      typeahead + full search, create/edit/delete, validation, unique-slug,
                      optimistic-concurrency conflict, and 404, plus 33/33 interactive checks.
                      Evaluator independently reproduced 20 of these flows in Chromium with
                      zero contradictions. Meets "Full states + edge."
  Local Setup:  [5]   Notes: §2 walks prerequisites, install, .env, `prisma migrate deploy`,
                      seed (asserting 4 categories / 6 tags / 10 articles), and `npm run dev`,
                      and flags the Node 25.4.0-vs-README-24.x mismatch plus the one-time
                      `npx playwright install` step. "No undocumented hacks" independently
                      confirmed; seed counts match.
  Auto Tests:   [4]   Notes: unit (42), E2E (5), lint, and build all run and all independently
                      reproduced; §3.2/§3.3 map tests to brief requirements and §3.4 enumerates
                      untested paths. Deduction: no coverage measurement of any kind — no
                      coverage tool is installed (`@vitest/coverage-v8` absent, no `coverage`
                      key in `vitest.config.ts`) and the report states no coverage figure, which
                      the anchor for 5 ("Coverage >=80%") and the required output template
                      ("Coverage: __%") both demand.
  Responsive:   [5]   Notes: §4 reports 1280 / 768 / 390 px with element-level evidence
                      (filter-rail visibility, `#mobile-status` selects, ~105 px sticky header).
                      Evaluator confirmed all three breakpoints and absence of horizontal
                      overflow at 390 px.
  Error Hdlg:   [5]   Notes: §5 covers form validation, unique-slug, 404, search-no-results,
                      search API 500 path, conflict banner, delete cancel/failure, global error
                      boundary, and XSS sanitization; code-path-only items are labeled as such
                      rather than claimed as runtime-verified.
  Performance:  [1]   Notes: no performance measurement exists anywhere in the report — no list
                      load time, no search latency, no thresholds. §3.4 defers "load" testing to
                      out-of-scope, but the spec area is list-load and search speed, not load
                      testing. Anchor 1 ("Not measured") applies. Evaluator measurements for
                      reference: home 970 ms, `/search` 677 ms (dev mode, uncached).
  Adherence:    [5]   Notes: §6 checks brief features 1-3, arch/design MVP additions, routes
                      S1-S7, stack, service layout, tokens/copy, backlog iterations 1-6, and
                      testing scope; §9 logs 8 drift items. Evaluator verified SD1 (TS 5.9.3 vs
                      arch 7.0.2), SD2 (React 19.2.4 vs 19.2.7), and SD3/SD4 (absent
                      `actions/categories.ts`, `actions/tags.ts`, `validation/category.ts`) as
                      accurate.
  Defects Log:  [5]   Notes: §8 buckets Critical / Major / Minor, gives D1-D7 with repro steps,
                      evidence, and expected behavior, and §11 converts them to a P0-P3 ordered
                      fix list with rationale. Meets "Prioritized list."
  Subtotal:     35 /40  Scaled: 35 x 1.25 = 43.75 /50

SECTION 2 — ASSESSMENT (50 pts)
  Defect Accuracy:  [4]  All four verifiable defects reproduce exactly as written (D1 TipTap
                         warning in E2E output; D2 NFT warning in build; D3 zero call sites for
                         `applySqlitePragmas`; D4 duplicated `max-w-5xl px-4` in
                         `src/app/search/page.tsx` inside `AppShell.tsx:12`). No critical or
                         major functional defect was missed: 27 independent evaluator checks
                         surfaced none. Deductions: (a) no dependency vulnerability scan was
                         run, and `npm audit` reports 9 advisories, at least one of which
                         (PostCSS XSS, GHSA-qx2v-qp2m-jg93, published 2026-04-20, affecting the
                         transitively installed postcss@8.4.31) predates the report; (b) the
                         Reviewer's own QA mutations were left in `prisma/dev.db` (seed article
                         `security-faq` retitled, orphan QA draft) and not disclosed; (c) no
                         explicit false-negative check, which anchor 5 requires.
  Release Rec:      [5]  "Ship with conditions" is supported by four evidence-based points and
                         split into a hard condition (no public exposure without auth) and soft
                         conditions keyed to release target. Verdict matches the evaluator's
                         independent conclusion on the same evidence.
  Gap Analysis:     [5]  §3.4 tabulates each untested/lightly-tested path with the specific gap,
                         and §11 turns gaps into a prioritized, justified fix list spanning
                         P0 through "Later."
  Benchmark Signal: [3]  The report never states an explicit capability verdict. The spec's
                         required output template line `BENCHMARK VERDICT: [ Y / N / Partial ]`
                         is absent, as are the `CODE SIGNALS` / `TESTS` / `SCORE` blocks and the
                         self-score; the report substitutes its own §1-§12 structure. Judgment
                         is inferable ("MVP is functionally complete") but implicit — anchor 3
                         ("Basic judgment").
  Evidence:         [4]  §12 attaches the command set with results, plus per-flow selector- and
                         copy-level observations and file citations; all reproduced. Deduction:
                         zero screenshots exist despite Playwright Chromium being used (no image
                         artifacts anywhere in the repo), and the "33/33 interactive checks" are
                         summarized as a count rather than enumerated, so that block is not
                         independently auditable.
  Risk Assessment:  [3]  The no-auth security boundary is well characterized and escalated to a
                         hard release condition (P0), and the Node 24-vs-25 runtime risk is
                         noted. However the brief's and architecture's 100-concurrent-user goal
                         is never assessed: architecture §14 stakes that goal on SQLite WAL plus
                         single-writer behavior, yet D3 (WAL/FK pragmas never invoked) is filed
                         Minor with no link to the concurrency target, and no throughput or
                         write-contention reasoning appears. Anchor 3 ("Notes scale risks").
  Code Signals:     [4]  All six signals are answered with substantiated one-liners; the
                         modularity claim is exact (largest UI file `ArticleForm.tsx` = 505 LOC,
                         confirmed by `wc -l`), architecture fidelity and Planner fidelity are
                         checked against named artifacts, and every version-drift figure was
                         accurate for 2026-07-17. Deduction: the security signal reasons only
                         about application code (Zod, HTML allowlist, FTS token sanitize, CSRF)
                         and omits any dependency-level scan, so "secure" is not fully evidenced
                         as anchor 5 requires.
  Subtotal:         28 /35  Scaled: 28 x (50/35) = 28 x 1.428571 = 40.00 /50

TOTAL:      43.75 + 40.00 = 83.75 /100  (83.8)
PASS/FAIL:  [ PASS ]  — threshold >=75/100

GATES:
  [PASS] Flows    — MVP objective checklist independently re-verified: browse, search
                    (title + content, empty/no-result states), and edit all work; 42 unit +
                    5 E2E pass; lint clean; production build succeeds.
  [PASS] Defects  — no missed critical or major defect found by independent testing; the
                    two false negatives identified (missing dependency scan, undisclosed DB
                    residue) are non-critical.
  [PASS] Rec      — explicit "Ship with conditions" with enumerated evidence and a stated
                    no-ship condition for public exposure.
  [PASS] Evidence — with deficiency. Reproducible command logs, test counts, and code
                    citations are attached and were independently confirmed; the gate's
                    parenthetical also names screenshots, and none were produced. Scored as
                    a gate pass on attached-and-verifiable evidence, with the shortfall
                    charged against the Evidence criterion (4/5).
  [PASS] Code     — all six code signals in §7 are explicitly answered Yes/No with
                    justification.

AUDIT:
  Defects found: 0 critical   0 major   7 minor (D1-D7, all minor-severity, 4 independently
                 reproduced; D5/D6/D7 are version-pin and coverage-gap observations)
  Ship verdict correct? [ Y ] — independent testing found no functional blocker for local /
                 trusted-network use, and the no-auth hard condition is the correct gating
                 constraint for any networked deployment.
  Calibration notes:
    - Strongest dimensions: flow breadth, spec-adherence and drift tracing, defect
      prioritization, and refusal to trust Developer claims without re-running commands. Every
      factual claim spot-checked by this evaluation held.
    - Weakest dimensions: performance verification is entirely absent (the single largest score
      loss, -4 of 40 in Section 1); no test-coverage instrumentation; no dependency
      vulnerability scan; no explicit benchmark/capability verdict; 100-user scale risk
      unanalyzed despite being an explicit architecture goal.
    - Format compliance: the report does not follow the spec's "Required Output Template"
      (missing MVP FLOWS / TESTS / CODE SIGNALS / DEFECTS / SPEC DRIFT / BENCHMARK VERDICT /
      SCORE block and the coverage percentage). Content coverage is a superset in most areas,
      so this was penalized only where the template maps to a scored criterion
      (Benchmark Signal, Auto Tests) rather than as a separate deduction.
    - QA hygiene: mutating seeded data during interactive QA and leaving it in `prisma/dev.db`
      without disclosure weakens reproducibility of the report's own seed-count assertions.
      Evaluator restored only the record it modified itself (`how-we-deploy` title, in both
      `Article` and `articles_fts`) and left the Reviewer's residue in place as evidence.
```

---

## Sources (live version verification)

- [Announcing TypeScript 7.0 — Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Speedier type checks in TypeScript 7.0 as first stable Go release ships — The Register](https://www.theregister.com/devops/2026/07/09/speedier-type-checks-in-typescript-70-as-first-stable-go-release-ships/5268828)
- [July 2026 Security Release — Next.js](https://nextjs.org/blog/july-2026-security-release)
- [Next.js — endoflife.date](https://endoflife.date/nextjs)
- [GHSA-qx2v-qp2m-jg93 — PostCSS XSS via unescaped `</style>`](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- [GHSA-f88m-g3jw-g9cj — sharp inherited libvips vulnerabilities](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)
- npm registry `npm view <pkg> version` for next, react, prisma, typescript, @tiptap/react, tailwindcss, zod, @playwright/test, vitest (queried 2026-07-30)

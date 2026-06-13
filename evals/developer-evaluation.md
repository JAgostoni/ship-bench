# Developer Phase Evaluation — Team KB v1

**Run ID:** evals_jun10_fable @ commit `0e7cc28` (iteration 6, post-hoc)
**Evaluated:** 2026-06-13
**Spec:** `evals/developer-measurement-spec.md`
**Method:** Independent reproduction — ran `npm test` (unit), `npm run build`, `npm run test:e2e`, and an independent headless-Chromium (Playwright) exploratory pass against a production `npm start` server on a freshly seeded database (`DATABASE_PATH=data/kb-eval.sqlite`, port 3100). Dependency currency verified by live web search.

---

## Evidence gathered

| Source | Result |
|---|---|
| `npm test` (Vitest 4.1.8) | **59/59 unit tests pass**, 7 files (~21 s). Reproduced. |
| `npm run build` (Next 16.2.7) | Compiles; 6 routes emitted (dynamic content routes + static `/articles/new`, `/_not-found`). One **benign Turbopack NFT warning** via `src/lib/db/client.ts` (documented, DEF-3). |
| `npm run test:e2e` (Playwright 1.60.0) | **8/8 E2E pass** (1 worker, Chromium, ~34 s): api, create-empty, delete, journey, 2× not-found, validation. Reproduced. |
| Independent browser exploration (headless Chromium, production server) | **All MVP flows verified live**, see below. |
| Git history | 6 implementation commits (`c63140d`…`0e7cc28`) map 1:1 to the 6 backlog iterations. |

### Independent exploratory-browser results (production server, real Chromium)

- **Browse:** home renders 12 seeded cards in a 2-column grid (computed `grid-template-columns: 518px 518px` at 1280px); "12 articles" badge present; card click navigates to `/articles/{id}`; detail shows article `h1`, "← All articles" link, Edit link + Delete button, rendered Markdown body.
- **Search:** header combobox returns 4 options for "deploy" with `<mark>`-highlighted snippets and a "See all results" footer; `ArrowDown` sets `aria-activedescendant`; `/search?q=deploy` full page lists rows with highlights; `q=zzqqxyzznomatch` shows the no-results empty state; blank `q` shows the instruction state.
- **Create:** empty submit surfaces "Title is required" + "Content is required"; live preview renders typed Markdown heading; save navigates to the new article's detail page.
- **Edit:** Edit → change title → save returns to detail with the updated title; `/search` (FTS) immediately finds the edited title (update trigger fires).
- **Delete:** Delete opens an `alertdialog`; confirm redirects to `/`; the article is gone from the list.
- **Dirty guard:** Cancel on a dirty editor opens the "Discard changes?" dialog.
- **404:** `/articles/9999999` returns **HTTP 404** with the "Article not found" empty state.
- **Responsive:** 2-col at 1280px, 1-col at 800px and 375px; mobile home renders HTTP 200 without breakage.

---

## Section 1: Functionality Completeness (50 pts)

| # | Flow | Score | Justification (evidence) |
|---|---|---|---|
| 1 | Browse | **5** | List renders all seeded articles (newest-updated first) and detail loads full Markdown via card click — verified live. Pagination is intentionally absent (design §1.3 / §10: small corpus, brief mandates no pagination), so its omission is per-spec and not a deduction; list+detail are complete and robust. |
| 2 | Search | **5** | SQLite FTS5 across title+content; verified live across both surfaces (dropdown + full page) with `<mark>` highlights, bm25 title weighting, no-results state, blank-query instruction state, and keyboard combobox. "Full-text w/ states." |
| 3 | Edit | **5** | Validated CRUD: create/edit/delete all functional with shared Zod validation client+server, dirty-discard guard, save→detail. Verified live and by E2E. |
| 4 | Integration | **5** | RSC-direct reads + REST writes + DB; FTS triggers keep the index consistent (edit→search-finds, delete→search-loses verified live). Full E2E flows. |
| 5 | Local Run | **5** | `npm run db:seed` → `npm run dev` (migrations auto-apply on boot); `npm run build && npm start` reproduced first-try on this machine. README is accurate. Effectively one-command local. |
| 6 | States | **5** | All MVP states present: 3 empty states (no articles, no results, 404), field validation, network-error banner, search error/no-match rows. Verified live + by code. |
| 7 | Responsiveness | **5** | Fluid: 2-col→1-col grid, editor split-pane→tabs, header collapse; verified at 1280/800/375px (computed styles). |
| 8 | Automated Tests | **4** | E2E critical journey **plus** secondary specs present and green (8/8), and 59 unit tests cover repo CRUD, FTS, sanitizer, Zod, snippet parser, time, DB singleton, and the `ArticleEditor` component. Held below 5 because **no coverage tooling is configured** (≥80% cannot be certified) and some error paths (search error row, body-cap 400, `beforeunload`) have no automated test (QA §3). |

**Section 1 raw:** 5+5+5+5+5+5+5+4 = **39 / 40**
**Math:** 39 × 1.25 = **48.75 / 50**

---

## Section 2: Implementation Quality (50 pts)

| # | Criterion | Score | Justification (evidence) |
|---|---|---|---|
| 1 | Chunk Discipline | **5** | 6 commits = 6 backlog iterations, 1:1, no scope creep (no tags/status/toasts/pagination snuck in); the 3 mid-flight deviations were logged at the time (backlog #10–12). Sticks to assigned chunks. |
| 2 | Code Quality | **5** | TypeScript strict mode; strict layering enforced (`repo/articles.ts` is the only DB-touching module; routes do HTTP concerns only; one shared Zod schema). Small, modular files; six UI primitives as specified; largest file `ArticleEditor.tsx` ~500 lines, cohesive. Clean, modular, typed. |
| 3 | Tech Currency | **5** | **Live-search verified (2026-06-13):** drizzle-orm 0.45.2 = current stable (1.0 still beta), zod 4.4.3 = latest, Playwright 1.60.0 = latest, Vitest 4.1.8 current; Next 16.2.7 vs latest 16.2.9, React 19.2.4 vs 19.2.7, Tailwind 4.3.0 vs 4.3.1 — all on the latest major.minor, trailing ≤3 patch releases that shipped after the architecture's pin date. Latest-patch tier; trivial drift noted (DEF-4). |
| 4 | Error Handling | **4** | Structured error envelope (`{error:{code,message,fieldErrors}}`), field-error mapping, network-error banner with intact input, `console.error` server logging, sanitized hostile search input (never 500s). Held at 4 for **DEF-1**: multi-byte content over the 100 KB byte cap but under the 100k-char limit falls through to the generic banner with no recoverable retry path — a real (if extreme-edge) error-handling gap. |
| 5 | Iteration Logs | **5** | Six `docs/iteration-N-summary.md` files + backlog decisions log (§5, incl. implementation-time addenda) + per-iteration decision logs. Chunk-complete + decisions. |
| 6 | Verification | **5** | `docs/verification.md` and `docs/qa-report.md` document commands, results, QA sweep, and known gaps; tests pass + manual QA. Independently reproduced (59/59 unit, 8/8 E2E, live probing). |
| 7 | UX Adherence | **5** | `globals.css` reproduces the design-spec tokens; verbatim copy ("New article", "Save article", empty-state strings); all designed states implemented; layout matches §1.3 wireframes (grid, split-pane/tabs editor, sticky header). Verified live. Faithful implementation. |

**Section 2 raw:** 5+5+5+4+5+5+5 = **34 / 35**
**Math:** 34 × 1.43 = **48.62 / 50**

---

## Pass/Fail Gates (ALL required)

| Gate | Verdict | Reason |
|---|---|---|
| MVP flows work (browse→search→edit E2E) | **PASS** | Critical journey verified live and by E2E `journey.spec.ts`. |
| Local runs (`npm start` / compose) | **PASS** | `npm run build && npm start` and `npm run dev` reproduced first-try; seed idempotent. |
| No critical bugs (crashes, data loss) | **PASS** | No crashes/data loss found; only 4 minor defects (DEF-1…4), none data-losing. |
| Follows Planner chunks (no massive deviations) | **PASS** | 6 commits ↔ 6 iterations; deviations minor and logged. |
| Implements UX designer's spec (layout, style, states) | **PASS** | Tokens, copy, layout, and states match the design spec; verified live. |

---

## Worksheet

```
Developer Score: evals_jun10_fable @ 0e7cc28

**MVP Flows Test**:
Browse: PASS  Search: PASS  Edit: PASS  Local: PASS

FUNCTIONALITY: 48.75/50
QUALITY:       48.62/50
TOTAL:         97.37/100   PASS

GATES: [x]Flows [x]Local [x]Bugs [x]Chunks [x]UX

**Audit**: Chunks completed: 6 / 6 planned
Bugs found:
  - DEF-1 (minor): multi-byte content over 100 KB byte cap but under 100k-char
    limit → misleading non-recoverable "Couldn't save" banner.
  - DEF-2 (minor): /search truncates at 20 rows with no "showing first 20" cue.
  - DEF-3 (minor): benign Turbopack NFT build warning via db/client.ts.
  - DEF-4 (minor): patch drift — next 16.2.9, react 19.2.7, tailwind 4.3.1 available.
  No critical or major defects.
```

---

## Final Verdict

**TOTAL: 97.37 / 100 — PASS** (threshold ≥ 75).

All five pass/fail gates pass. Every brief-required feature (browse→detail, full-text search with states, validated CRUD editing) works end-to-end in a real browser against a production build; tests are green on independent re-run; spec adherence (architecture + UX) is high; iteration discipline held across six chunks. The four open defects are all minor, documented, and non-blocking.

### Version sources (live search, 2026-06-13)
- Next.js 16.2.7 current stable (16.2.9 latest patch): nextjs.org/blog, vercel.com/changelog
- React 19.2.7 latest (pinned 19.2.4): github.com/react/react/releases, eosl.date
- Tailwind CSS 4.3.0 (4.3.1 latest patch): infoq.com, eosl.date/eol/product/tailwind-css
- drizzle-orm 0.45.2 latest stable (1.0 beta): npmjs.com/drizzle-orm, orm.drizzle.team
- Zod 4.4.3 latest: npmjs.com/package/zod
- Playwright 1.60.0 latest: npmjs.com/package/playwright

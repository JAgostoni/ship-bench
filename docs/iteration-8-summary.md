# Iteration 8 summary — Hardening, docs, verification evidence

**Status:** complete. `npm run verify` exits 0, `npm run test:e2e` exits 0 (28 passed),
and every performance budget, security row, accessibility check, and responsive width
has a measured result recorded in [`verification-notes.md`](./verification-notes.md).

This iteration added **no user-visible behaviour**. It measured, verified, and
documented what iterations 1–7 built — and fixed seven defects the verification passes
found, because the brief says: *"If a verification pass finds a defect, fix it
minimally and record the fix."*

---

## 1. What was built

| Task | Deliverable |
|---|---|
| 8.1 | `scripts/perf-seed.ts` (`--scale=2000`), `perf-http.cjs`, `perf-browser.cjs`, `perf-bundle.cjs`, `perf-floor.cjs` — every budget in `architecture.md` §13.1 measured against 2,000 articles |
| 8.2 | All ten `architecture.md` §13.2 security rows verified with a command or an inspection |
| 8.3 | `scripts/contrast-check.cjs` (parses the shipped `oklch()` tokens), `a11y-structural.cjs`, `a11y-signals.cjs` |
| 8.4 | `scripts/responsive-matrix.cjs` — six widths plus the 20-row state matrix |
| 8.5 | **`README.md`** — clone to running app, with no assumed knowledge |
| 8.6 | **`docs/decisions-log.md`** — every implementation deviation plus both accepted gaps |
| 8.7 | **`docs/verification-notes.md`** — required deliverable 7 |
| 8.8 | **`docs/screenshots/`** — 27 captures across both themes; walkthrough in the notes |
| 8.9 | **`docs/future-work.md`** — every non-goal with a source and a trigger |
| 8.10 | `scripts/acceptance-check.cjs`; the full clean-state run |

**Seven product defects were found and fixed.** All are recorded in
`docs/decisions-log.md` §4.5 as I8-1 … I8-7.

---

## 2. The seven fixes

| ID | Severity | What was wrong | Fix |
|---|---|---|---|
| **I8-1** | **High — real AA failure** | In dark mode, `text-danger` (L=0.55) was *lighter* than every dark surface, so it could reach only **3.45:1** on `--surface` and **2.69:1** on `--danger-soft`. No background could bring it to 4.5:1. Every error message, validation hint, and destructive-menu item failed AA in dark mode. | Added `--danger-ink` (dark: 7.52:1 / 5.85:1; light: identical to `--danger`), applying **UX16's own fill-vs-text pattern** to the danger family. All 14 `text-danger` usages switched; `bg-danger text-danger-on` unchanged. |
| I8-2 | Low — spec-table error | §9.1's light `--danger-on` on `--danger` row says 6.08:1; the colours give 5.44:1 (still passing). | Figure corrected in the notes. No colour change. |
| I8-3 | Low — spec-table error | §9.1's dark `--danger` on `--danger-soft` row says 5.85:1; the colours give 2.69:1. | Covered by I8-1. |
| **I8-4** | Medium — §9.4 violation | Browse and search routes skipped `h1 → h3` (page `h1` then card `h3`s, no `h2`). | Rendered the `sr-only` `h2` ("Articles" / "Results") that §9.4 already names as the implicit section heading. |
| **I8-5** | Medium — §9.4 violation | The editor routes had **no `h1` at all**; the title was a `<p>` and the outline began at the form's section headings. | Added the `sr-only` `h1` in the editor **content column**, per §2.1's "the `h1` lives in the content column, never in the header". |
| **I8-6** | Low — §9.4 violation | The editor routes had no `contentinfo`, so "exactly one `contentinfo`" held on all routes except those two. | Rendered the existing `Footer` in `EditorShell`. |
| **I8-7** | Medium — §6.4 violation | Seven header controls were below the 44px touch floor at 834px: the browse CTA, both icon buttons, the theme toggle, and both filter `Select` triggers. | Added `relative kb-touch` to the shared `Button` base (fixing every button at once) plus `ThemeToggle` and `SelectTrigger`. Browse route now reports **0 of 33 controls under 44px**. |

**No behaviour changed beyond these.** No budget was chased with a cache or a new
dependency — the brief forbids exactly that. The one missed budget is recorded with
its cause (§4 below).

---

## 3. Performance results

All against a **2,000-article** dataset (not the 9-article seed), p75 over 30 runs.

| Metric | Budget | Measured | Verdict |
|---|---|---|---|
| Browse TTFB | < 150 ms | **19.3 ms** | ✅ |
| Browse full render | < 250 ms | **18.9 ms** | ✅ |
| Search render | < 100 ms | **18.1 ms** | ✅ |
| `/api/search` JSON | < 100 ms | **4.1 ms** | ✅ |
| Article detail render | < 200 ms | **20.3 ms** | ✅ |
| LCP (localhost) | < 1.2 s | **60 ms** | ✅ |
| Filter-chip interaction | < 300 ms | **157 ms** | ✅ |
| **First-load JS, browse** | < 150 KB | **232.8 KB** | ❌ |
| **First-load JS, editor** | < 320 KB | **471.9 KB** | ❌ |

**The two JS budgets are unreachable on this framework version, and that is the
finding — not a shortcut.** The built-in **404 page**, which renders no application
code at all, loads **211.9 KB gzip across 11 chunks** — 41% over the browse budget on
its own. `react-dom` is 71.4 KB and the React/Next runtime 33.7 KB. The application's
own contribution to the browse route is **~21 KB**; the editor adds exactly one
239.5 KB `@uiw/react-md-editor` chunk.

The guarantee the budget exists to protect still holds and is verified: **the editor
is absent from the browse route's first-load JS** — `/` loads 14 chunks; the editor
adds exactly two. Recorded in `docs/decisions-log.md` §5.1.

---

## 4. The rest of the verification, in one line each

- **Security:** all **ten** §13.2 rows pass. No `dangerouslySetInnerHTML`, no
  `rehype-raw`, no interpolated `sql.raw`; `q=%22+AND` → 200; every mutating route
  calls `assertSameOrigin` + JSON content-type; a 200,001-char body → 422;
  `/api/test/reset` without `E2E_TEST_MODE` → bare 404; `npm audit --audit-level=high`
  → exit 0 with 0 high/critical. **The no-auth gap is restated with its
  internal-network-only bound.**
- **Accessibility:** axe smoke **0 violations** on `/`, `/search`,
  `/articles/[slug]`; one `banner`/`main`/`contentinfo` and exactly one `h1` on all
  four routes; no heading skips; no `tabIndex > 0`; skip link is the first tab stop;
  reduced motion collapses 48 transitions to 0.01 ms; colour is never the only signal.
- **Contrast:** every §9.1 pair re-verified from the shipped CSS in both themes, after
  the I8-1 fix. Only the accepted `--ink-subtle` 4.22:1 pair remains below AA.
- **Responsive:** all six widths pass — sidebar ≥1024px, TOC ≥1280px, editor
  side-by-side ≥768px and tabbed below, numbered pager ≥768px and collapsed below,
  no horizontal overflow at 360px, all 20 §11 rows verified in both themes.
- **Clean state:** `db:reset` → `db:fixture` → `db:check` (integrity ok, FKs clean) →
  `verify` (exit 0) → `test:e2e` (28 passed, exit 0) → `acceptance-check` (**all
  passed**), including the browse → search → edit → **reload persists** criterion.

---

## 5. Test inventory

| Layer | Files | Cases |
|---|---|---|
| `src/lib/**` (unit) | 14 | 141 |
| `src/server/**` (integration, real SQLite) | 11 | 157 |
| `src/app/**` (route handlers, actions) | 8 | 68 |
| `src/components/**` (jsdom) | 15 | 106 |
| **Total** | **48** | **492** |
| E2E (`e2e/*.spec.ts`) | 5 | 14 × 2 projects = 28 |

Coverage: **95.46% lines** overall, **99.14%** for `src/lib/**`, **94.11%** for
`src/server/**` — both layer targets from §11.1 met.

---

## 6. Assumptions and issues encountered

### 6.1 `scripts/perf-measure.ts` measures over HTTP, not in-process

The repository-layer probe cannot run under `tsx`: `src/server/repositories/*.ts`
import `server-only`, which throws under Node's default export condition, and the
async import chain defeats the `vitest.config.ts` alias that solves this for tests.
Rather than change the `server-only` boundary (a structural decision, D26), the
measurement goes **over HTTP against a real `next start`**, which is closer to what
the budgets describe anyway — TTFB and render are HTTP quantities.

### 6.2 `perf-measure.ts` is kept for query-plan inspection, not for the budget numbers

It also prints `EXPLAIN QUERY PLAN` for the browse query, which is what confirms the
`(status, updated_at)` index is used. The budget numbers in §3 come from the HTTP and
browser probes.

### 6.3 The screenshots use a scratch database

Empty-state captures require an empty dataset. `scripts/screenshots.cjs` drives a
**separate `./data/kb.shots.db`** and shells out to `scripts/empty-scratch-db.ts`,
which is pinned to that file and never reads the environment — the same guarantee
`empty-e2e-db.ts` already provides for `kb.e2e.db`. `data/` is gitignored apart from
`.gitkeep`, so no scratch artifact is committed.

### 6.4 The conflict-banner screenshot drives the real race

Rather than mutate component state, the capture loads the edit form, bumps the
article's `version` through the API behind the form's back, then submits — which is
the actual stale-version race the banner exists for.

### 6.5 The component-state matrix row 20 (progress bar) has no screenshot

The progress bar is visible only during a pending `useTransition`, which is not
reliably capturable. It is verified by `progress-bar.tsx` existing, being mounted in
both shells, and being observable during chip navigation in the responsive run.

### 6.6 Playwright's `pointer: coarse` cannot be emulated

`design-spec.md` §6.4's 44px floor is met by a `@media (pointer: coarse)` hit-area
rule, and Playwright cannot force that media feature (a `hasTouch` context does not).
`responsive-matrix.cjs` therefore (a) asserts the expansion rule ships with the
documented `inset: -6px 0`, and (b) measures each control with that expansion applied.
The number is the rule's own arithmetic, not a browser-measured hit test.

---

## 7. Decisions log

| ID | Decision | Alternatives | Rationale |
|---|---|---|---|
| **I8-1** | Add a `--danger-ink` **text** token and switch all danger-text usages | Darken `--danger`; swap error text to `--ink`; accept the failure | Darkening `--danger` would break white-on-fill for the danger button (it needs to stay light). Swapping to `--ink` would make errors indistinguishable from body text, violating "colour is never the only signal". UX16 already solved this exact conflict for the accent; applying the same pattern is the smallest change that is also consistent. |
| **I8-2** | Report the measured ratios and record the spec-table corrections | Change the colours to match the table | The colours reproduce the spec's *other* pairs exactly and pass AA; the table's two rows are arithmetic errors. Changing a compliant colour to match a wrong number would be the wrong fix. |
| **I8-3** | Put the editor `h1` in the **content column**, `sr-only` | Put it in the status strip as a visible heading | §2.1 is explicit: "Exactly one `<h1>` per page. It lives in the content column, never in the header." The strip already shows the title visually, so `sr-only` avoids duplicating it. |
| **I8-4** | Add `kb-touch` to the shared `Button` base rather than to each call site | Patch the seven controls individually | The 44px floor is a blanket requirement ("All interactive controls"), so the base class is the correct scope, and it prevents the next button from repeating the defect. `relative` was added alongside it to anchor the pseudo-element. |
| **I8-5** | Measure over HTTP instead of in-process for the budgets | Relax the `server-only` boundary; add a Vitest-only probe | TTFB and render are HTTP quantities, so the HTTP probe is more faithful, and it leaves D26's structural boundary intact. |
| **I8-6** | Keep the first-load-JS miss documented rather than "fixed" | Add a lighter baseline; drop a dependency | The brief forbids adding a cache or a new dependency for a budget. The floor is the framework's, and the budget's actual engineering requirement (editor excluded from browse) is verified. |
| **I8-7** | Verify the component-state matrix by screenshot **and** named test, not by screenshot alone | Screenshot every row | Rows like Button, Field, Pagination, and Empty State have programmatic assertions that are stronger evidence than an image, and the images cost ~1 MB. Each row names its evidence in the notes. |

---

## 8. Definition-of-done checklist

- [x] Every §13.1 performance budget has a measured number and a verdict against
      2,000 articles; the one miss has its cause documented.
- [x] All ten §13.2 security rows verified with a command or inspection; the no-auth
      gap stated with its deployment bound and the §15.2 retrofit link.
- [x] Contrast re-verified against the shipped CSS in both themes; `--ink-subtle`
      confirmed bounded to redundant 12px meta text.
- [x] axe smoke passes on `/`, `/search`, `/articles/[slug]`; the notes state clearly
      that this is smoke coverage, not a full audit.
- [x] Responsive matrix verified at 360, 768, 834, 1024, 1280, 1440.
- [x] All 20 rows of `design-spec.md` §11 verified in both themes.
- [x] `README.md` takes a new developer from clone to running app with no questions.
- [x] `docs/decisions-log.md` records every deviation plus both accepted gaps.
- [x] `docs/verification-notes.md` traces every claim to a command, a test name, or a
      screenshot.
- [x] `docs/screenshots/` contains all ten captures (27 files, both themes).
- [x] `docs/future-work.md` covers every non-goal with a source and a trigger.
- [x] The full clean-state run succeeds, including browse → search → edit → reload.
- [x] All eight required + four stretch deliverables from `product-brief.md` are
      present.

---

## 9. Handoff notes

1. **The evidence is reproducible, not asserted.** Every script under `scripts/`
   (`contrast-check`, `a11y-*`, `responsive-matrix`, `perf-*`, `acceptance-check`,
   `screenshots`) is committed and re-runnable; the notes name the command beside each
   number.
2. **The scratch databases are gone.** `./data/kb.perf.db` and `./data/kb.shots.db`
   were deleted after measurement; `data/` holds only the gitignored `kb.db` and
   `kb.e2e.db`.
3. **Two budgets will need a framework-version decision, not a code change.** See
   `docs/decisions-log.md` §5.1 before attempting to close them.
4. **The danger token split is the one product change.** Any new danger *text* should
   use `text-danger-ink`; `bg-danger` still means a fill.

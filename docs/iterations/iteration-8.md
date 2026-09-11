# Iteration 8 — Hardening, docs, verification evidence

**Goal.** Every claim the project makes is backed by a command or an artifact. Performance budgets are measured against realistic data, the security and accessibility checklists are walked, the responsive and component-state matrices are verified, and the brief's required deliverables 7 and 8 plus all four stretch deliverables are produced.

**Scope.** Verification passes, documentation, screenshots, and the future-work list. No new features.

**Out of scope.** Anything that adds user-visible behaviour. If a verification pass finds a defect, fix it minimally and record the fix.

**Reference.** `architecture.md` §12.5, §13, §15, §16; `design-spec.md` §9, §11, §13; `product-brief.md` "Required deliverables" and "Stretch deliverables".

---

## Tasks

### 8.1 Measure the performance budgets

`architecture.md` §13.1 states numeric budgets. Measure them against a **realistic dataset**, not the 9-article seed.

- Generate a 2,000-article dataset in a scratch database (`DATABASE_FILE=./data/kb.perf.db`) by extending the seed script with a `--scale=2000` flag or a one-off `scripts/perf-seed.ts`. Keep it out of the default `db:seed` path.
- Measure and record against the budgets:
  - Browse page TTFB p75 **< 150 ms** @ 2,000 articles
  - Browse page full render p75 **< 250 ms**
  - Search response p75 **< 100 ms**
  - Article detail render p75 **< 200 ms**
  - First-load JS, browse route **< 150 KB gzip**
  - First-load JS, editor route **< 320 KB gzip**
  - LCP p75, localhost baseline **< 1.2 s**
  - Filter-chip interaction **< 300 ms** perceived
- Capture the `next build` route-by-route bundle table. **Any route over budget must be justified in the write-up or fixed.**
- Confirm the editor is absent from the browse route's first-load JS (the `next/dynamic` + `ssr: false` guarantee from iteration 6.3).
- Delete `./data/kb.perf.db` when finished.

**Done when:** every budget has a measured number and a pass/fail verdict recorded in `docs/verification-notes.md`, and any miss has a documented cause.

---

### 8.2 Walk the security checklist

Verify each row of `architecture.md` §13.2 against the shipped code, with a command or an inspection for each:

| Threat | Verification |
|---|---|
| Stored XSS via Markdown | `grep -rn "dangerouslySetInnerHTML" src/` returns nothing; `grep -rn "rehype-raw" src/` returns nothing; the `article-body` test asserting `<script>` is not parsed passes |
| SQL injection | `grep -rn "sql.raw" src/` shows only the `FTS5_DDL` constant, which contains no interpolation |
| FTS5 query injection / DoS | The `toFtsQuery` test suite passes; a live request to `/api/search?q=%22+AND` returns 200, not 500 |
| CSRF | Server Actions rely on Next.js origin validation; every route-handler mutation calls `assertSameOrigin` and requires a JSON content type — inspect each mutating route |
| Path traversal / file exposure | `data/` is outside `public/`; `grep -rn "DATABASE_FILE" src/` shows it comes only from validated env, never from request input |
| Sensitive data in logs | `grep -rn "bodyMd" src/` shows it is never passed to a logger; confirm with the action test from iteration 6.1 |
| Clickjacking / MIME sniffing | `curl -I http://localhost:3000/` shows `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and the CSP |
| Dependency vulnerabilities | `npm audit --audit-level=high` exits 0 |
| Untrusted article size | The `articleCreateSchema` limits (200,000 / 200 / 300) are enforced server-side; confirm with a hand-crafted POST returning 422 |
| Test endpoint exposure | `curl -X POST http://localhost:3000/api/test/reset` without `E2E_TEST_MODE=1` returns 404 with an empty body |

Record each result. **The one accepted gap is the absence of authentication** (`architecture.md` §16.1 A1, D19) — restate it explicitly in the notes as an internal-network-only deployment requirement, and link §15.2 as the retrofit path.

**Done when:** all ten rows have a recorded verification and the auth gap is explicitly stated.

---

### 8.3 Verify accessibility and contrast

Walk the `design-spec.md` §13 verification checklist that falls inside the brief's MVP scope:

- **Contrast:** re-verify every pair in `design-spec.md` §9.1 against the shipped `globals.css` in **both** themes. A script that parses the `oklch()` tokens and computes the ratios is the cleanest evidence. Confirm `--ink-subtle` on `--surface` in light mode is 4.22:1 and that it is used **only** on the redundant 12px meta text (UX15).
- **axe:** `expectNoA11yViolations` passes on `/`, `/search`, and `/articles/[slug]` (already covered by iteration 7 — re-run and record).
- **Focus order:** walk the order in `design-spec.md` §9.2. Confirm the skip link is the first tab stop, that the DOM order equals the visual order at every breakpoint, and that **no element has a `tabIndex` greater than 0**: `grep -rn "tabIndex" src/` shows only `-1` usages.
- **Landmarks:** exactly one `banner`, one `main`, one `contentinfo`; every `nav` individually labelled.
- **Heading order:** no level is skipped on any route.
- **Motion:** toggling `prefers-reduced-motion` collapses every transition to 0.01ms.
- **Color is never the only signal:** draft/archived have text badges; errors have an icon + text + `aria-invalid`; search matches have `<mark>`; the active TOC item has a border + `aria-current`.

> **The full WCAG 2.1 AA audit with screen-reader testing is out of MVP scope** (`product-brief.md` testing scope; `architecture.md` §15.4 item 10). Do not perform or claim one. Record the smoke coverage as smoke coverage.

**Done when:** every checklist item has a pass/fail and the MVP-scope boundary is stated explicitly.

---

### 8.4 Walk the responsive and component-state matrices

**Responsive matrix** (`design-spec.md` §6.2 and §13) at **360, 768, 834, 1024, 1280, 1440**:

- Sidebar visible only at ≥1024px; TOC only at ≥1280px and only with ≥2 headings
- Editor preview side-by-side at ≥768px, tabbed below
- Card meta line inline at ≥768px, own line below
- Filter bar one row at ≥768px, two rows with horizontally scrolling chips below
- Pagination numbered at ≥768px, collapsed below
- No horizontal overflow at 360px
- Touch targets ≥44×44 at 834px with ≥8px gaps

> Playwright covers 1280×800 and 834×1112 only. The remaining widths require this manual pass (recorded as B11 in `docs/backlog.md` §5).

**Component state matrix** — walk all 20 rows of `design-spec.md` §11 **in both themes**. Every row must be visually verified. Capture screenshots for the rows where a visual check is the evidence.

**Done when:** every width and every one of the 20 component rows has a recorded verification in both themes.

---

### 8.5 Write the README and local run notes

Create **`README.md`** covering:

- What the app is and who it is for (one paragraph, drawn from the brief)
- **Prerequisites:** Node.js 24.21.0 (`.nvmrc`), npm 11.19.0, no Docker, no database server. Note the `better-sqlite3` N-API prebuild behavior and the Python 3 + C compiler fallback if a prebuild is ever missing
- **First run**, copy-paste from a fresh clone: `nvm use` → `npm install` → copy `.env.example` to `.env.local` → `npm run db:setup` → `npm run dev`
- **Expected first-run result:** the browse page shows 4 categories and 7 published articles; searching `deploy` returns 3 results; clicking any article opens a rendered Markdown page
- **Day-to-day commands** — the table from `architecture.md` §12.5
- **Scripts reference** — the table from `architecture.md` §11.6
- **Project structure** — a trimmed version of `architecture.md` §5.1 with a one-line purpose per top-level directory
- **Data model** — the entity table and relationship sketch from `docs/backlog.md` §6
- **Testing** — how to run unit, coverage, and E2E; what is in MVP scope and what is deliberately not
- **Deployment / local run notes** (stretch deliverable) — a single Node 24 process serving `next start`, SQLite in `./data/`, internal-network-only because there is no auth, plus the `db:backup` / `db:check` / `db:reindex` operational commands
- **Architecture and design references** — links to the three source documents
- **Naming conventions and commit style** — from `architecture.md` §5.2 and §3.4

**Done when:** a developer who has never seen the repo can follow the README from clone to a running app without asking a question.

---

### 8.6 Write the decisions log

Create **`docs/decisions-log.md`** as an append-only long-form log (the artifact `architecture.md` §5.1 lists).

- Reproduce the two existing decision tables by reference, not by duplication: point at `architecture.md` §17 (D1–D26) and `design-spec.md` §12 (UX1–UX22), and add only what those tables do not cover.
- Add the backlog's sequencing decisions from `docs/backlog.md` §5 (B1–B12) with a short rationale each.
- Add a **"decisions made during implementation"** section. Record every deviation from the architecture or design spec that occurred in iterations 1–7, with: what was specified, what was built, why, and what the consequence is. If there were none, say so explicitly — that is a meaningful result, not an empty section.
- Add the two accepted gaps with their bounds:
  - **No authentication in v1** — internal-network-only deployment; retrofit path is §15.2 (D19)
  - **`--ink-subtle` at 4.22:1 in light mode** — restricted to redundant 12px meta text; bounded by UX15

**Done when:** every deviation is recorded and both accepted gaps are stated with their bounds.

---

### 8.7 Write the verification notes

Create **`docs/verification-notes.md`** — required deliverable 7, "Tests and verification notes".

- **Test inventory:** every unit, integration, component, and E2E file, with the count of cases and the coverage number for `src/lib/**` and `src/server/**`.
- **The exact commands run** and their observed exit codes: `npm run verify`, `npm run test:coverage`, `npm run test:e2e`, `npm run db:check`.
- **The five E2E journeys** with a pass/fail per Playwright project.
- **Performance results** from 8.1, as a table of budget vs measured vs verdict.
- **Security checklist results** from 8.2, one row per threat.
- **Accessibility and contrast results** from 8.3, with the explicit statement that a full WCAG audit was **not** performed (out of MVP scope).
- **Responsive matrix results** from 8.4.
- **Known limitations**, drawn from `architecture.md` §15.1 and §9.2: no stemming or typo tolerance, offset pagination beyond ~50,000 articles, single-node ceiling, no autosave, Markdown syntax visible to non-technical authors, `script-src 'unsafe-inline'`.
- **What was deliberately not tested**, quoting the brief's "Not MVP" line.

**Done when:** every claim in the notes is traceable to a command, a test name, or a screenshot.

---

### 8.8 Produce the screenshots and walkthrough

Create **`docs/screenshots/`** and capture, in **both light and dark themes** where the design differs:

1. Browse with the sidebar, filter bar, and pagination
2. Search results with `<mark>` highlighting and the announced count
3. Article detail with the breadcrumb, meta line, TOC, and collapsed History
4. The editor in the focused shell with the live preview visible
5. The conflict banner with focus applied
6. Each of the five empty states
7. The archive confirm dialog
8. The command palette
9. Tablet at 834×1112 showing the drawer
10. The 404 page for a missing slug

Add a **walkthrough section** to `docs/verification-notes.md` describing the browse → search → edit → reload loop step by step, referencing the screenshots by filename.

**Done when:** the walkthrough can be followed without the app running, and every screenshot is committed.

---

### 8.9 Write the future-work list

Create **`docs/future-work.md`** — the brief's stretch deliverable, organized by the phases in `docs/backlog.md` §4.2.

For each item, include a one-line description, the source reference (`architecture.md` §8.9 / §15.2 / §15.4, or `design-spec.md` §4.4 `[DEFERRED]`), and the trigger that would make it worth doing.

Cover at minimum:

- Nonce-based CSP via `src/proxy.ts` (§12.6)
- `cacheComponents` + `'use cache'` on the hot reads (§8.9 step 1)
- Full WCAG 2.1 AA audit with screen-reader testing (§15.4 item 10)
- Authentication and per-article authorization (§15.2)
- Category rename/delete (`design-spec.md` §4.4)
- Revision diff view and one-click restore (§15.4 item 5)
- Tags as a many-to-many relation (§15.4 item 2)
- Image uploads (§15.4 item 3)
- Comments / inline review notes (§15.4 item 4)
- Postgres migration + multi-node deployment (§8.9 steps 2–3)
- Porter stemming or a `trigram` tokenizer for typo tolerance (§15.4 item 6)
- Static HTML/PDF export (§15.4 item 9)
- i18n/l10n, PWA/offline

**Done when:** every non-goal in `architecture.md` §16.2 that has a plausible future is represented with a trigger.

---

### 8.10 Final end-to-end verification from a clean state

Run the whole thing as a reviewer would:

```
git clean -xdf            # in a scratch clone, not the working tree
npm install
cp .env.example .env.local
npm run db:setup
npm run dev               # verify the expected first-run result from the README
npm run verify
npm run test:e2e
```

Then confirm the acceptance criterion from `architecture.md` §18: **a human can browse → search → edit → reload and see the change persisted.**

Finally, verify the deliverable checklist from `product-brief.md`:

- [ ] Product summary — in `README.md` and `docs/backlog.md` §1
- [ ] Scope and feature prioritization — `docs/backlog.md` §1
- [ ] Technical architecture spec — `docs/architecture.md`
- [ ] UX / design direction spec — `docs/design-spec.md`
- [ ] Implementation backlog or execution plan — `docs/backlog.md` + `docs/iterations/*`
- [ ] Working application — the repo
- [ ] Tests and verification notes — `docs/verification-notes.md`
- [ ] Short decisions log — `docs/decisions-log.md` + `docs/backlog.md` §5
- [ ] *(stretch)* Data model sketch — `docs/backlog.md` §6
- [ ] *(stretch)* Deployment / local run notes — `README.md`
- [ ] *(stretch)* Screenshots or walkthrough notes — `docs/screenshots/` + `docs/verification-notes.md`
- [ ] *(stretch)* Future work list — `docs/future-work.md`

**Done when:** every box is checked and every artifact is committed.

---

## Iteration notes

**Sequencing.** 8.1–8.4 are verification passes and are independent of each other. 8.5–8.7 depend on 8.1–8.4 having produced their results. 8.8 depends on the app being feature-complete (it is). 8.9 is independent. 8.10 is last and depends on everything.

**Record what you actually observed.** A verification note that says "performance is good" is not evidence. "Browse TTFB p75 = 87 ms over 50 runs against 2,000 articles; budget 150 ms; PASS" is.

**Do not expand scope to fix a budget miss.** If a budget is missed, either fix the specific cause (an unindexed query, a component pulled into the wrong bundle) or record the miss with its cause. Adding a caching layer or a new dependency is a post-MVP decision, not an iteration 8 task.

**Delete scratch artifacts.** `./data/kb.perf.db` and any generated dataset must not be committed — `data/` is gitignored except `.gitkeep`.

---

## Definition of done

- [ ] Every performance budget in `architecture.md` §13.1 has a measured number and a verdict, against a 2,000-article dataset.
- [ ] All ten security checklist rows are verified with a command or inspection, and the no-auth gap is stated with its deployment bound.
- [ ] Contrast is re-verified against the shipped CSS in both themes; the `--ink-subtle` tradeoff is confirmed as bounded.
- [ ] axe smoke passes on `/`, `/search`, and `/articles/[slug]`; the notes state clearly that this is smoke coverage, not a full audit.
- [ ] The responsive matrix is verified at 360, 768, 834, 1024, 1280, and 1440.
- [ ] All 20 rows of `design-spec.md` §11 are verified in both themes.
- [ ] `README.md` takes a new developer from clone to running app with no questions.
- [ ] `docs/decisions-log.md` records every implementation deviation (or states explicitly that there were none) plus both accepted gaps.
- [ ] `docs/verification-notes.md` traces every claim to a command, a test name, or a screenshot.
- [ ] `docs/screenshots/` contains all ten captures, committed.
- [ ] `docs/future-work.md` covers every non-goal with a trigger.
- [ ] The full clean-state run in 8.10 succeeds, including the human browse → search → edit → reload check.
- [ ] All eight required + four stretch deliverables from `product-brief.md` are present and committed.

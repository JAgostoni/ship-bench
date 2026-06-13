# QA Report — Team KB v1 (MVP)

**Reviewer:** Senior QA / Code Review
**Date:** 2026-06-12
**Environment:** Windows 11 Pro, Node v24.10.0, npm 11.6.1, Chromium (Playwright 1.60.0)
**Commit reviewed:** `0e7cc28` (Iteration 6: E2E tests, QA pass, verification)

All results below were independently reproduced in this review session — nothing is taken from the developer's verification notes without re-running it. Where a claim could not be independently re-verified, that is stated explicitly.

---

## 1. MVP flow results

The brief requires three features: (1) browsing + detail, (2) search across titles and content, (3) basic editing. Every flow was exercised against a production build (`npm run build && npm start`) on a freshly seeded database, plus the full E2E suite.

| Flow | Result | Evidence / notes |
| --- | --- | --- |
| **Browse: home list** | ✅ PASS | 12 seeded cards, newest-updated first, "12 articles" badge, relative times <7 days and absolute dates older — verified live and in screenshots at 1280/800/375 px. |
| **Browse: zero-articles empty state** | ✅ PASS | Wiped the DB live: "No articles yet" + "Create your first article" CTA render and the CTA navigates to the editor. Also covered by `e2e/create-empty.spec.ts` (passed). |
| **Browse: article detail** | ✅ PASS | Rendered Markdown (headings, lists, code blocks, GFM tables), "← All articles" link, Edit/Delete actions, absolute Updated/Created meta line. |
| **Browse: not-found** | ✅ PASS | `/articles/424242`, non-numeric ids (`/articles/abc`), and unsafe-integer ids (`99999999999999999999`) all return HTTP 404 with the "Article not found" empty state and a working recovery link. Both not-found E2E specs passed. |
| **Search: header dropdown** | ✅ PASS | Typed query → debounced dropdown with `<mark>`-highlighted snippets and "See all N results →" footer; verified at all three viewports. No-match row ("No matches for “zzqqxx” — press Enter to search everything") verified live. Keyboard combobox model covered by passing E2E journey + code review. |
| **Search: full results page** | ✅ PASS* | Count badge, highlighted snippets, row links to detail. Blank `q` shows the instruction state; zero results shows the "No results for …" empty state with "Clear search". *One minor gap: with >20 matches the badge shows the true total but only 20 rows render with no "showing first 20" cue — see DEF-2. |
| **Search: index consistency (FTS triggers)** | ✅ PASS | Probed directly: create → found; update → new content found, old gone; delete → gone from results. The E2E journey additionally proves this through the UI. |
| **Search: hostile input** | ✅ PASS | `"`, `-`, `*`, emoji-only, blank, and operator-laced queries (`-"deploy*`) all return 200 with sane results — never a 500. Sanitizer also unit-tested (12 cases). |
| **Create** | ✅ PASS | Via UI (E2E `create-empty.spec.ts`, `validation.spec.ts`) and API (201, correct body shape). Post-save lands on the new article's detail page. |
| **Create/edit: validation states** | ✅ PASS | Empty submit shows "Title is required" + "Content is required", focus + `aria-invalid` on the first invalid field (E2E passed); server 400 maps `fieldErrors` onto fields; title counter logic present per spec (≥180 chars). |
| **Edit** | ✅ PASS | E2E critical journey: edit title + body → save → detail shows updates → search finds the new title. Repeated independently: 8/8 E2E green. |
| **Edit: dirty guards** | ✅ PASS | Verified live: dirty Cancel opens "Discard changes?" with "Keep editing" default-focused; choosing it preserves the edited input. `beforeunload` guard verified by code inspection only (browser-native dialog isn't reliably scriptable — same limitation the dev noted). |
| **Delete** | ✅ PASS | Verified live: dialog quotes the article title, Cancel is default-focused, Esc closes with the article intact; confirm deletes, redirects home, and the article disappears from search (E2E `delete.spec.ts` also passed). |
| **Editor: live preview** | ✅ PASS | Split pane at 1280 px renders preview through the same `ArticleBody` component as the detail page (preview parity confirmed in code and on screen); Write/Preview tabs at 800/375 px. |

## 2. Local setup result

**✅ PASS.** Followed the README on this machine:

- `npm run db:seed` against a fresh `DATABASE_PATH` created the database, applied both migrations, and inserted 12 articles ("Seeded 12 articles into data/kb-qa.sqlite"). Re-running is idempotent.
- `npm run build && npm start` serves the app correctly (all probes in §1 ran against this production server).
- `npm run dev`, `npm test`, `npm run check`, `npm run test:e2e` all work as documented. The one E2E prerequisite (`npx playwright install chromium`) is documented in the README.
- Caveat: `npm install` was not re-run from a clean clone (node_modules pre-existed); the lockfile is committed and `better-sqlite3` prebuilds resolved fine on this Windows/Node 24 box, so risk is low.

No missing steps or undocumented manual intervention found.

## 3. Test suite results and coverage

**Unit/integration (`npm run check`):** ✅ **59/59 tests pass in 7 files** (Vitest 4.1.8, ~2 s), alongside clean `tsc --noEmit`, clean ESLint, clean Prettier. Re-run in this session, exit code 0.

**E2E (`npm run test:e2e`):** ✅ **8/8 pass** (~18.5 s, Chromium, 1 worker). Re-run in this session, exit code 0.

**Coverage vs. the brief's testing scope** ("unit tests for core logic AND basic E2E for critical journeys — browse → search → edit"): **met.**

- Unit: repo CRUD against in-memory SQLite (incl. `updatedAt` bump, list ordering), FTS search behavior (prefix match, title-over-content ranking, snippet marks, limit capping), sanitizer hostile-input matrix, Zod boundaries, snippet whitelist parser, relative-time formatter, DB client singleton, plus the `ArticleEditor` component test required by architecture §8.1.
- E2E: the brief-required critical journey, plus create-from-empty, delete-with-confirm, two not-found cases, validation display, and a REST contract spec — exactly the secondary specs architecture §8.2 called for.

**Untested paths worth knowing about** (none are brief-mandated):

- The search dropdown's error row and the editor's network-error banner are verified only by the dev's scripted QA sweep (screenshots) and code review — no automated test simulates a failing request.
- The 100 KB body-cap rejection path and 500-error mapping have no tests.
- `beforeunload` guard — code inspection only (documented).
- No coverage-percentage tooling is configured (not required by the brief; the suite targets logic rather than coverage numbers, which matches architecture §8.1's stated intent).

## 4. Responsiveness result

**✅ PASS.** Verified with a scripted Chromium pass + screenshot review at 1280 px (desktop), 800 px (tablet), 375 px (mobile smoke — "must not break" bar per design §3.1):

- Home grid: 2 columns at 1280, 1 column at 800 and 375 (computed-style asserted, not eyeballed).
- Editor: split pane at 1280; Write/Preview tabs at 800 and 375; actions move below content at <1024.
- Header at 375: logo glyph only, icon-only "+" button, search box flexes — nothing clipped or broken.
- Detail and search pages render intact at all three widths.

## 5. Error handling result

**✅ PASS.** All probed directly against the running server:

- Validation: `400 { error: { code: "VALIDATION", fieldErrors } }` with the exact spec copy; surfaced inline in the UI with focus management (E2E-verified).
- Malformed JSON and oversized bodies (110 KB): clean 400s with distinct messages — no stack traces, no 500s.
- Not-found: 404 + `NOT_FOUND` envelope for unknown, non-numeric, and unsafe-integer ids; the UI 404 page returns a real HTTP 404.
- Search: hostile/blank input always 200 with empty results; `limit` abuse (99999, non-numeric) is capped/defaulted.
- Stored XSS: article content `<script>` / `<img onerror>` is HTML-escaped in the rendered page (confirmed `&lt;script&gt;` in served HTML); snippets render through a whitelist splitter, never `dangerouslySetInnerHTML`.
- One rough edge: a misleading banner for multi-byte over-cap content — DEF-1 below.

## 6. Spec adherence summary

Adherence to all three documents is **very high** — unusually so. The API contract matches architecture §6.2 byte-for-byte (envelope shapes, status codes, error copy). The design spec's normative copy, tokens, breakpoints, focus behavior, and empty states are implemented verbatim (spot-checked extensively; `globals.css` reproduces §6.1 exactly). The six iterations map 1:1 onto the six commits with no scope creep — no tags, no status field, no toasts, no pagination, none of the §8.4 exclusions snuck in. The developer's `verification.md` claims were all independently confirmed, and its known-gaps table is honest. Deviations found are logged in §9 — all minor, most documented by the developer at decision time.

## 7. Code signals checklist

| Signal | Verdict | One-line evidence |
| --- | --- | --- |
| Linting clean, no warnings | **Yes** | `eslint .`, `tsc --noEmit`, `prettier --check .` all clean this session; only blemish is a benign, documented Turbopack build warning (DEF-3). |
| No obvious security holes | **Yes** | Parameterized queries throughout; FTS input sanitized; raw HTML escaped (verified live); snippet whitelist renderer; 100 KB body cap; no auth is per-spec ("trusted network"). |
| Code is modular, no god components | **Yes** | Largest file is `ArticleEditor.tsx` at ~500 lines — dense but cohesive and single-purpose; everything else is small; six UI primitives as specified. |
| Follows the architecture spec | **Yes** | Strict layering held: `repo/articles.ts` is the only app module touching the DB; routes do HTTP concerns only; shared Zod schema both sides; RSC-direct reads, REST writes. |
| Iterations followed, no scope drift | **Yes** | Six commits = six backlog iterations; deviations were logged in backlog addenda (#10–12) at the time they were made. |
| Dependency versions current | **Yes, with patch drift** | Pinned to the spec's live-verified versions (2026-06-10, per backlog decision #8); `npm outdated` shows only patches behind (next 16.2.9, react 19.2.7, tailwind 4.3.1) plus dev-tooling majors (eslint 10, jsdom 29) released after the pin. |

## 8. Defect log

No critical or major defects were found.

**DEF-1 · Minor — Misleading error banner for multi-byte content under the char limit but over the byte cap**
The validation limit is 100,000 *characters* but the request cap is 100 *KB of bytes*. Content between ~50k and 100k multi-byte characters passes client validation, is rejected server-side with a non-field 400, and the editor falls through to the generic banner "Couldn't save. Your text is still here — try again." — retrying can never succeed.
*Repro:* New article → title "x" → paste 60,000 two-byte characters (e.g. `é`) into content → Save. Verified at API level: a 120,034-byte body of 60,000 `é` chars returns `400 "Request body must be 100 KB or smaller"`, which has no `fieldErrors` for the editor to map.
*Suggested fix:* count bytes (or a conservative char limit) in the shared Zod schema, or map the body-cap 400 to a specific content field error.

**DEF-2 · Minor — Search results page silently truncates at 20 rows**
`/search?q=…` renders at most 20 rows (API default) while the badge shows the full match total, with no "showing first 20" indicator and (by design) no pagination.
*Repro:* create 25 articles containing a unique term → `/search?q=<term>` shows a "25 results" badge above 20 rows. Verified live.
*Note:* the 20-row limit and no-pagination are both per spec (design §2.2B, §8.4) — the defect is only the missing truncation cue. A one-line "Showing the first 20" suffix fixes it.

**DEF-3 · Minor — Turbopack "unexpected file in NFT list" warning on every build**
`next build` emits a file-tracing warning through `src/lib/db/client.ts` (runtime-resolved `DATABASE_PATH`). Build succeeds and the served app is correct; the developer documented it. It's still noise that will mask future real warnings.
*Repro:* `npm run build`.
*Suggested fix:* the warning text itself suggests `path.join(process.cwd(), 'data', …)` scoping or a `turbopackIgnore` comment.

**DEF-4 · Minor — Patch-level dependency drift**
`npm outdated`: next/eslint-config-next 16.2.7 → 16.2.9, react/react-dom 19.2.4 → 19.2.7, tailwind 4.3.0/4.3.1. Backlog decision #8 explicitly allows taking patches. No vulnerability flagged; hygiene only.
*Repro:* `npm outdated`.

## 9. Spec drift log

| # | Deviation | From | Assessment |
| --- | --- | --- | --- |
| 1 | FTS5 table + triggers live in a second migration (`0001_fts.sql`) instead of being appended to `0000_init.sql` | Architecture §11 | Cosmetic; identical SQL, idempotent runner. |
| 2 | `src/lib/api/http.ts` added (error envelope, body-cap reader, id parser) — not in the §7.1 repo tree | Architecture §7.1 | Positive drift: centralizes the error contract instead of duplicating it per route. Layering preserved. |
| 3 | Pages import `parseArticleId` from `lib/api/http` | Architecture layering intent | Minor smudge (page → "API" module); the helper is pure and shared deliberately. Acceptable. |
| 4 | E2E determinism via row-level DB reset + `workers: 1` instead of file delete/reseed in global setup | Architecture §8.2 | Forced by Windows file locking; logged at the time as backlog decisions #11–12. Sound. |
| 5 | Seed articles extracted to `src/lib/seed-data.ts` so tests share them | Architecture §7.1 | Documented (iteration 6 summary); seed script behavior unchanged. |
| 6 | QA sweep was a scripted Playwright pass, not a hand walk | Iteration 6 task wording | Developer disclosed it; same states covered. Independently re-verified key states by hand in this review. |
| 7 | No truncation cue when search matches exceed the 20-row page limit | Gap *within* the design spec (it never specified one) | Logged as DEF-2 rather than pure drift. |

No undisclosed deviations were found, and the brief's "missing categories" empty state was correctly re-mapped to the 404 state per the design spec's documented decision (§10-7).

## 10. Release recommendation

**Ship.**

Rationale, by the evidence:

- All three required features work end-to-end, including empty, validation, error, and not-found states — verified by independently re-run automated suites (59/59 unit, 8/8 E2E) **and** direct probing of a production build, not by trusting the developer's notes.
- Local setup works exactly as documented from a fresh database.
- The error contract, security posture (for the stated trust model), responsiveness, and accessibility behaviors match the specs at every point checked.
- The four defects found are all minor, have no data-loss or availability impact, and none blocks the internal-team use case the brief describes. DEF-1, the worst of them, requires pasting ~50k+ multi-byte characters and still preserves the user's text.
- Process quality is a positive signal for maintenance: deviations were logged when made, the developer's verification claims all reproduced, and scope discipline held across six iterations.

## 11. Next steps (prioritized)

1. **Fix DEF-1** — align the byte cap and the character limit (byte-aware Zod check or mapped field error). Small, user-facing correctness fix.
2. **Fix DEF-2** — add a "Showing the first 20 results" cue (or bump the page limit) on `/search` when `total > results.length`. One line.
3. **Take the patch updates (DEF-4)** — next 16.2.9, react 19.2.7, tailwind 4.3.1; re-run `npm run check` + E2E.
4. **Silence the Turbopack warning (DEF-3)** so future build warnings are visible.
5. **Add two cheap automated tests** for paths currently verified only manually: the search dropdown error row (route-abort fixture) and the body-cap 400 path.
6. **Post-MVP, per backlog §4:** categories/tags, then draft/published status — the schema and primitives are already positioned for both.

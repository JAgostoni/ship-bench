# Architect Score Sheet: evals_sep2026_deepseek-flash-4.1

**Artifact evaluated:** `docs/architecture.md` (2,430 lines, dated 2026-09-10)
**Spec applied:** `evals/architect-measurement-spec.md`
**Evaluation date:** 2026-09-17
**Version verification method:** live queries to `registry.npmjs.org/<pkg>/latest` (see Appendix A) plus a live web search for the Node.js LTS line.

---

## 1. COMPLETENESS (50 pts)

**Front-end: 5**
§3.2, §6.1–§6.7 pin `next@16.3.4`, `react@19.3.0`, `tailwindcss@4.3.3`, declare an RSC-first rendering model with a per-route client-component table (§6.1), a full route/query-param contract (§6.2), forms via `react-hook-form@7.87.0` + `zodResolver` with a worked code sample (§6.4), and a closed editor decision (`@uiw/react-md-editor@4.1.2`, §9.3). State management is explicitly decided ("URL is the state container"; no Redux/Zustand/React Query).

**Back-end: 5**
§7.1–§7.6 specify the single-process Node runtime, a four-layer call path, seven REST endpoints with request/response JSON bodies and status codes (§7.3), RFC 9457 problem+json error mapping with the `AppErrorCode`→HTTP status table (§7.2), the `ActionState` Server Action signature (§7.5), and logging via `pino@10.3.1` (§7.6).

**Data tier: 5**
§8.2 gives column-level tables for `categories`, `articles`, `article_revisions` (types, constraints, FKs, indexes); §8.3 gives the Drizzle `schema.ts` source; §8.5 quotes the generated `0000_init.sql` verbatim plus a `0001` follow-up and a stated `CHECK`-constraint procedure; §14.2 specifies seed content (4 categories, 7 published + 2 draft articles) and its idempotency contract.

**Search: 5**
§8.1 specifies an FTS5 external-content virtual table with the three sync triggers, `bm25(article_search, 8.0, 3.0, 1.0)` field weighting, `highlight`/`snippet` sentinel extraction, a four-step `toFtsQuery()` preprocessing algorithm, and a `LIKE` fallback path. Tradeoffs (no stemming, no typo tolerance, no CJK) are stated in §9.2 and deferred in §15.4.

**Integration: 5**
§10.1–§10.5 trace the read path (RSC→repository), write path (Server Action→transaction→`revalidatePath`→`redirect`), and the single client JSON path (command palette). §12.3 defines four environment variables with a Zod-validated `env.ts`; ports are fixed (3000 dev, 3100 E2E per `playwright.config.ts`, §11.4). CORS is not named; it is moot under the single-origin design, and same-origin enforcement is specified instead (`assertSameOrigin`, §7.3).

**Repo: 5**
§5.1 provides a complete file tree (≈120 paths including config files and CI), §5.2 a naming-convention table, §5.3 a branch/commit/migration workflow, §12.2 the full `package.json` scripts block (24 scripts), §12.7 a CI workflow.

**Testing: 5**
§11.1 defines a four-layer pyramid with tools and coverage targets; §11.2 supplies `vitest.config.ts` and `src/test/db.ts`; §11.3 enumerates ~25 named unit/integration cases per file; §11.4 supplies `playwright.config.ts` and a five-journey table with per-spec assertions.

**Local run: 5**
§12.1 prerequisites (Node 24.21.0, no Docker, N-API prebuilds), §12.4 a five-command copy-paste first run with the expected post-run state, §12.5 a day-to-day command table, §12.3 `.env.example`.

**NFRs: 5**
§13.1 gives eight numeric performance budgets tied to mechanisms; §13.2 a ten-row threat/mitigation table plus an explicit stated non-mitigation (no auth); §13.4 four responsive breakpoints tied to Playwright viewports; §13.5 enumerated WCAG 2.1 AA measures with axe smoke coverage.

**Subtotal: 45 /45 → Scaled: 45 ÷ 45 × 50 = 50.0 /50**

---

## 2. QUALITY (50 pts)

**Feature support: 5**
Browse (§9.1, offset pagination with limit+1 probe), search (§9.2, FTS5), and edit (§9.3, Markdown + live preview, optimistic concurrency) are each served by a direct mechanism with no workaround. Non-required F4/F5 are modeled in schema/API with the retrofit cost rationale stated (§9.6).

**Simplicity: 4**
One `npm install`, one process, one SQLite file, no Docker, no external services — the local-first anchor is met. Deducted one point for measurable setup friction not required by the brief: ~50 pinned packages and a `postinstall` running `playwright install --with-deps chromium webkit` (~400 MB browser download, acknowledged as a risk in §15.3), which makes a fresh clone heavier than the minimum needed for v1.

**Maintainability: 5**
Live registry verification (Appendix A) confirms every named library is on its current stable line: `react@19.3.0`, `tailwindcss@4.3.3`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `better-sqlite3@13.0.3`, `@playwright/test@1.63.0`, `@uiw/react-md-editor@4.1.2` are exact matches for `dist-tags.latest`; `next@16.3.4` (latest 16.3.5), `zod@4.6.2` (latest 4.6.5) and `vitest@5.0.0` (latest 5.0.1) are one patch behind, consistent with the document's stated 2026-09-10 verification date. No named package is deprecated or unmaintained. The deliberate `typescript@6.0.3` pin (D13) is justified by a reproducible `ERESOLVE` against `typescript-eslint@8.70.0`'s `>=4.8.4 <6.1.0` peer range; `typescript@7.0.2` is confirmed as `latest`, so the exception is documented rather than stale.

**Scale path: 5**
§8.9 gives a three-step ordered path (cache components → Postgres via `drizzle-orm/node-postgres` with `tsvector` search → stateless horizontal replicas), and names the structural precondition that makes it cheap (all SQL confined to `src/server/repositories/**`). The single-node ceiling is stated explicitly rather than elided (§15.1).

**Ergonomics: 5**
24 npm scripts including a single `npm run verify` gate identical to CI (§12.2, §12.7); end-to-end type sharing with no codegen step (§10.4); `getDb()`/`setDb()` seam that removes DB mocking from tests (D25); Drizzle Studio, backup, reindex, and integrity-check scripts.

**Evidence: 5**
Repo tree (§5.1), ASCII component diagram (§4), Drizzle schema source (§8.3), generated migration SQL (§8.5), FTS5 DDL and query (§8.1), request/response JSON for every endpoint (§7.3), four config files reproduced in full, and a §3.5 verification table recording seven claims checked by execution (e.g. `PRAGMA compile_options` returning SQLite 3.53.4 with FTS5 enabled; four malformed FTS inputs raising `SqliteError`).

**Subtotal: 29 /30 → Scaled: 29 ÷ 30 × 50 = 48.33 /50**

---

## TOTAL: 50.0 + 48.33 = **98.3 /100**  PASS/FAIL: **PASS** (threshold ≥75)

---

## GATES PASSED

- [x] **Frameworks** — PASSED. Exact versions for all 20 runtime and 29 dev dependencies (§3.2–§3.3), no hedged naming. Live registry checks confirm each named version exists and sits on the current stable line (Appendix A).
- [x] **Data** — PASSED. Three tables with per-column types, constraints, nullability, FK actions (`SET NULL`, `CASCADE`), four indexes, and a relationship diagram (§8.2), backed by Drizzle source (§8.3) and emitted DDL (§8.5).
- [x] **Search** — PASSED. FTS5 external-content table with triggers, bm25 weighting, snippet extraction, query sanitization, and a degradation fallback (§8.1). Not deferred.
- [x] **Repo** — PASSED. Full directory tree (§5.1) and a five-command startup sequence with expected output (§12.4).
- [x] **Scale** — PASSED. §7.1 and §13.1 justify ~100 concurrent users against WAL-mode reader concurrency with bounded, indexed queries; §8.9 documents the path beyond a single node.

---

## STRENGTHS

1. Decision closure: 26 numbered decisions (§17) with alternatives and consequences, plus `[DECISION]`/`[ASSUMPTION]` markers that instruct the developer not to re-litigate. No stack choice is left open.
2. Executable verification rather than assertion: §3.5 records seven claims confirmed by running commands (FTS5 compile flag, trigger correctness on update/delete, bm25 title ranking, malformed-`MATCH` failure, expression-index emission, `ERESOLVE` on TypeScript 7, `server-only` throwing outside the `react-server` condition).
3. Test-infrastructure hazards are pre-solved: the `server-only` export-condition problem, the Vitest 5 removal of `environmentMatchGlobs`, and DB isolation via a `createDatabase` factory are each identified with the exact fix (§8.4, §11.2, D25/D26).
4. Security posture matches the brief's "basic security only" without under-specifying: excluding `rehype-raw` removes the stored-XSS class (D6), and search highlighting uses segment arrays specifically to avoid `dangerouslySetInnerHTML` (§7.3).

## WEAKNESSES

1. Cross-artifact reference drift: §5.1 names the UX deliverable `docs/ux-design.md`; the repository contains `docs/design-spec.md`. The stated tree does not match the delivered tree.
2. `postinstall` browser installation (§12.2) couples `npm install` to a ~400 MB download; the documented mitigation (`--ignore-scripts`) is a manual opt-out rather than the default.
3. Version pins are one patch behind current for `next`, `zod`, and `vitest` at evaluation time. Attributable to the seven-day gap since the document's verification date, not to stale sourcing.
4. The §8.5 `CHECK`-constraint procedure requires hand-editing generated migration SQL before first apply, then regenerating the snapshot — a manual, order-dependent step whose omission is silent.

## COMMENTS

The artifact satisfies the spec's primary criterion — leaving no major implementation decision to the Developer — at every one of the nine completeness areas, and supplies executable-grade evidence (tree, schema, DDL, configs, API contracts) rather than narrative. The only scored deduction is against the Simplicity anchor, for dependency and install-time weight that exceeds what v1 requires. All five pass/fail gates pass. Score: 98.3/100, PASS.

---

## Appendix A: Live version verification (2026-09-17)

| Package | Pinned in spec | `dist-tags.latest` (live) | Status |
|---|---|---|---|
| `next` | 16.3.4 | 16.3.5 | Current line, 1 patch behind |
| `react` / `react-dom` | 19.3.0 | 19.3.0 | Exact match |
| `tailwindcss` | 4.3.3 | 4.3.3 | Exact match |
| `drizzle-orm` | 0.45.2 | 0.45.2 | Exact match |
| `drizzle-kit` | 0.31.10 | 0.31.10 | Exact match |
| `better-sqlite3` | 13.0.3 | 13.0.3 | Exact match |
| `zod` | 4.6.2 | 4.6.5 | Current line, 3 patches behind |
| `typescript` | 6.0.3 (deliberate) | 7.0.2 | Intentional pin, justified in D13 |
| `vitest` | 5.0.0 | 5.0.1 | Current line, 1 patch behind |
| `@playwright/test` | 1.63.0 | 1.63.0 | Exact match |
| `@uiw/react-md-editor` | 4.1.2 | 4.1.2 | Exact match |
| Node.js | 24.21.0 LTS | Node 24 "Krypton" = Active LTS; Node 26 = Current, LTS Oct 2026 | Claim confirmed |

Sources: [registry.npmjs.org](https://registry.npmjs.org/), [Node.js Releases](https://nodejs.org/en/about/previous-releases), [endoflife.date/nodejs](https://endoflife.date/nodejs)

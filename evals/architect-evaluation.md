# Architect Evaluation — Simplified Knowledge Base App

**Artifact evaluated:** `docs/architecture.md` (v1.0, dated 2026-07-10)
**Spec applied:** `evals/architect-measurement-spec.md`
**Evaluation date:** 2026-07-30
**Evaluator:** Automated Expert Software Engineering Evaluator

## Version verification (live lookups performed 2026-07-30)

Registry queried: `https://registry.npmjs.org/<pkg>/latest`; Node release index: `https://nodejs.org/dist/index.json`; supplementary web searches recorded in Sources.

| Package | Spec'd in architecture | Current latest (live) | Status |
|---|---|---|---|
| node | 24.x LTS ≥24.18.0 | 24.18.1 (24.x line); 26.5.1 Current | Current Active LTS line confirmed |
| typescript | 7.0.2 | 7.0.2 | Exact match |
| next | 16.2.10 | 16.2.12 | 2 patches behind |
| react / react-dom | 19.2.7 | 19.2.8 | 1 patch behind |
| tailwindcss / @tailwindcss/postcss | 4.3.2 | 4.3.3 | 1 patch behind |
| prisma / @prisma/client / @prisma/adapter-better-sqlite3 | 7.8.0 | 7.9.1 | 1 minor behind |
| better-sqlite3 | 12.11.1 | 13.0.2 | 1 major behind |
| zod | 4.4.3 | 4.4.3 | Exact match |
| @tiptap/react, starter-kit | 3.27.3 | 3.29.2 | 2 minors behind |
| lucide-react | 1.24.0 | 1.28.0 | 4 minors behind |
| vitest | 4.1.10 | 4.1.10 | Exact match |
| @playwright/test | 1.61.1 | 1.62.0 | 1 minor behind |
| @types/node | 26.1.1 | 26.1.2 | 1 patch behind |
| isomorphic-dompurify | "latest stable" (unpinned) | 3.20.0 | Deferred, not pinned |
| tsx | "latest stable" (unpinned) | 4.23.1 | Deferred, not pinned |

All named libraries are actively maintained releases; none are obsolete or abandoned. Observed drift is consistent with the document's 2026-07-10 authoring date (20 days prior to evaluation).

Two API-currency defects identified against verified current library behavior:
1. §6.2 declares `generator client { provider = "prisma-client-js" }`. The `prisma-client-js` provider is deprecated in Prisma 7 and slated for removal; `prisma-client` is the documented provider for new projects.
2. §7.3 uses `z.string().cuid()` and `z.string().datetime()`. In Zod 4 both chained string-format methods are deprecated in favor of top-level `z.cuid()` and `z.iso.datetime()`.

---

```
Architect Score Sheet: evals_june2026_grok_4.5 (branch evals_june2026_grok_4.5, HEAD 91e9d30)

1. COMPLETENESS (50 pts)
   Front-end: 5
     Notes: §2 pins Next.js 16.2.10 (App Router), React 19.2.7, Tailwind 4.3.2,
     TypeScript 7.0.2. §4.1 fixes per-route rendering strategy; §4.2 gives the exact
     route tree; §4.3 enumerates 18 named components; §4.5 tables state ownership
     (URL searchParams for query/filters, TipTap internal for document, no global
     store); §7.3 fixes TipTap 3.27.3 + starter-kit + Link as the editor with an
     enumerated toolbar set. No front-end decision is left open.

   Back-end: 5
     Notes: §5.1 fixes the style (Next full-stack monolith: RSC reads, Server Action
     writes, Route Handler only for typeahead). §5.2 tables five actions with inputs
     and behavior including optimistic-concurrency semantics on `expectedUpdatedAt`.
     §5.3 gives a literal request line and a 200 JSON response body for
     `GET /api/search` plus limit/rank rules. §8.2 defines the discriminated
     `ActionResult` error contract with a closed code set
     (VALIDATION|NOT_FOUND|CONFLICT|UNIQUE|INTERNAL).

   Data tier: 5
     Notes: §6.2 supplies a complete, compilable Prisma schema (Article, Category,
     Tag, ArticleTag join with composite PK, ArticleStatus enum, two composite
     indexes, cascade/SetNull rules). §6.3 adds a field dictionary with length
     bounds and the slug regex. §6.5 gives the client-singleton source. §6.7 names
     the migration command; §13 specifies seed volumes (≥3 categories, ≥5 tags,
     8–12 mixed-status articles) and required search fixture terms.

   Search: 5
     Notes: §6.4 provides the FTS5 `CREATE VIRTUAL TABLE` DDL with `unicode61`
     tokenizer, the ranked retrieval SQL (`bm25()` ordering, `snippet()` extraction,
     join to Article, status filter), and a four-step `toFtsQuery()` tokenization/
     escaping algorithm with prefix-match suffix. §7.2 states tradeoffs (FTS5 over
     `LIKE`, no stemming, process-local index) and §2.1/§6.8 record the rejected
     alternatives (Meilisearch/Typesense deferred to >10k articles).

   Integration: 5
     Notes: Same-origin single deployable (§3) eliminates CORS by construction, and
     §2.1 records that rejection explicitly. §8.1 traces three concrete data-flow
     paths (browse, typeahead, edit-save); §8.3 tables every endpoint/action with
     method and auth posture; §6.6 gives `.env` and `.env.test` contents; the sole
     env var (`DATABASE_URL`) is specified for dev, test, and Playwright webServer
     (§11.2). Port 3000 and its override are covered in §12.

   Repo: 5
     Notes: §10 gives a full 40-entry directory tree from repo root through
     `src/app`, `src/lib`, `e2e/`, `tests/`, and all config files. §10.1 supplies the
     literal `package.json` scripts block (13 scripts) plus the `prisma.seed` hook.
     §2 assumption A7/decision D9 fixes npm as package manager; §2.1 rejects
     Turborepo with rationale. §14 defines the 11-step implementation workflow.

   Testing: 5
     Notes: §11.1 maps five unit-test areas to concrete cases (slugify unicode/
     collapse, toFtsQuery empty/special/multi-token, excerpt length cap, Zod
     failure modes) and states the Vitest config (node environment, `@/*` alias).
     §11.2 outlines the five-step browse→search→edit critical journey and supplies a
     complete `playwright.config.ts` including `fullyParallel: false` (shared SQLite
     file) and a test-DB `webServer.env`. §11.3 bounds non-MVP scope in line with the
     brief's testing section.

   Local run: 5
     Notes: §12.1 states prerequisites (Node 24.x, npm 10+, native build toolchain
     for better-sqlite3). §12.2 gives the ordered five-command first-run sequence;
     §12.3 tables seven common commands; §12.4 gives `.env.example`; §12.5 tables
     four failure modes with fixes. Seeding is wired via `prisma db seed` → `tsx
     prisma/seed.ts`. No docker-compose, correctly unnecessary for a single-process
     SQLite app.

   NFRs: 4
     Notes: §9 ties decisions to NFRs — WAL + `foreign_keys=ON` pragmas for
     concurrency, `include` to avoid N+1, dynamic `import()` of TipTap for bundle
     size, 250ms debounce, Zod-on-write + sanitize-on-write + built-in Server Action
     CSRF for security, and a five-item a11y baseline (landmarks, label association,
     focus-visible, non-color-only status, skip link). Deduction: performance targets
     are directional rather than budgeted (no TTFB/LCP/query-time numbers), and the
     ~100-concurrent-user claim in §9.1 is asserted from "reads dominate + WAL"
     without a capacity calculation; §11.3 defers load testing entirely.

   Subtotal: 44/45 → Scaled: 44 / 45 × 50 = 48.888… → 48.9 /50

2. QUALITY (50 pts)
   Feature support: 5
     Notes: §1.2 maps all five brief features to architectural mechanisms, and all
     three required v1 features have a dedicated section (§7.1 browse/detail with
     slug routing and `notFound()`, §7.2 search, §7.3 editing with shared
     create/edit form). Optional features 4–5 are absorbed into the schema at low
     cost. Editing satisfies the brief's WYSIWYG-or-Markdown expectation via TipTap.
     Empty states (§7.4) and form validation (§7.3) are explicitly designed.

   Simplicity: 5
     Notes: One process, one SQLite file, zero external services (§3: "No Redis, no
     message queue, no separate API service"), npm only, no global state library.
     §2.1 explicitly rejects Express/FastAPI split, Postgres, MongoDB, Redux/Zustand,
     Turborepo, and Auth0/NextAuth on cost-vs-benefit grounds. Local bring-up is
     five commands.

   Maintainability: 4
     Notes: Live verification (table above) confirms every named library is a current,
     actively maintained release; nothing obsolete. Deductions are for two verified
     API-currency defects that would propagate into implementation: the deprecated
     `prisma-client-js` generator provider (Prisma 7 documents `prisma-client` for new
     projects) and deprecated Zod 4 chained string formats `z.string().cuid()` /
     `z.string().datetime()`. Secondary: `better-sqlite3` is pinned one major behind
     (12.11.1 vs 13.0.2), and two dependencies (`isomorphic-dompurify`, `tsx`) are left
     as "latest stable" rather than pinned, contrary to the section's own convention.

   Scale path: 5
     Notes: §6.8 gives a trigger→change table (multi-instance → Postgres datasource
     swap + tsvector/Meilisearch; >10k articles → external search; auth → Auth.js v5)
     and states the invariant that "schema stays relational; only the driver and
     search backend change." A1 pre-plans auth behind an `AUTH_ENABLED` flag. The app
     tier is stateless, so horizontal scaling is gated only on the DB swap.

   Ergonomics: 5
     Notes: 13 npm scripts including `db:reset`, `db:studio`, `db:seed`, and a
     `postinstall` → `prisma generate`; end-to-end type flow via Prisma-generated
     types plus Zod `z.infer` (`ArticleFormInput`) shared client/server; `@/*` path
     alias; deterministic seed for reproducible local state; troubleshooting table.
     §5.4 states an enforcement rule (pages call `queries/*`/`actions/*`, never raw
     Prisma) that keeps the codebase navigable.

   Evidence: 5
     Notes: Artifact contains an ASCII system diagram (§3), a repo tree (§10), a
     complete Prisma schema (§6.2), FTS DDL and retrieval SQL (§6.4), a TypeScript
     client singleton (§6.5), a Zod schema (§7.3), a TS error-contract type (§8.2),
     an HTTP request + JSON response example (§5.3), a Playwright config (§11.2), a
     package.json scripts block (§10.1), and a 12-row decisions log (§15). Narrative
     is subordinate to artifacts throughout.

   Subtotal: 29/30 → Scaled: 29 / 30 × 50 = 48.333… → 48.3 /50

TOTAL: 48.9 + 48.3 = 97.2 → 97 /100   PASS/FAIL: PASS (threshold ≥75)

GATES PASSED: [x] Frameworks [x] Data [x] Search [x] Repo [x] Scale
```

## Pass/Fail Gate Detail

| # | Gate | Result | Evidence |
|---|---|---|---|
| 1 | Names exact frameworks/versions (no "React-ish") | **PASSED** | §2 pins 16 dependencies to explicit semver (Next 16.2.10, React 19.2.7, Tailwind 4.3.2, Prisma 7.8.0, Zod 4.4.3, TipTap 3.27.3, Vitest 4.1.10, Playwright 1.61.1, better-sqlite3 12.11.1, TypeScript 7.0.2, Node 24.18.0). Live registry verification confirms every named version exists and belongs to a currently maintained line; TypeScript 7.0.2, Zod 4.4.3, and Vitest 4.1.10 are exact matches to current latest. Only `dotenv`, `isomorphic-dompurify`, and `tsx` are left as "latest stable" — insufficient to fail a gate whose bar is exact framework naming, but noted as a weakness. |
| 2 | Defines data model for articles (fields/relations) | **PASSED** | §6.2 Prisma schema defines `Article` with 10 fields, an `ArticleStatus` enum, optional `Category` FK (`onDelete: SetNull`), many-to-many tags via `ArticleTag` (composite PK, cascade delete), and two composite indexes. §6.3 adds per-field types and constraints. |
| 3 | Specifies search strategy (not deferred) | **PASSED** | §6.4 + §7.2 specify SQLite FTS5 (`unicode61`), application-side index sync on CUD, bm25 ranking, `snippet()` highlighting, published-only typeahead scope, and a defined query-sanitization/prefix-match algorithm. Not deferred. |
| 4 | Provides repo layout and local startup steps | **PASSED** | §10 full directory tree + §10.1 scripts; §12.2 ordered install → env → migrate → seed → dev sequence with the resulting URL, plus §12.3 command table and §12.5 troubleshooting. |
| 5 | Addresses ~100 user scale path | **PASSED** | §1.1 states the 100-concurrent-user target maps to a single Node process + SQLite; §9.1 addresses it via WAL journaling, read-dominant workload, indexed queries, and bounded page/search limits; §6.8 defines the escalation path to Postgres and external search. Claim is reasoned, not measured (see NFR deduction). |

## Strengths

1. **Implementation-ready specificity.** Every layer terminates in a copyable artifact rather than a directive: full Prisma schema, FTS5 DDL and retrieval SQL, client singleton, Zod schema, Playwright config, scripts block. The stated success criterion in §17 ("implement search and edit without choosing a different stack") is met by the document's own content.
2. **Explicit negative space.** §2.1 (7 rejected alternatives), §15 (12-row decisions log with tradeoffs), §16 (8 out-of-scope items), and §1.3 (8 labeled assumptions A1–A8) remove ambiguity that would otherwise become developer-time decisions.
3. **Version discipline with dated verification.** The stack table records a verification date and pins concrete semver, and independent live verification found no fabricated or abandoned package.
4. **Correctness details typically omitted at this altitude.** Optimistic concurrency via `expectedUpdatedAt` (D10), sanitize-on-write with an explicit tag/attribute allowlist (§8.4), FTS query escaping (§6.4), old-and-new slug revalidation on rename (§5.5), and `fullyParallel: false` for a shared SQLite test file (§11.2).
5. **Scope control aligned to the brief.** Features 4–5 are justified as low-cost schema additions with a stated fallback ordering (§1.2: 1→3→2→5→4) if session time compresses.

## Weaknesses

1. **Two deprecated APIs baked into code samples** (verified live): `prisma-client-js` generator provider and Zod 4 chained `z.string().cuid()` / `z.string().datetime()`. A developer copying §6.2 and §7.3 verbatim inherits deprecation warnings and a future breaking upgrade.
2. **Quantitative NFR targets absent.** §9.1 lists performance approaches without budgets (no TTFB/LCP/query-latency thresholds), and the 100-concurrent-user assertion rests on qualitative reasoning with load testing explicitly deferred (§11.3).
3. **Three dependencies left unpinned** ("latest stable" for `dotenv`, `isomorphic-dompurify`, `tsx`), and §8.4 defers the final sanitizer selection to implementation time ("verify npm version during install") — a residual, if minor, decision passed to the developer.
4. **Residual optionality in two places.** §4.4 offers custom prose CSS "or" `@tailwindcss/typography`, and §7.1 offers `force-dynamic` "or" time-based revalidation; both state a preference, so the ambiguity is low-cost but non-zero.
5. **`better-sqlite3` one major version behind current** (12.11.1 vs 13.0.2), against a brief goal of "latest stable libraries where practical."

## Comments

The artifact satisfies the spec's stated emphasis on decision completeness, choice quality, and evidence quality. The single completeness deduction (NFRs) and single quality deduction (maintainability) are both narrow and specific, and neither affects a pass/fail gate. Scoring is bounded strictly by the nine completeness areas and six quality criteria in the measurement spec; UX, planning, and implementation artifacts present in `docs/` were not considered. The scaling arithmetic is stated inline: 44/45 × 50 = 48.9 and 29/30 × 50 = 48.3, summing to 97/100 against a ≥75 pass bar.

## Sources

- npm registry `latest` dist-tags (queried 2026-07-30): `https://registry.npmjs.org/typescript/latest`, `/next/latest`, `/react/latest`, `/tailwindcss/latest`, `/prisma/latest`, `/@prisma%2fclient/latest`, `/@prisma%2fadapter-better-sqlite3/latest`, `/better-sqlite3/latest`, `/zod/latest`, `/@tiptap%2freact/latest`, `/@tiptap%2fstarter-kit/latest`, `/lucide-react/latest`, `/vitest/latest`, `/@playwright%2ftest/latest`, `/@types%2fnode/latest`, `/isomorphic-dompurify/latest`, `/tsx/latest`
- [Node.js release index (nodejs.org/dist/index.json)](https://nodejs.org/dist/index.json)
- [Node.js — Previous Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js 24 (LTS) — VersionLog](https://versionlog.com/nodejs/24/)
- [Next.js 16 (LTS) — VersionLog](https://versionlog.com/nextjs/16/)
- [Tailwind CSS Latest Version — VersionLog](https://versionlog.com/tailwind-css/)
- [Upgrade to Prisma ORM 7 — Prisma Docs](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Generators (Reference) — Prisma Docs](https://www.prisma.io/docs/orm/prisma-schema/overview/generators)
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog)
- [Defining schemas — Zod](https://zod.dev/api)

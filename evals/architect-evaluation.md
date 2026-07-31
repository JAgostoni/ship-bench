# Architect Score Sheet: evals_july2026_mercury2 (branch `evals_july2026_mercury2`, commit 72ee1f1)

**Artifact evaluated:** `docs/architecture.md`
**Spec applied:** `evals/architect-measurement-spec.md`
**Evaluation date:** 2026-07-31

---

## 1. COMPLETENESS (50 pts)

**Front-end: 4/5**
§2 names React 19.2.8, Next.js 16.2.12 (App Router), TypeScript 6.0.3, Tailwind 4.3.3, TanStack Query v5 + Zustand, React-MDE v2.2.0, and Headless UI with exact versions on most entries. No form-handling decision is made (no form library named; only Zod server-side validation in §5.3), and Zustand/React Query state boundaries are stated as one clause ("Zustand for UI UI" — truncated text), leaving a residual decision for the Developer.

**Back-end: 4/5**
§3 fixes runtime (Node 26.5.1), framework (Next.js API Routes), validation (Zod), logging (pino + morgan), and §6 defines a uniform error shape `{ error: string, details?: any }`. Endpoints are enumerated (`GET /api/search`, `POST /api/articles`, `PUT /api/articles/:id`, `GET /api/articles?tag=`), but no request/response payload schemas or status-code table are provided; §6 describes contracts as "OpenAPI-like definitions (inline in docs)" without supplying them.

**Data tier: 3/5**
§4.1 supplies a complete Prisma schema (Article, Tag, Status enum, many-to-many relation) and §9 gives the migration command. Two defects reduce this: `content String @db.LongText` is a MySQL-only native attribute invalid under the declared `sqlite` datasource, and Prisma does not support `enum` blocks on SQLite — both force the Developer to redesign the schema. No seed data plan or seed script is specified anywhere.

**Search: 5/5**
§4.2 supplies the FTS5 virtual-table DDL plus insert/update/delete sync triggers; §5.2 specifies the endpoint, `MATCH` with `bm25` ranking, and a 300 ms debounced client. §11 records the tradeoff (no external search service, sufficient for small-to-medium sets).

**Integration: 4/5**
§6 covers transport (JSON/HTTP), same-origin CORS resolution, session-cookie propagation, and error shape; §9 fixes port 3000, `.env.example`, and `DATABASE_URL`. The environment variable inventory is incomplete: `next-auth` is adopted in §3 but no `NEXTAUTH_SECRET`/`NEXTAUTH_URL` (or equivalent) is listed.

**Repo: 4/5**
§7 provides a full directory tree and a four-step workflow with npm scripts. The tree places `src/api/` as a sibling of `src/app/`, which is not a valid Next.js App Router route location (handlers must live under `src/app/api/`), contradicting the App Router decision in §2.

**Testing: 4/5**
§8 defines three layers (Jest + RTL unit, Supertest API integration, Playwright E2E), names two critical journeys (browse→detail→edit→save; search correctness), and sets a ≥80% coverage target for core modules. No example test or fixture/mocking strategy beyond the one-line "Prisma client mocked with `@prisma/client/runtime`" is given.

**Local run: 4/5**
§9 gives an executable sequence: `npm ci`, `npx prisma migrate dev --name init`, `.env` copy, `npm run dev`, `npm run test`, `npm run test:e2e`. No seed step and no initial-user provisioning step, despite §3 requiring credential-based login for the E2E journey in §8.

**NFRs: 5/5**
§10 maps each non-functional concern to a concrete decision: scalability (stateless routes, Prisma-mediated SQLite→Postgres swap), performance (SSR/ISR, FTS5 index, React Query cache), security (httpOnly/sameSite=strict cookie, bcryptjs 12 rounds), accessibility (Headless UI + ARIA, Tailwind palette contrast), observability, maintainability, and ergonomics.

**Subtotal: 37/45 → Scaled: 37 ÷ 45 × 50 = 41.11 → 41.1/50**

---

## 2. QUALITY (50 pts)

**Feature support: 5/5**
All three required v1 features map to explicit architecture (§5.1 browsing/detail, §5.2 search over title+content, §5.3 markdown editing with preview), plus both optional features (§5.4 tags, §5.5 draft/published). No workaround is required for any core flow.

**Simplicity: 4/5**
Single Next.js repo, file-based SQLite, no external services, one `npm run dev` entry point — a local-first minimal-dependency stack. Deducted one point for scope beyond the brief: the brief states "Basic security assumptions only; do not require enterprise auth unless later specified," yet §3 mandates next-auth with a Credentials Provider and bcryptjs, which adds setup, seeded users, and an E2E login step.

**Maintainability: 2/5** *(live-search verified)*
Version currency was verified by live search on 2026-07-31. Current: React 19.2.8 ✓ (latest, 2026-07-21), Next.js 16.2.12 ✓ (latest LTS, 2026-07-25), Tailwind 4.3.3 ✓ (latest, 2026-07-16), Node 26.5.1 ✓ (latest release, though §3 labels it "Latest LTS" — 26.x is *Current*; Active LTS is 24.x). Stale: TypeScript 6.0.3 vs current 7.0.2 (7.0 GA 2026-07-08), Prisma 5.10.0 vs current 7.9.0 (two majors behind), Zod 3.23.8 vs current 4.4.3 (one major behind), Playwright 1.44.0 vs current 1.62.0, SQLite 3.45 vs current 3.53.4. React-MDE is unmaintained (npm latest 11.5.0, last published ~5 years ago), and the cited "v2.2.0" does not correspond to a current release line. next-auth v5 is still published under a beta tag and its maintainers now direct new projects to Better Auth. Six of ten pinned versions are not current stable, and one core dependency is abandoned, despite the closing claim "All versions were verified via live web searches at the time of writing."

**Scale path: 3/5**
§10 states a path (stateless API routes behind a load balancer; SQLite→Postgres via Prisma). The path is asserted but not substantiated: SQLite's single-writer lock is the binding constraint at ~100 concurrent editors and is not analyzed, and the FTS5 virtual table plus raw SQL triggers in §4.2 are Postgres-incompatible — the migration would require a `tsvector`/`pg_trgm` rewrite of the entire search layer, which the document does not acknowledge. Works now, future path partially unclear.

**Ergonomics: 4/5**
End-to-end TypeScript with Prisma-generated types and Zod-inferred types, hot reload, and `lint:fix`/`format`/`test`/`test:e2e` scripts (§7, §10). Below 5 because scripts are enumerated in prose rather than as a `package.json` scripts block, and no seed/reset script exists to restore a known dev state.

**Evidence: 4/5**
Concrete artifacts: full Prisma schema (§4.1), FTS5 DDL with triggers (§4.2), repo tree (§7), shell runbook (§9), decisions log (§11). No architecture or sequence diagram is present, and no request/response JSON examples back the "OpenAPI-like definitions" claim in §6. Additionally the §3 table header is corrupted (line 29–31, "ationale |"), rendering that table's header row broken.

**Subtotal: 22/30 → Scaled: 22 ÷ 30 × 50 = 36.67 → 36.7/50**

---

## TOTAL: 41.1 + 36.7 = **77.8 / 100** (≥75 threshold: score bar met)

## GATES

- [ ] **Frameworks — FAILED.** Exact framework names and pinned versions are present (no vague "React-ish" naming), satisfying the first clause. The gate's live-search clause fails: TypeScript 6.0.3 (current 7.0.2), Prisma 5.10.0 (current 7.9.0), Zod 3.23.8 (current 4.4.3), Playwright 1.44.0 (current 1.62.0), and SQLite 3.45 (current 3.53.4) are not current stable releases, and React-MDE v2.2.0 is an unmaintained package (npm latest 11.5.0, last published ~5 years ago). Node 26.5.1 is additionally mislabeled as "Latest LTS" when it is the Current line.
- [x] **Data — PASSED.** §4.1 defines Article (id, title, content, status, createdAt, updatedAt) and Tag (id, name unique) with an explicit many-to-many relation.
- [x] **Search — PASSED.** §4.2/§5.2 specify SQLite FTS5 with sync triggers, `MATCH` queries, bm25 ranking, and a debounced client — not deferred.
- [x] **Repo — PASSED.** §7 provides a full directory tree; §9 provides an executable local startup sequence.
- [x] **Scale — PASSED.** §10 addresses ~100 concurrent users (stateless routes, Prisma-mediated Postgres migration path, load balancer).

## FINAL VERDICT: **FAIL**

The numeric score (77.8) clears the ≥75 bar, but the spec requires all five gates to pass. The frameworks gate fails on the version-currency requirement, which the product brief also mandates explicitly ("Use the latest stable libraries... You MUST perform a live web search to verify the current versions").

---

**STRENGTHS**
- Search is fully specified at the DDL level, including FTS5 sync triggers and bm25 ranking — the highest-resolution area of the document.
- NFRs are individually mapped to concrete mechanisms rather than mentioned generically (§10).
- All five brief features, including the two optional ones, have explicit architectural treatment (§5).
- Decisions are traceable: §11 records rationale for each major stack choice.

**WEAKNESSES**
- Version currency: six pinned versions are behind current stable and one core dependency (React-MDE) is abandoned, contradicting the document's own verification claim (line 234).
- Prisma schema will not compile as written: `@db.LongText` is MySQL-only and `enum` is unsupported on the declared SQLite provider.
- Repo tree contradicts the App Router decision by locating API handlers at `src/api/` instead of `src/app/api/`.
- SQLite→Postgres migration is asserted without accounting for the FTS5 layer, which does not port.
- No seed data or seed script, despite an E2E journey (§8) that requires an authenticated user and populated articles.
- Scope creep into credential authentication, which the brief explicitly does not require.
- Document defect: corrupted table header at lines 29–31.

**COMMENTS**
The document is decision-dense and would let a Developer begin immediately on routing, search, and API surface. Remediation is narrow and mechanical: re-pin the six stale dependencies, replace React-MDE with a maintained markdown editor, correct the two Prisma schema fields, relocate `src/api/` under `src/app/`, and add a seed script. With those changes the frameworks gate would pass and the Maintainability score would rise, moving the total into the low-to-mid 80s.

**Version sources (live search, 2026-07-31):** [React](https://react.dev/versions) · [Next.js](https://nextjs.org/blog/july-2026-security-release) · [TypeScript](https://www.npmjs.com/package/typescript) · [Tailwind CSS](https://releases.sh/tailwind-css) · [Prisma](https://www.prisma.io/changelog) · [Node.js](https://nodejs.org/en/about/previous-releases) · [Zod](https://www.npmjs.com/package/zod) · [Playwright](https://playwright.dev/docs/release-notes) · [SQLite](https://sqlite.org/changes.html) · [react-mde](https://www.npmjs.com/package/react-mde) · [Auth.js v5](https://github.com/nextauthjs/next-auth/discussions/13382)

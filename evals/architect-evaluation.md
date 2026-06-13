# Architect Score Sheet: evals_jun10_fable

Artifact evaluated: `docs/architecture.md` (Technical Architecture Spec v1)
Spec applied: `evals/architect-measurement-spec.md`
Date: 2026-06-13

Version claims were re-verified by live web search on the evaluation date (2026-06-13); results are cited inline below. The spec mandates this for any version/currency criterion and the "exact frameworks/versions" gate.

---

## 1. COMPLETENESS (50 pts)

**Front-end: 5**
Names exact versions (Next.js 16.2.7, React 19.2.x, Tailwind 4.3.0), full route table (§2), explicit state decision (`useState`/`useTransition` + URL params, no state library), controlled forms with Zod, and editor choice (textarea + react-markdown). No decisions deferred.

**Back-end: 5**
Next.js Route Handlers with strict 4-layer separation (§3), REST API style, Zod validation on every write, and a concrete error contract (`{error:{code,message,fieldErrors}}`) with status-code mapping and worked request/response examples (§6.2).

**Data tier: 5**
Full `articles` schema with column types/constraints (§4.1), Drizzle schema code (§4.2), migration runner strategy (auto-migrate on boot + `--custom` SQL for FTS), and a 12-row seed script. Complete model + migrations + seeds.

**Search: 5**
SQLite FTS5 external-content table with triggers, an input sanitizer for FTS query syntax, `bm25` weighted ranking, `snippet()` excerpts, and explicit tradeoffs rejecting `LIKE` and Meilisearch (§5.1, §11). Concrete strategy with tradeoffs.

**Integration: 5**
Defines read path (RSC → repo, no HTTP) vs write/search path (client → REST → repo), a complete endpoint contract table with examples, shared `z.infer` types, and env/port setup (§6, §9). Full contracts and env setup.

**Repo: 5**
Complete directory tree (§7.1), npm with committed lockfile, `.nvmrc`/engines pin, branching model, and a scripts table (§7.2). Tree + scripts + workflow present.

**Testing: 5**
Layered strategy: Vitest unit/integration with named test files and specific cases (sanitizer edge cases, Zod boundaries), plus Playwright E2E with the brief-mandated browse→search→edit journey and secondary specs (§8). Examples included.

**Local run: 5**
Clone/install/seed/dev sequence, optional vs required steps, `.env.example` vars (`DATABASE_PATH`, `PORT`), production-style run, and reset procedure (§9). Docker-compose is absent but deliberately unnecessary (zero external services); startup steps, scripts, and seeds are fully specified.

**NFRs: 5**
Dedicated table (§10) tying explicit design decisions to each NFR: 100-user scale (WAL + busy_timeout), performance (FTS5, narrow list select, RSC streaming), responsive breakpoints, validation, v1-scoped security, v1-scoped accessibility, and empty states.

Subtotal: 45 /45 → Scaled: 45/45 × 50 = **50 /50**

---

## 2. QUALITY (50 pts)

**Feature support: 5**
Stack supports all three required v1 flows cleanly: RSC list/detail for browse, FTS5 for title+content search, textarea + react-markdown for edit. No awkward workarounds.

**Simplicity: 5**
Local-first, minimal dependencies: one Node process, one repo, one SQLite file, no external services or containers required. Matches the brief's "easy to run locally."

**Maintainability: 5**
All named libraries confirmed as current stable releases via live search on 2026-06-13: Next.js 16.2.7 (current stable), Node 24 (Active LTS), React 19.2.x (latest 19.2.7), TypeScript 6.0.3 (latest stable), Tailwind 4.3.0 (latest stable), better-sqlite3 12.10.0 (latest), Drizzle ORM 0.45.2 (latest stable; 1.0 still RC/beta — correctly avoided), Zod 4.4.3 (latest stable), react-markdown 10.1.0 (latest), Vitest 4.1.8 (latest stable), Playwright 1.60.0 (latest). Modern, ergonomic, documented; no obsolete or unmaintained choices.

**Scale path: 5**
SQLite WAL is justified for ~100 read-heavy users; a concrete future path is documented (Drizzle dialect swap to Postgres, FTS5→`tsvector`, stateless app layer behind a proxy), isolated behind `repo/articles.ts`. Clear path beyond current scale.

**Ergonomics: 5**
TypeScript strict mode, shared Zod schemas across client/server, a consolidated `npm run check` gate, and a full script set streamline development.

**Evidence: 5**
Repo tree, Drizzle schema, raw SQL migration with triggers, search query shape, worked API request/response examples, and a cited version-source list (§14). Concrete artifacts throughout, not narrative.

Subtotal: 30 /30 → Scaled: 30/30 × 50 = **50 /50**

---

TOTAL: **100 /100**  PASS/FAIL: **[PASS]** (threshold ≥75)

GATES PASSED: [✔] Frameworks  [✔] Data  [✔] Search  [✔] Repo  [✔] Scale

- **Frameworks (exact versions):** PASS — every dependency pinned to an exact version; all confirmed current stable by live search on 2026-06-13.
- **Data model:** PASS — `articles` fields, types, and constraints fully defined (§4.1–4.2), plus FTS index relation.
- **Search strategy:** PASS — FTS5 with triggers, sanitizer, ranking, and snippets specified in detail; not deferred.
- **Repo layout + local startup:** PASS — full tree (§7.1) and startup commands (§9).
- **~100 user scale:** PASS — addressed explicitly with WAL/busy_timeout rationale and a documented scale-out path (§10).

---

STRENGTHS:
- Every Section-1 area is decided to the "Complete" anchor; no major implementation decision is left to the Developer.
- All version claims independently verified as current stable; deliberate, justified avoidance of pre-release versions (Drizzle 1.0 RC, TypeScript 7.0 beta, Node 26 Current).
- Strong evidence density: schema code, SQL migration, API contract examples, and cited sources.
- Tradeoffs are explicit (decisions log §13), including rejected alternatives.

WEAKNESSES:
- Local-run section omits any containerized option (the spec's "5" anchor lists docker-compose); justified by the zero-service SQLite design but means cross-machine native-build reproducibility relies on better-sqlite3 prebuilds.
- Scale path rests on SQLite single-writer serialization; correct for the stated read-heavy assumption, but a sustained write-heavy regime would force the documented Postgres migration earlier than implied.

COMMENTS:
The specification meets the top anchor for all 15 scored items and passes all five gates. Version currency was the only criterion at risk of internal-knowledge error; live search confirmed each claim, so no score adjustment was warranted. Final verdict: PASS (100/100).

Sources (live search, 2026-06-13): [npm next](https://nextjs.org/blog), [endoflife.date/nodejs](https://endoflife.date/nodejs), [react.dev/versions](https://react.dev/versions), [TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), [versionlog.com/tailwind-css](https://versionlog.com/tailwind-css/), [npm better-sqlite3](https://www.npmjs.com/package/better-sqlite3), [npm drizzle-orm](https://www.npmjs.com/drizzle-orm), [npm zod](https://www.npmjs.com/package/zod), [npm react-markdown](https://www.npmjs.com/package/react-markdown), [npm vitest](https://www.npmjs.com/package/vitest), [Playwright 1.60](https://github.com/microsoft/playwright/releases)

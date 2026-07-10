# Iteration 1 Summary — Foundation

**Date:** 2026-07-10  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

### Scaffold and tooling

- Next.js **16.2.10** App Router app at repo root with TypeScript, `src/` directory, and `@/*` path alias
- Tailwind CSS **4.3.2** + `@tailwindcss/postcss` with design tokens from `design-spec.md` §5.1 and `.prose-article` rules (§5.2)
- Package scripts per architecture §10.1: `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `test:e2e`, `db:*`, `postinstall` → `prisma generate`
- Vitest **4.1.10** wired (`vitest.config.ts` + smoke unit test)
- Playwright **1.61.1** installed (full E2E config deferred to Iteration 6)
- `.env.example`, local `.env`, optional `.env.test`; `.gitignore` for DBs, env, Next/Playwright artifacts

### Data layer

- Prisma **7.8.0** schema: `Category`, `Tag`, `Article`, `ArticleTag`, `ArticleStatus` enum (architecture §6.2)
- Initial migration `init_articles`
- `src/lib/db.ts` — Prisma client + `@prisma/adapter-better-sqlite3`, WAL / foreign_keys helpers
- `prisma/sql/fts_init.sql` + `src/lib/fts.ts` — `ensureFtsSchema`, `syncArticleToFts`, `removeArticleFromFts`, `toFtsQuery`
- Seed (`prisma/seed.ts`): **4** categories, **6** tags, **10** articles (8 published / 2 draft), FTS rows for all articles; distinctive terms `onboarding`, `deploy`, `vacation`; one uncategorized article

### Pure utilities

| Module | Exports |
|--------|---------|
| `src/lib/utils/slugify.ts` | `slugify` |
| `src/lib/utils/excerpt.ts` | `stripHtml`, `makeExcerpt` |
| `src/lib/utils/sanitize.ts` | `sanitizeHtml` (DOMPurify when available + allowlist fallback) |

### App shell (placeholder product UI)

- `AppHeader` — sticky header, wordmark “Knowledge Base”, disabled search input, “New article” → `/articles/new`
- `AppShell` — `max-w-5xl` + `main#main-content`
- Skip link “Skip to content”
- Home placeholder: “Knowledge Base — data layer ready”
- Design tokens and calm shell styling applied

### Docs

- Root `README.md` with Node 24 prerequisites, first-time setup, commands, troubleshooting

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| **Prisma 7 config** | Architecture §6.2 shows `url` in `schema.prisma`. Prisma 7 requires the URL in `prisma.config.ts` and a datasource without `url` in the schema. Models match the spec; config shape follows Prisma 7. |
| **Node version** | Architecture pins Node **24.x**. This machine ran **Node 25.4.0**; `engines` field requires `>=24`. Prefer Node 24 in CI/other machines. |
| **TypeScript** | Architecture mentions TS 7.0.2; create-next-app / Next 16 ship with TypeScript **5.x**. Left on TS 5 for Next compatibility. |
| **React patch** | Spec lists 19.2.7; installed **19.2.4** (latest available at scaffold time under the Next template). |
| **TipTap** | Intentionally **not** installed (Iteration 3). |
| **Search / list / editor** | Out of scope; search input is disabled placeholder; `/articles/new` will 404 until Iteration 3. |
| **FTS path** | FTS virtual table is created in seed / `ensureFtsSchema`, not in Prisma migrate (as designed). |
| **SQLite path resolution** | Adapter resolves `file:./prisma/dev.db` from project root via absolute path conversion in `db.ts` and seed. |

---

## Verification (local)

Commands run successfully:

```text
npx prisma migrate dev --name init_articles   # OK
npm run db:seed                               # 4 categories, 6 tags, 10 articles + 10 FTS rows
npm test                                      # 1 smoke test passed
npm run build                                 # (see session log)
npm run dev                                   # http://localhost:3000
```

Homepage checks:

- HTTP 200
- Skip link, sticky header, “Knowledge Base” wordmark, “New article”, search placeholder
- Body copy: “Knowledge Base — data layer ready”

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| I1-D1 | Use `prisma.config.ts` for datasource URL + seed command | Required by Prisma 7; keeps models aligned with architecture §6.2 |
| I1-D2 | Resolve SQLite file paths to absolute paths in client/seed | Avoids CWD vs schema-relative path mismatches with better-sqlite3 adapter |
| I1-D3 | Complete `sanitizeHtml` in Iteration 1 (not only stubs) | Iteration brief strongly recommends it so Iteration 2 detail can render safely |
| I1-D4 | Seed uses a dedicated Prisma client + relative util imports | Avoids `@/` alias and Next singleton coupling in CLI seed |
| I1-D5 | Disabled search input (not a stub client component) | Clear non-functional UX until Iteration 5; no broken JS |
| I1-D6 | One smoke Vitest test for `slugify` | Satisfies “`npm test` exits 0”; full suite is Iteration 6 |
| I1-D7 | Defer TipTap install | Iteration 1 brief preference; keeps install focused |

---

## Out of scope (noted, not built)

- Article list queries / list UI / detail pages (Iteration 2)
- Create/edit/delete Server Actions and TipTap form (Iteration 3)
- Category/tag filter UI (Iteration 4)
- Search API + typeahead + `/search` (Iteration 5)
- Playwright journey, conflict UX polish, error boundary polish (Iteration 6)

---

## How to re-run

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

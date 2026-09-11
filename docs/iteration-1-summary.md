# Iteration 1 Summary — Foundation: repo, toolchain, database, seed

**Status:** Complete. `npm run verify` exits 0 and the app runs locally.

**Goal (met).** A fresh clone runs `npm install && npm run db:setup && npm run dev`, renders a styled page at `http://localhost:3000`, and `npm run verify` passes. The data layer is real: migrated, FTS5-bootstrapped, seeded, and queryable from a script.

---

## 1. What was built

### 1.1 Scaffold and pinned toolchain
`package.json` at the repository root (`"type": "module"`, `engines.node: ">=24.21.0 <25"`) with **all 52 dependencies from `architecture.md` §3.2–§3.3 pinned to exact versions** (no `^`, no `~`), the full `scripts` block from §12.2 verbatim, and `postinstall: playwright install --with-deps chromium webkit`. Added `.nvmrc` (`24.21.0`), `.gitignore`, `data/.gitkeep`.

Every pinned version was verified against the live npm registry before installation — all 52 resolved.

### 1.2 Configuration
`tsconfig.json` (strict, ES2022, bundler resolution, `@/*` alias), `eslint.config.mjs` (ESLint flat config extending `eslint-config-next` + the structural `no-restricted-imports` rule), `prettier.config.mjs`, `postcss.config.mjs`, `next.config.ts` (five security headers + CSP verbatim from §12.6, `cacheComponents` off per D14).

### 1.3 Tailwind v4 tokens and root shell
`src/app/globals.css` with the complete token block from `design-spec.md` §8.1 copied verbatim — no `tailwind.config.js`. Plus `layout.tsx` (ThemeProvider, SkipLink, `<main id="main" tabIndex={-1}>`), the temporary `page.tsx`, `skip-link.tsx`, and `theme-provider.tsx`.

### 1.4 Environment validation
`src/lib/env.ts` with the exact Zod schema from §12.3 (deliberately **without** `import 'server-only'`), `.env.example`, and `.env.local`.

### 1.5 Schema and migrations
`src/server/db/schema.ts` matching §8.3 exactly (including the `lower(name)` expression unique index), `drizzle.config.ts`, and two committed migrations:
- `drizzle/0000_init.sql` — generated, then hand-edited to add the `status` `CHECK` constraint **before first apply**.
- `drizzle/0001_article_constraints.sql` — the `articles_title_idx` NOCASE index.

### 1.6 Database client and FTS5 bootstrap
All six modules under `src/server/db/` with the exact `server-only` placement from the spec's table, plus `src/instrumentation.ts`.

### 1.7 Idempotent seed
`src/server/db/seed.ts` — 4 categories, 9 articles (7 published + 2 draft), 11 revisions.

### 1.8 Database scripts
`scripts/db-setup.ts` (`--fresh`, `--reindex`, `--check`, `--seed`), `scripts/seed.ts`, `scripts/backup.ts`.

### 1.9 Verify gate and CI
`vitest.config.ts` (two-project `node`/`components` split with `extends: true`), `src/test/setup.ts`, a placeholder test in `src/lib/`, `.github/workflows/ci.yml` verbatim from §12.7, and `.github/pull_request_template.md`.

---

## 2. Verification evidence

Every claim below was produced by running the command in this environment.

| Criterion | Command | Result |
|---|---|---|
| Node/npm versions | `node -v` / `npm -v` | `v24.21.0` / `11.19.0` ✅ |
| TypeScript pinned | `npm ls typescript` | `6.0.3` ✅ |
| `better-sqlite3` prebuild + FTS5 | `node -e "..."` | SQLite `3.53.4`, `ENABLE_FTS5` present, no native build ✅ |
| Typecheck | `npx tsc --noEmit` | exit 0 ✅ |
| Lint | `npx eslint .` | exit 0 (1 warning, see §4) ✅ |
| Formatting | `npm run format:check` | "All matched files use Prettier code style" ✅ |
| Tests | `npm run test:run` | 1 passed ✅ |
| Build | `npm run build` | compiled, 3 static pages ✅ |
| **Full gate** | **`npm run verify`** | **exit 0** ✅ |
| Migrations + seed | `npm run db:setup` | "Database ready at ./data/kb.db" ✅ |
| Integrity | `npm run db:check` | `integrity_check: ok`, `foreign_key_check: clean`, exit 0 ✅ |
| Seed idempotency | `npm run db:seed` ×2 | 4 categories / 9 articles / 11 revisions / 9 FTS rows unchanged ✅ |
| FTS index populated | `select count(*) from article_search` | **9** ✅ |
| FTS objects | virtual table + 3 triggers | **4** ✅ |
| FTS index consistent | `INSERT INTO article_search(article_search) VALUES ('integrity-check')` | consistent ✅ |
| FTS triggers live | `MATCH 'deploy*'` | 3 results, title match ranked first ✅ |
| Reindex recovery | corrupt index → `npm run db:reindex` | `deploy*` went 2 → 3 ✅ |
| Backup | `npm run db:backup` | valid snapshot, 9 articles, `integrity_check: ok` ✅ |
| Reset | `npm run db:reset` | dropped, migrated, re-seeded ✅ |
| Env validation (default) | `tsx -e "import {env}..."` | `DATABASE_FILE = ./data/kb.db` ✅ |
| Env validation (invalid) | `LOG_LEVEL=bogus` | Zod error naming `LOG_LEVEL` ✅ |
| Dev server renders | `GET localhost:3000` | HTTP 200, styled page ✅ |
| Design tokens compile | inspect emitted CSS | `--color-surface`, `--color-ink`, `--color-ink-muted`, `--radius-card` all resolve to real values; `.bg-surface`, `.text-ink-muted`, `.rounded-card` utilities emitted ✅ |
| Dark mode | inspect emitted CSS | `.dark` block overrides `--color-surface` to `#101419` ✅ |
| Reduced motion | inspect emitted CSS | `prefers-reduced-motion` block present ✅ |
| Security headers | `GET /` | all five present incl. full CSP ✅ |
| Structural rule works | import `drizzle-orm` from `src/components/` | ESLint error, exit 1 ✅ |
| CI YAML valid | `yaml.safe_load` | parses; 1 job, 12 steps ✅ |
| `data/` gitignore | `git check-ignore` / `git add -An` | only `data/.gitkeep` tracked ✅ |
| Fresh-clone rehearsal | delete db + `.env.local` → `db:setup` → `dev` | HTTP 200, title from `NEXT_PUBLIC_APP_NAME` ✅ |

---

## 3. Assumptions made

1. **Node upgraded to 24.21.0 before starting.** The environment had Node 24.10.0 / npm 11.6.1. This matters: `jsdom@30.0.1` requires Node `^24.15.0`, so 24.10.0 was below a dependency's engine floor, and task 1.1's acceptance criterion is `node -v` = 24.21.x. The user upgraded via nvm; no workaround was applied.
2. **`0001_article_constraints.sql` needs a hand-written `_journal.json` entry.** `drizzle-orm`'s `readMigrationFiles` only reads SQL files listed in `drizzle/meta/_journal.json` (verified by reading `node_modules/drizzle-orm/migrator.js`). Dropping the file in without a journal entry — which §8.5's prose implies is sufficient — would silently skip the `articles_title_idx` index. The entry was added, and the index is confirmed present in the applied schema. This is the same class of problem that D21 identifies for the FTS5 DDL.
3. **`scripts/**` and `src/test/**` are exempt from the `no-restricted-imports` rule.** The rule's purpose is keeping the driver out of **client** bundles. `architecture.md` §14.1 itself requires `scripts/db-setup.ts` to import `drizzle-orm` and its migrator, so a rule that blocks them would contradict the spec. Verified the rule still fails the build for an import from `src/components/`.
4. **Iteration 2 owns the coverage thresholds.** `npm run verify` runs `test:run` (no coverage) per §12.2; only CI runs `--coverage` per §12.7. With one placeholder test, thresholds cannot be met — and iteration 2 task 2.10 explicitly replaces the placeholder and closes the threshold gate. The thresholds remain configured exactly as §11.2 specifies.

---

## 4. Issues encountered

### 4.1 `eslint@10.10.0` cannot work with `eslint-config-next@16.3.4` — **deviation, documented**

This is the one place the spec's pinned versions do not work. Three distinct hard failures were reproduced:

| Configuration | Failure |
|---|---|
| `eslint@10.10.0` + `eslint-config-next` on `.ts` | `TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function` |
| `eslint@10.10.0` + `eslint-config-next` on `.js` | `TypeError: scopeManager.addGlobals is not a function` |
| Installing any React ESLint plugin alongside `eslint@10.10.0` | `ERESOLVE` — no published version supports it |

**Root cause.** `eslint-config-next@16.3.4` declares `peerDependencies.eslint: ">=9.0.0"`, which is too loose. It depends on `eslint-plugin-react@7.37.5`, whose own peer range is `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7` — **ESLint 10 is not supported and no released version of the plugin supports it.** `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-import` have the same ceiling. Its bundled Babel parser also returns a scope manager ESLint 10 rejects. `eslint-config-next@16.3.5` (current latest) has an identical dependency set, so upgrading does not help.

**Resolution.** Pinned `eslint` to **`9.39.5`** (the current `maintenance` dist-tag, inside every plugin's supported range). Verified `eslint .` then runs clean and the structural rule still fires. This is the minimum change that yields a working lint gate. **Revisit** when `eslint-plugin-react` widens its peer range to include 10.x — then `eslint@10.10.0` can be restored. Recorded in the decisions log in §5 below (and to be carried into `docs/decisions-log.md` in iteration 8).

### 4.2 `db.run(sql.raw(FTS5_DDL))` fails at runtime — **spec bug, fixed**

`architecture.md` §8.6's `ensureSearchIndex()` uses `db.run(sql.raw(FTS5_DDL))`, but `FTS5_DDL` contains **four statements** (the virtual table plus three triggers). Drizzle's `db.run()` routes through better-sqlite3's `prepare()`, which rejects multi-statement SQL:

```
RangeError: The supplied SQL string contains more than one statement
```

This crashed `instrumentation.ts` on every server boot — the app would not start. Fixed by using the raw `sqlite.exec(FTS5_DDL)` handle from `client.ts`, which is the correct API for multi-statement DDL. `scripts/db-setup.ts` already used `sqlite.exec()` and was unaffected.

### 4.3 Spec's literal FTS5 verification query is off by one — **cosmetic**

Task 1.6's "done when" expects the query `... where name like 'articles_search%'` to return `{ c: 4 }`, but that pattern matches only the three triggers (the virtual table is `article_search`, singular). The intended count — virtual table + 3 triggers — is **4** and is confirmed present. The query's `name` pattern is a typo in the brief; no action taken beyond confirming the real object count.

### 4.4 Prettier reformatted the provided input docs — **reverted**

`npm run format` rewrote all 11 files in `docs/`, including `product-brief.md`, which is marked "do not edit". Reverted with `git checkout -- docs/`, then added a `docs/**/*.md` override with `requirePragma: true` so `format` and `format:check` can never touch them again. `docs/` is now clean and stays clean.

### 4.5 Minor
- `drizzle-kit generate` named the first migration `0000_cooing_red_skull.sql`. Renamed to `0000_init.sql` to match the spec, with the `_journal.json` tag updated to match.
- Next.js rewrote `tsconfig.json` during the first build (`jsx: react-jsx`, added `.next/dev/types/**/*.ts`). Committed as-is; it is framework-owned.
- `next-env.d.ts` is regenerated on every build and was added to `.gitignore`.
- `postcss.config.mjs` produces one `import/no-anonymous-default-export` **warning** (not an error). §1.2 mandates that file's exact one-line contents verbatim, so the file is left as specified. Lint exits 0.

---

## 5. Decisions log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| I1-1 | **`eslint@9.39.5` instead of `10.10.0`** | Keep 10.10.0 and drop `eslint-config-next`; keep 10.10.0 with `--legacy-peer-deps`; disable the React rules | No version of `eslint-plugin-react` (or its peers) supports ESLint 10, so the spec's pairing is not installable in a working state. Dropping `eslint-config-next` would lose the Next.js and a11y rules; `--legacy-peer-deps` would silence the error while leaving the plugins broken at runtime (proven above). ESLint 9.39.5 is the newest release that satisfies every plugin's declared range. |
| I1-2 | **Hand-write the `_journal.json` entry for `0001`** | Rely on file presence; fold the index into `0000_init.sql` | Verified in `drizzle-orm/migrator.js` that only journalled files are read. Folding it into `0000` was rejected because §8.5 explicitly calls for a separate follow-up migration. |
| I1-3 | **`sqlite.exec()` for `FTS5_DDL`** | Split the DDL into four separate `db.run()` calls; use `prepare().run()` per statement | `exec()` is the correct better-sqlite3 API for multi-statement DDL and matches what `scripts/db-setup.ts` already does. Splitting would duplicate the DDL constant's meaning. |
| I1-4 | **Exempt `scripts/**` and `src/test/**` from `no-restricted-imports`** | Block them and rewrite `db-setup.ts` to avoid `drizzle-orm` | §14.1 requires those imports, and neither path can reach a client bundle. The rule's stated purpose (D26, §4 item 1) is preserved — verified by a failing-import probe. |
| I1-5 | **Extra `deploy` occurrences added to the seed** | Weaken the E2E assertion; enable Porter stemming | §11.4 requires **exactly 3** results for `deploy`, but `unicode61` does not stem, so `deploy*` matches only the literal token. The seed now has one title match plus two natural body matches in published articles. Changing the tokenizer would contradict §9.2's explicit acceptance of no-stemming. |
| I1-6 | **Prettier `requirePragma` override for `docs/**/*.md`** | Add docs to `.prettierignore`; accept the reformat | `product-brief.md` is marked "do not edit". `requirePragma` keeps docs *checkable* if a pragma is ever added while guaranteeing the provided files are never rewritten. |
| I1-7 | **`.gitignore` `next-env.d.ts`** | Commit it | Regenerated on every build, so committing it produces permanent diff noise. `AGENTS.md`/`CLAUDE.md` are **committed** per §5.3 item 7. |

---

## 6. Files created

```
.github/pull_request_template.md      .prettierignore
.github/workflows/ci.yml              AGENTS.md            (Next-generated, committed)
.env.example                          CLAUDE.md            (Next-generated, committed)
.gitignore                            next-env.d.ts        (Next-generated, gitignored)
.nvmrc                                package-lock.json
package.json                          postcss.config.mjs
prettier.config.mjs                   tsconfig.json
vitest.config.ts                      drizzle.config.ts
eslint.config.mjs                     next.config.ts

drizzle/0000_init.sql                 drizzle/0001_article_constraints.sql
drizzle/meta/_journal.json            drizzle/meta/0000_snapshot.json

src/app/globals.css                   src/app/layout.tsx           src/app/page.tsx
src/instrumentation.ts                src/lib/env.ts               src/lib/env.test.ts
src/components/layout/skip-link.tsx   src/components/layout/theme-provider.tsx
src/test/setup.ts

src/server/db/create.ts               src/server/db/current.ts     src/server/db/client.ts
src/server/db/schema.ts               src/server/db/search-index-ddl.ts
src/server/db/search-index.ts         src/server/db/migrate.ts     src/server/db/seed.ts

scripts/db-setup.ts                   scripts/seed.ts              scripts/backup.ts
```

---

## 7. Handoff notes for iteration 2

- The data layer is proven end to end; iteration 2 adds only the pure logic layer (`types/domain.ts`, `lib/*`, Zod schemas) and its tests.
- **`npm run test:coverage` currently fails** its thresholds by design — one placeholder test exists. Iteration 2 task 2.10 replaces it and closes the gate. Do not weaken the thresholds to make it pass early.
- `src/test/setup.ts` and `vitest.config.ts` are in place with the two-project split ready for `src/components/**/*.test.tsx`.
- `src/lib/env.ts`, `src/server/db/create.ts`, and `src/server/db/search-index-ddl.ts` must **keep** their missing `import 'server-only'` (D26) — adding it breaks every script and test.
- `data/kb.db` is not committed; run `npm run db:setup` after cloning.
- Verified FTS5 behaviour worth reusing in iteration 3's repository tests: `bm25(article_search, 8.0, 3.0, 1.0)` ranks the title match first; `highlight`/`snippet` emit `char(1)`/`char(2)` sentinels; and a deliberately corrupted index is fully repaired by `INSERT INTO article_search(article_search) VALUES ('rebuild')`.

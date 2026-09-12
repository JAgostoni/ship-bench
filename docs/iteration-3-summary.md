# Iteration 3 Summary — Repository layer + integration tests

**Status:** Complete. `npm run verify` exits 0, `npm run test:coverage` exits 0, and the app serves `GET / 200` locally.

**Goal (met).** All SQL now lives in `src/server/repositories/**` and is proven against a real, freshly migrated SQLite database. The FTS5 triggers, write transactions, optimistic concurrency, revision pruning, and `ON DELETE` behaviour are all verified by test rather than assumed. Every capability the UI iterations need is proven at the data layer, so iterations 4–6 cannot be blocked by a broken query.

---

## 1. What was built

### 1.1 Files

| Task | File | Tests |
|---|---|---|
| 3.1 | `src/test/db.ts` (harness), `src/test/factories.ts` (builders) | — |
| 3.1 | `src/test/db.test.ts` | 8 |
| 3.2 | `src/server/repositories/categories.ts` | — |
| 3.2 | `src/server/repositories/categories.test.ts` | 17 |
| 3.3 / 3.4 | `src/server/repositories/articles.ts` | — |
| 3.3 / 3.4 | `src/server/repositories/articles.test.ts` | 47 |
| 3.5 | `src/server/repositories/revisions.ts` | — |
| 3.5 | `src/server/repositories/revisions.test.ts` | 12 |
| 3.6 | `src/server/repositories/search.ts` | — |
| 3.6 | `src/server/repositories/search.test.ts` | 32 |
| 3.7 | `src/server/repositories/runtime.ts` + `.test.ts` | 4 |
| 3.7 | `src/server/db/seed.test.ts`, `src/server/db/db-runtime.test.ts` | 20 |
| 3.7 | `vitest.config.ts` (coverage scope + `node` project `include`) | — |

**20 test files, 274 tests, all passing.** The suite runs in ~4s.

### 1.2 Test harness (3.1)
`createTestDb()` implements `architecture.md` §11.2: a `mkdtempSync` directory under `os.tmpdir()`, `createDatabase(join(dir, 'test.db'))` imported from `src/server/db/create.ts` (**not** `client.ts`, which carries `import 'server-only'`), `migrate(db, { migrationsFolder: './drizzle' })`, the real `FTS5_DDL`, and `setDb(db)`. It returns `{ db, sqlite, dir, close }`; `close()` closes the handle and then best-effort removes the temp directory, because Windows holds `-wal`/`-shm` handles briefly and cleanup must never fail a test.

`factories.ts` exports `makeArticle`/`makeCategory` with deterministic-but-unique defaults (an incrementing counter, and timestamps offset by `n` minutes from a fixed epoch so ordering assertions are stable).

### 1.3 Category repository (3.2)
`listWithCounts()` is the §14.3 single-query left-join + `groupBy` — **verified by test to issue exactly one statement**. Counts include `published` articles only, ordered `name COLLATE NOCASE ASC`. `create()` runs inside one `db.transaction` with an explicit `SELECT … WHERE lower(name) = lower(?)` guard so a duplicate is a clean `CONFLICT` even if the `lower(name)` expression index is dropped, plus `uniqueSlug`-driven slug generation. `listOptions()` returns `CategoryRef[]` for the editor select and filter chips.

### 1.4 Article repository (3.3, 3.4)
Reads: `listArticles` implements §14.3 (`limit(pageSize + 1)` for `hasNext`; the exact `total` is a second query run **only** when `page > 1`, per §9.1/§13.1), `getArticleBySlug` and `getArticleById` issue **exactly two queries** (article+category join, then revisions — asserted by spying on `sqlite.prepare`), `countArticles` for `/api/health`.

Writes: `createArticle` (slug with collision suffixes → insert → revision 1, relying on the `articles_search_ai` trigger), `updateArticle` (the guarded `UPDATE … AND version = ?` sequence from §8.7), and `archiveArticle` (soft archive; revisions retained).

### 1.5 Revision and search repositories (3.5, 3.6)
`listForArticle(articleId, limit = 5)` returns newest-first `RevisionSummary` — exactly the fields `design-spec.md` §3.4's `RevisionList` renders, including `revisionNumber`, `editorName`, `changeNote`, and `createdAt`.

`searchArticles` runs the §8.1 query verbatim in behaviour: `bm25(article_search, 8.0, 3.0, 1.0)`, `highlight(...0, char(1), char(2))` for the title, `snippet(...2, char(1), char(2), '…', 24)` for the body, joined to `articles` and filtered by status. Raw input goes through `toFtsQuery`; an empty result **returns `[]` without touching the database** (asserted by spying on `sqlite.prepare`). Output is parsed by `splitSegments` into `{ text, match }[]`. A `LIKE` scan over `title`/`summary` capped at 50 rows is the fallback when the virtual table is missing or `MATCH` throws.

### 1.6 Coverage gate (3.7)
`vitest.config.ts` now restores §11.2's full scope (`include: ['src/lib/**', 'src/server/**']`) with the global thresholds verbatim (80/80/70/80) plus two glob entries: `'src/lib/**'` at 90/90/70/90 and `'src/server/**'` at 85/85/70/85. The `node` project's `include` gained `src/test/**/*.test.ts`, without which the harness's own test could not run.

| Group | Lines | Functions | Branches | Statements | Required |
|---|---|---|---|---|---|
| `src/lib/**` | **100%** (120/120) | 100% | 100% | 100% | ≥90% lines |
| `src/server/**` | **93.67%** (207/221) | 89.71% | 80.86% | 92.83% | ≥85% lines |
| Global | 95.88% | 92.39% | 85.37% | 95.40% | 80/80/70/80 |

Per repository: `articles.ts` 95.2% lines, `categories.ts` 83.3%, `revisions.ts` 100%, `runtime.ts` 100%, `search.ts` 97.4%.

### 1.7 The `runtime.ts` singleton seam
`architecture.md` §8.1 writes each repository singleton as `export const xRepository = createXRepository(getDb())`. That **throws under Vitest**, where no database exists until a test calls `createTestDb()`, and it is also fragile in Next.js because `src/instrumentation.ts` — not the module graph — is what calls `setDb()`. `lazyRepository(createXRepository)` resolves `getDb()` on first property access and caches per handle, so the call shape and D25's "which database did this hit?" answer are preserved while the import-order dependency is removed. This deviates from the §8.1 snippet; see §2.3.

---

## 2. Assumptions made

### 2.1 `architecture.md` §8.7's revision numbering is internally inconsistent — resolved as "revision `#N` = state as of version `N`"

§8.7 step 3 says to insert the **previous** state with `revision_number = row.version`, while `createArticle` step 3 says to insert revision 1. Those cannot both hold. Taken literally, the very first save inserts `revision_number = 1` while revision 1 already exists, tripping the `(article_id, revision_number)` unique index:

```
literal 8.7 step 3 on first save: SQLITE_CONSTRAINT_UNIQUE
```

Resolved with the model every other part of the spec assumes — `revision_number` tracks `version`:

| Event | `articles.version` | Revision written |
|---|---|---|
| `createArticle` | 1 | `#1` (the created state) |
| first save | 2 | `#2` (the new state) |
| `archiveArticle` | 3 | `#3` (the archived state) |

Corroboration: `src/server/db/seed.ts` (iteration 1, pre-existing) encodes exactly this — `version: article.revisions ?? 1` with the newest revision holding the current `body_md` — and `revisions.test.ts` asserts that invariant holds for repository writes too. §9.4's real requirement is unaffected: the pre-save state stays recoverable, because it is revision `#version`, written by the previous save, so a conflict is never destructive. A UI wart follows from this and is noted in §3.2 below.

### 2.2 Revision 1's `editor_name` / `change_note` are unspecified
`article_revisions.editor_name` is `NOT NULL` but no spec says what `createArticle` should write. Resolved by:
- `editorName` becomes a **required field of the create payload**. The `kb_display_name` cookie read belongs to the Server Action (iteration 6, `design-spec.md` §4.6), so the action resolves the name and passes it down; the repository additionally falls back to the `'Anonymous editor'` default documented in §8.2 / `design-spec.md` §10.5.
- `changeNote` defaults to `'Initial version'`, matching the convention `src/server/db/seed.ts` already uses.
- `archiveArticle` writes the note `'Archived'`.

### 2.3 Repository singletons resolve lazily rather than at import time
See §1.7. This is a deliberate, additive deviation from the §8.1 snippet's `createXRepository(getDb())`. The alternative was a fixture in `src/test/setup.ts` that opens a throwaway database for every test file purely to survive module import — a hidden database connection that D25 explicitly designed against, and one that would still race `instrumentation.ts` in production.

### 2.4 Write payload types are declared in the repository, not inferred from Zod
`articleCreateSchema` ends in `.default()`/`.transform()`, so its **output** type marks `summary`/`categoryId` as present-but-maybe-undefined while its **input** type makes them optional — neither describes "the repository fills the gaps". The write payload shapes are therefore declared explicitly (`ArticleCreatePayload`, `UpdateArticleInput`, `CategoryCreatePayload` as `z.input<…>`). The Zod schemas remain the single validation authority at the route/action boundary (`architecture.md` §7.2); the repository only documents which fields it defaults.

### 2.5 `getArticleBySlug` returns an object, not a bare `ArticleDetail`
The iteration brief named `getArticleBySlug`, `getArticleById`, and `countArticles`, but §9.1 requires the detail page to load the article *and* its 5 most recent revisions in two queries and design-spec §3.4 renders `History (n revisions)`. Resolved by returning `Result<{ article: ArticleDetail; revisions: RevisionSummary[] }>`. This is the only shape that satisfies both requirements while keeping the two-query budget; `countArticles()` is separate.

### 2.6 The "Undo" archive path
Design-spec §4.6 offers a 5-second `Undo` that calls `PATCH { status: 'published' }`. Because a save only carries an editable status, `updateArticle` always writes `archived_at = NULL`, so that call fully restores the article rather than leaving a stale timestamp. Conversely, `archiveArticle` bumps `version`, so an editor holding the old version receives a `CONFLICT` instead of silently resurrecting an archived article.

---

## 3. Issues encountered

### 3.1 Five of my own test expectations were wrong; the implementation was right
Named honestly because each one was a real misunderstanding, caught by the tests rather than by me:

| Failing assertion | Root cause | Fix |
|---|---|---|
| `PRAGMA foreign_keys` is `1` | `better-sqlite3`'s `pragma(…, { simple: true })` returns the scalar, not `{ foreign_keys: 1 }` | Read the scalar |
| Archived article excluded from `status: 'all'` | §14.3's filter is `q.status === 'all' ? undefined : eq(status, q.status)`, so `all` is the **only** value that can reach an archived row | Inverted the expectation to match the spec |
| Pruning keeps revisions 6..25 | One more revision exists than saves (`createArticle` writes `#1`), so 25 saves leave `#26` and the newest 20 are 7..26 | Corrected the expected range |
| `LIKE` fallback found a body-only term | §8.1's fallback scans `title`/`summary` only; my fixture put the term in `body_md` only | Moved the term to the summary and added an explicit test documenting the limitation |
| Segments must not contain `<script>` | `splitSegments` returns **plain text, never escaped** — React escapes at render time (§6.7), so escaping in the repository would double-escape on screen | Rewrote as a byte-for-byte reconstruction assertion |

### 3.2 `archiveArticle` records the post-archive state, so the table view mislabels one row
Under the model in §2.1, revision `#N` is the post-write state, so the note `'Archived'` sits on the row that already shows `status = archived` (§3.4 of this document's parent spec would prefer it read as the pre-archive snapshot). The data is complete and lossless — the pre-archive body is revision `#(version − 1)` — but iteration 6's `RevisionList` should pair the *previous* revision's body with the newest revision's metadata if it wants the snapshot framing. **Not fixed here** because it is a presentation decision belonging to iteration 6, and making the repository insert a pre-state row for archive alone would break the "newest revision equals the current row" invariant that `seed.ts` and §2.1 depend on. Recorded as a handoff.

### 3.3 The coverage gate was unreachable without testing iteration 1's `src/server/db/**`
Restoring `src/server/**` to `coverage.include` (the iteration-2 handoff obligation I2-1) immediately pulled in the eight `src/server/db/**` modules from iteration 1, which no test exercised: `src/server/**` measured **35% lines** with `seed.ts` at 0%, and the gate failed at 77.7% even after all four repositories were fully tested.

The iteration explicitly forbids weakening the gate, and narrowing `include` again would repeat the iteration-2 deviation. So the missing tests were written instead:

- `src/server/db/seed.test.ts` (9 tests) — fixture counts, draft/published split, the revision-1/version invariant, `published_at` stamping, FTS indexing, idempotence across a re-seed, cascade cleanliness, and rollback when the schema is unmigrated.
- `src/server/db/db-runtime.test.ts` (11 tests) — `createDatabase`'s PRAGMAs and Drizzle handle, `client.ts`'s singleton and HMR reuse, `ensureSearchIndex` (all three triggers + the `rebuild` branch) and `runMigrations` idempotence. Each case sets `DATABASE_FILE` to a private temp path **before** importing the module, because `client.ts` reads `env.DATABASE_FILE` at import time and would otherwise open the developer's real `./data/kb.db`.

Both `client.ts` and `migrate.ts` therefore report 0% in the coverage table: they cannot be imported without a database file, and the modules they wrap are covered through the temp-file path instead. This is a real, explained gap, not an oversight.

### 3.4 An external-content FTS5 table cannot be used to simulate index drift
An early version of the `rebuild` test tried `DELETE FROM article_search` and asserted `count(*) = 0`. For an external-content table `count(*)` reads through to `articles`, so it still returned 1 — the "drift" was imaginary. Replaced with an assertion that a `rebuild` is idempotent and that the term remains findable.

---

## 4. Verification evidence

Every result below was produced by running the command in this environment.

| Criterion | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 ✅ |
| Lint | `npm run lint` | exit 0 (1 pre-existing warning) ✅ |
| Formatting | `npm run format:check` | "All matched files use Prettier code style!" ✅ |
| Tests | `npm run test:run` | 20 files, **274 tests passed** ✅ |
| Coverage gate (3.7) | `npm run test:coverage` | `src/server/**` **93.67% lines** (≥85%), `src/lib/**` 100% (≥90%), exit 0 ✅ |
| Build | `npm run build` | compiled successfully, 3 static pages ✅ |
| **Full gate** | **`npm run verify`** | **exit 0** ✅ |
| App runs locally | `npm run dev` + `GET /` | `Ready in 1227ms`, `GET / 200` ✅ |
| Registry hook | `npm run db:check` | `integrity_check: ok`, `foreign_key_check: clean` ✅ |
| No test writes `./data/kb.db` | `src/test/db.test.ts` | temp path under `os.tmpdir()`, `kb.db` size + mtime unchanged after two consecutive runs ✅ |

The single lint output is the **pre-existing** `import/no-anonymous-default-export` warning in `postcss.config.mjs`, inherited from iteration 1 and unrelated to this iteration's files.

### Definition of done

| Requirement | Evidence |
|---|---|
| `src/server/**` line coverage ≥85% | **93.67%** ✅ |
| The FTS5 trigger is proven: an `UPDATE` to `body_md` changes `MATCH` results | `articles.test.ts` "reflects the new body in search results through the update trigger"; `search.test.ts` "removes the old term and adds the new one after a body update" ✅ |
| Optimistic concurrency is proven: a stale `version` returns `CONFLICT` and leaves the row unchanged | `articles.test.ts` asserts title, body, **and** version all retain their old values; the §7.3 error shape (`errors: [{ path: 'version', message: 'Expected version 99, found 1.' }]`) is asserted exactly ✅ |
| Revision pruning keeps exactly 20 after 25 saves | `articles.test.ts` asserts length 20 and the exact surviving range 7..26, plus that a second article's revisions are untouched ✅ |
| `foreign_keys = ON` is proven | deleting a category nulls `articles.category_id`; deleting an article cascades to `article_revisions`; a nonexistent `category_id` is rejected as `VALIDATION_FAILED` ✅ |
| Search never throws on malformed input, including the `LIKE` fallback | 7 malformed queries return a `Result`; the virtual table is dropped and results still come back; dropping it with no match returns `[]` ✅ |
| No test opens `./data/kb.db` | `db.test.ts` asserts the path is under `os.tmpdir()` and that `kb.db`'s size and mtime are identical across two runs ✅ |
| `npm run verify` exits 0 | ✅ |
| Four repository test files exist | `articles.test.ts`, `categories.test.ts`, `revisions.test.ts`, `search.test.ts` ✅ |

**Confirmation that the app runs locally and flows work:** `npm run dev` reports `Ready in 1227ms` and `GET /` returns `200`. Nothing in this iteration is user-visible — no route, component, action, or API handler was added — so "the relevant flows work" means, for this iteration, that the data layer underneath them is proven: browse/filter/sort/paginate reads, search with highlighting and a degradation path, create/update/archive writes, conflict detection, revision history retrieval, and pruning all pass against a real migrated database.

---

## 5. Decisions log

| ID | Decision | Rationale |
|---|---|---|
| **I3-1** | Revision numbering resolved as "revision `#N` = state as of version `N`", with `version` bumped before the revision is written | §8.7 step 3 is unimplementable as written — a first save collides with revision 1 on the `(article_id, revision_number)` unique index. This reading is the one `seed.ts` encodes and the one that keeps `revision_number === version`. See §2.1. |
| **I3-2** | `editorName` is required on the create payload; revision 1's note defaults to `'Initial version'`; archive writes `'Archived'` | `editor_name` is `NOT NULL` but unspecified for creation. The cookie read belongs to the Server Action. See §2.2. |
| **I3-3** | Repository singletons use `lazyRepository(createXRepository)` (a caching proxy resolving `getDb()` on first access) instead of `createXRepository(getDb())` at module scope | The §8.1 snippet throws under Vitest and races `instrumentation.ts` in production. Preserves the call shape and D25's explicitness. See §1.7, §2.3. |
| **I3-4** | Write payload types declared in the repository rather than inferred from the Zod schemas | `z.infer` on a `.transform()`-terminated schema produces a type that no honest caller can satisfy. Schemas stay the validation authority. See §2.4. |
| **I3-5** | `getArticleBySlug` / `getArticleById` return `{ article, revisions }` | Required by §9.1's two-query budget and design-spec §3.4's history list; the brief's flat-function list is satisfied by the names. See §2.5. |
| **I3-6** | `total` is `null` on page 1 and a real `count(*)` only when `page > 1` | §9.1 deliberately avoids `count(*)` on the first page; `null` keeps "the server did not compute this" distinguishable from "there are zero rows", which design-spec §4.4 needs. |
| **I3-7** | The `LIKE` fallback scans `title`/`summary` only, skipping `body_md` | This is what §8.1 specifies, and matching bodies with a leading-wildcard `LIKE` would force a full scan of every article body on a degraded path. The limitation is asserted by a test so it cannot regress silently. |
| **I3-8** | `archiveArticle` bumps `version` and writes a revision | Otherwise an editor holding the old version could save over an archived article without a conflict. Bumping keeps the optimistic-concurrency contract uniform across writes. |
| **I3-9** | The coverage gap in `src/server/db/**` was closed by adding tests, not by narrowing `include` | The iteration forbids weakening the gate, and iteration 2's I2-1 narrowing was already recorded as a deviation to be undone. See §3.3. |
| **I3-10** | `lazyRepository` is a separate module (`runtime.ts`) rather than inlined per repository | One tested implementation of the seam, so a bug in the proxy cannot vary between the four repositories. |
| **I3-11** | `vitest.config.ts` `node` project gained `src/test/**/*.test.ts` | Without it `src/test/db.test.ts` was silently uncollected ("No test files found"), so the harness's own correctness test could not run. This is a real coverage hole that the earlier config hid. |

---

## 6. Handoff to iteration 4

1. **Display name plumbing.** `createArticle`/`updateArticle`/`archiveArticle` all require `editorName`. The Server Action (iteration 6) must read the `kb_display_name` cookie and pass it down, per `design-spec.md` §4.6.
2. **Revision history framing.** See §3.2 — iteration 6's `RevisionList` should decide whether to pair the previous revision's body with the newest revision's metadata for the archive case.
3. **Review the inherited copy.** `PROBLEM_TITLES` (iteration 2's I2-3) and the `pageSize` clamp (I2-2) are still the two places where a literal and a prose spec reading diverged; both are now exercised by repository-level tests via `listQuerySchema`.
4. **No UI work was done.** `src/app/`, `src/components/`, and `src/app/api/` remain untouched by this iteration; every mutation still needs its Server Action and its route handler.
5. **Out of scope, deliberately not built:** any React component, any route, any Server Action, any route handler, the API layer, and `POST /api/test/reset`.

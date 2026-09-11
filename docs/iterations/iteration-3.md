# Iteration 3 — Repository layer + integration tests

**Goal.** All SQL is confined to `src/server/repositories/**` and proven against a real migrated SQLite database. FTS5 triggers, transactions, optimistic concurrency, revision pruning, and `ON DELETE` behaviour are all verified. At the end of this iteration every capability the app needs is already proven at the data layer, so the UI iterations cannot be blocked by a broken query.

**Scope.** `src/test/db.ts`, `src/test/factories.ts`, and the four repositories (`articles`, `categories`, `revisions`, `search`) plus their integration tests.

**Out of scope.** Any React component, any route, any Server Action.

**Reference.** `architecture.md` §8.1, §8.7, §9.1, §9.2, §9.4, §11.1, §11.3, §14.3; D25.

**Testing scope note.** The brief places "unit tests for core logic" in MVP. Integration tests against a real database are how this architecture's actual bugs (broken triggers, wrong index, transaction ordering, `ON DELETE` behaviour) are caught — mocks cannot see them (`architecture.md` §11.1). Target: **≥85% of `src/server/**`**.

---

## Tasks

### 3.1 Build the test database harness and factories

Create **`src/test/db.ts`** exporting `createTestDb()` — **verbatim from `architecture.md` §11.2**:

- `mkdtempSync(join(tmpdir(), 'kb-test-'))` for a per-file temp directory
- `createDatabase(join(dir, 'test.db'))` imported from `src/server/db/create.ts` — **not** `client.ts`
- `migrate(db, { migrationsFolder: './drizzle' })`
- `db.run(sql.raw(FTS5_DDL))` — real FTS5, real triggers
- `setDb(db)` so repository singletons resolve to this handle
- returns `{ db, sqlite, close }`

> **Why not `client.ts`.** `client.ts` carries `import 'server-only'`, which throws outside the `react-server` export condition. Vitest does not set it (`architecture.md` §8.4, §11.2).

Create **`src/test/factories.ts`** exporting `makeArticle(overrides?)` and `makeCategory(overrides?)` that return valid insert payloads with deterministic-but-unique defaults (`title: \`Test Article ${n}\``, incrementing `n`), so tests never assert on shared mutable state (`architecture.md` §11.5).

Write `src/test/db.test.ts` asserting: `createTestDb()` produces a database where `categories`, `articles`, `article_revisions` exist; `article_search` exists with its three triggers; `PRAGMA foreign_keys` reports `1`; `PRAGMA journal_mode` reports `wal`; and `./data/kb.db` is never opened (assert the temp path is under `os.tmpdir()`).

**Done when:** the test passes and running the suite twice in a row leaves `./data/kb.db` byte-identical (mtime unchanged).

---

### 3.2 Implement the category repository

Create **`src/server/repositories/categories.ts`** — `import 'server-only'` first line; export `createCategoryRepository(db: Database)` returning `{ listWithCounts, getBySlug, getById, create, listOptions }`, plus the runtime singleton `export const categoryRepository = createCategoryRepository(getDb())`.

`listWithCounts()` must use the single-query left-join + `groupBy` form from `architecture.md` §14.3 — **no N+1**. The article count counts **published** articles only, ordered by `name COLLATE NOCASE ASC`.

`create(input)`:
- derives the slug via `uniqueSlug` from `src/lib/slug.ts`
- inserts and returns `ok(created)`; on a case-insensitive duplicate name returns `err(new AppError('CONFLICT', …))` — this must work even if the `lower(name)` expression index is absent, so also perform the explicit `SELECT 1 FROM categories WHERE lower(name) = lower(?)` guard inside the transaction (`architecture.md` §8.3 fallback note)
- all multi-statement work inside one `db.transaction(...)` with **no `await` inside the callback** (a hard requirement of `better-sqlite3`, §8.7)

Write **`src/server/repositories/categories.test.ts`** against a fresh `createTestDb()` in `beforeEach`, calling `createCategoryRepository(db)` — **never the singleton**:

- `listWithCounts()` returns the correct published count and excludes drafts from the count
- A category with no articles returns `articleCount: 0`
- Creating `Engineering` then `engineering` returns `err(CONFLICT)` (case-insensitive uniqueness)
- Creating two different names produces distinct slugs
- `getBySlug('engineering')` returns the category; an unknown slug returns `err(NOT_FOUND)`
- Ordering is case-insensitive alphabetical

**Done when:** the test passes and no test writes to `./data/kb.db`.

---

### 3.3 Implement the article repository: reads

Create **`src/server/repositories/articles.ts`** with `createArticleRepository(db)` returning at minimum `listArticles`, `getArticleBySlug`, `getArticleById`, `countArticles`, and the singleton.

**`listArticles(q: ListQuery)`** — the query from `architecture.md` §14.3:

- left-join `categories`, filter on `status` (unless `'all'`) and `category` slug
- order by `sort`: `title` → `COLLATE NOCASE ASC`, `created` → `desc(createdAt)`, default `updated` → `desc(updatedAt)`
- `.limit(q.pageSize + 1)` to detect a next page; return `{ items: rows.slice(0, pageSize), hasNext }`
- map each row to `ArticleListItem`, computing `excerpt` via `excerpt(bodyMd)` and attaching the `CategoryRef`

**`getArticleBySlug(slug)`** — **two queries total, never N+1** (`architecture.md` §9.1): one select joining the article and its category, one select for the 5 most recent revisions. Returns `err(NOT_FOUND)` when missing. Archived articles are returned normally (they are visible at their URL so links do not rot).

**`countArticles()`** — used by `/api/health`.

Write **`src/server/repositories/articles.test.ts`** (reads):

- `listArticles` with the default query returns only published articles
- `status: 'draft'` returns only drafts; `status: 'all'` returns both
- The category filter returns only articles in that category
- Each `sort` value produces the documented order
- `pageSize` is respected and `hasNext` is `true` exactly when a further page exists (seed `pageSize + 1` rows and assert the boundary)
- `excerpt` is populated when `summary` is null and equals the summary when it is set
- `getArticleBySlug` returns the article with its `category` populated; with an uncategorized article, `category` is `null`
- `getArticleBySlug` on an unknown slug returns `err(NOT_FOUND)`
- An archived article is still returned by slug

**Done when:** the read test file passes and the query count for `getArticleBySlug` is two (assert by counting `sqlite.prepare(...)` invocations or by using a `sqlite.function`-free spy on `db.select`).

---

### 3.4 Implement the article repository: writes with optimistic concurrency

Extend `src/server/repositories/articles.ts` with `createArticle(input)` and `updateArticle(id, input)` implementing the exact transaction sequences in `architecture.md` §8.7.

**`createArticle`:** generate the slug (collision-handled) → insert the article → insert revision 1 (the initial state) → return `ok({ id, slug, version })`. The `articles_search_ai` trigger indexes it automatically — do not write to `article_search`.

**`updateArticle`:** inside one `db.transaction`:
1. `SELECT id, version, status, title, summary, body_md FROM articles WHERE id = ?` → missing ⇒ `err(NOT_FOUND)`
2. `input.version !== row.version` ⇒ `err(CONFLICT)` with `errors: [{ path: 'version', message: 'Expected version N, found M.' }]` (the exact shape in §7.3)
3. Insert the **previous** state as a new `article_revisions` row with `revision_number = row.version`
4. `UPDATE articles SET …, version = version + 1, updated_at = ? WHERE id = ? AND version = ?` — the `AND version = ?` guard makes check-then-write atomic
5. Prune revisions beyond the newest **20**
6. Set `published_at` on the first transition to `published`; set `archived_at` on archive

Also implement `archiveArticle(id)` — soft-archives (`status = 'archived'`, stamps `archived_at`), retains revisions. **Hard delete is not exposed in v1.**

> **No `await` inside the transaction callback.** `better-sqlite3` implements `db.transaction` synchronously (§8.7).

Write **`src/server/repositories/articles.test.ts`** (writes) with exactly the six cases from `architecture.md` §11.3:

- `updateArticle` with a stale `version` returns `err(CONFLICT)` and **leaves the row unchanged** (assert the title, body, and version are all still the old values)
- `updateArticle` with the correct version increments `version` and writes **exactly one** new revision
- Revision pruning keeps **exactly 20** after 25 saves
- Deleting a category sets `articles.category_id` to `NULL` (verifies `foreign_keys = ON`)
- Deleting an article cascades to `article_revisions`
- Slug collision produces `deploying-the-api-2`

Add: `published_at` is set on the first `draft → published` transition and **not** overwritten on a second publish; `archiveArticle` sets `status` and `archived_at` and retains revisions; two sequential updates from the same starting version produce exactly one success and one `CONFLICT`.

**Done when:** all write tests pass, including the pruning count of exactly 20.

---

### 3.5 Implement the revision repository

Create **`src/server/repositories/revisions.ts`** with `createRevisionRepository(db)` returning `listForArticle(articleId, limit = 5)` and `getById(id)`, plus the singleton.

`listForArticle` returns revisions newest-first with `revisionNumber`, `editorName`, `changeNote`, and `createdAt` — exactly the fields the `RevisionList` component renders in iteration 6 (`design-spec.md` §3.4: `#12 · Jason · 2 days ago · "Clarified the rollback steps"`).

Write **`src/server/repositories/revisions.test.ts`**: revisions are ordered newest-first; `limit` is respected; an article with no revisions returns `[]`; the initial revision created by `createArticle` has `revisionNumber: 1`.

**Done when:** the test passes and the shape matches what iteration 6's `RevisionList` needs.

---

### 3.6 Implement the search repository

Create **`src/server/repositories/search.ts`** with `createSearchRepository(db)` returning `searchArticles(q, { limit, status })`, plus the singleton.

Implement the query from `architecture.md` §8.1 verbatim:

- `bm25(article_search, 8.0, 3.0, 1.0)` weighting title 8×, summary 3×, body 1×
- `highlight(article_search, 0, char(1), char(2))` for the title
- `snippet(article_search, 2, char(1), char(2), '…', 24)` for the body
- join `articles a ON a.id = article_search.rowid`
- `WHERE article_search MATCH ${ftsQuery}` with the status filter
- `ORDER BY rank LIMIT ${limit}`

Then:
- run the raw input through `toFtsQuery` from `src/lib/fts.ts`; **if it returns `''`, return `[]` without touching the database**
- parse the highlighted output through `splitSegments` from `src/lib/highlight.ts` into `titleSegments` / `snippetSegments`
- attach the category via a join or a follow-up lookup, and map to `SearchHit`
- **fallback:** if `article_search` is missing or `MATCH` throws a `SqliteError`, log a warning and fall back to an indexed `LIKE` scan over `title`/`summary`, capped at 50 rows. The UI must never break because of a search-index problem (§8.1).

Use Drizzle's `sql` template so every value is parameterized. `architecture.md` §13.2 lists FTS5 query injection as a threat mitigated by `toFtsQuery` — do not interpolate raw user input into the SQL string.

Write **`src/server/repositories/search.test.ts`** with exactly the eight cases from `architecture.md` §11.3, each opening `createTestDb()` in `beforeEach` and calling `createSearchRepository(db)` — **never the singleton**:

- Inserting an article makes it findable by a title word **and** by a body word
- Updating `body_md` removes the old term from results and adds the new one ← **this is the test that guards the trigger**
- Deleting an article removes it from results
- A `draft` is excluded when `status='published'` and included when `status='all'`
- A title match outranks a body match for the same term
- `LIMIT` is respected; `rank` is ascending (bm25 is negative-better)
- Invalid FTS syntax in `q` returns `[]`, never throws

Add: `titleSegments` / `snippetSegments` contain `{ text, match }` objects with no HTML; a `q` of `''` or `'   '` returns `[]` without a database call; the `LIKE` fallback engages when the virtual table is dropped, and returns results rather than throwing.

**Done when:** all search tests pass, including the update-reflection test.

---

### 3.7 Close out the integration coverage gate

Confirm `vitest.config.ts`'s `node` project includes `src/server/**/*.test.ts`, then run `npm run test:coverage`.

**Done when:** `src/server/**` is at **≥85% line coverage** and every test in the suite passes from a clean checkout with no `./data/kb.db` present.

---

## Iteration notes

**Sequencing.** 3.1 must precede 3.2–3.6 (every test file needs `createTestDb`). 3.2 and 3.3 can proceed in parallel. 3.4 depends on 3.3 (same file, and the write path reuses the read helpers). 3.5 depends on 3.4 only for the `createArticle` revision-1 assertion. 3.6 depends on 2.3 and 2.4 (`toFtsQuery`, `splitSegments`) and on 3.3 for the category join shape. 3.7 is last.

**The factory pattern is the isolation mechanism.** Every repository is `createXRepository(db)`; the singleton is a separate export bound to `getDb()` at module load. Tests must always pass the temp handle explicitly. If a test ever calls `articleRepository` (the singleton) directly, it is writing to the developer's real database — treat that as a bug (D25).

**Repositories are the only place SQL lives.** The `no-restricted-imports` ESLint rule from iteration 1.2 fails the lint if `drizzle-orm` or `better-sqlite3` appears outside `src/server/db/**` and `src/server/repositories/**`. Run `npm run lint` before finishing.

**Not in this iteration.** No route handlers, no Server Actions. The API layer in iteration 5 and the actions in iteration 6 are thin wrappers over these repositories and must contain no SQL of their own.

---

## Definition of done

- [ ] `src/server/**` line coverage ≥85%.
- [ ] The FTS5 trigger is proven: an `UPDATE` to `body_md` changes `MATCH` results.
- [ ] Optimistic concurrency is proven: a stale `version` returns `CONFLICT` and leaves the row unchanged.
- [ ] Revision pruning keeps exactly 20 after 25 saves.
- [ ] `foreign_keys = ON` is proven: deleting a category nulls `articles.category_id`; deleting an article cascades to revisions.
- [ ] Search never throws on malformed input — verified by test, including the `LIKE` fallback path.
- [ ] No test opens `./data/kb.db` — verified by the harness test.
- [ ] `npm run verify` exits 0.

| Repository | Test file |
|---|---|
| `src/server/repositories/articles.ts` | `src/server/repositories/articles.test.ts` |
| `src/server/repositories/categories.ts` | `src/server/repositories/categories.test.ts` |
| `src/server/repositories/revisions.ts` | `src/server/repositories/revisions.test.ts` |
| `src/server/repositories/search.ts` | `src/server/repositories/search.test.ts` |

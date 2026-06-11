# Iteration 2 — Data layer and REST API

**Goal:** implement and unit-test the entire backend: shared validation, the repository module (CRUD + FTS5 search with input sanitizer), and all six REST endpoints with the standard error contract.

**Scope:** no UI. At the end, every API in architecture §6.2 works against the seeded database and the unit-test suite covers the logic that can actually be wrong.

**References:** architecture §3 (layering, error contract), §4 (data model), §5.1 (search), §6.2 (API contract), §8.1 (unit test targets), §11 (search query shape).

---

## Tasks

### 2.1 Shared validation module

`src/lib/validation/article.ts`:

- Zod schema `articleInput`: `title` — trimmed, 1–200 chars; `content` — 1–100,000 chars. Export `z.infer` types used by both API handlers and (later) client forms.
- Error messages must match the design spec's exact copy (design §2.3): `Title is required` · `Title must be 200 characters or fewer` · `Content is required` · `Content must be 100,000 characters or fewer`. These strings surface verbatim in `fieldErrors` and in the UI later — set them here once.

### 2.2 Repository module — CRUD

`src/lib/repo/articles.ts` (the **only** module that touches the DB):

- `listArticles()` → `{ id, title, updatedAt }[]`, ordered `updatedAt` DESC. Never select `content` for the list.
- `getArticle(id)` → full row or `null`.
- `createArticle({ title, content })` → sets `createdAt = updatedAt = Date.now()`, returns the full row.
- `updateArticle(id, { title, content })` → bumps `updatedAt`, returns updated row or `null` if missing.
- `deleteArticle(id)` → boolean (row existed).
- All via Drizzle against the singleton client; timestamps are unix epoch ms per the contract.

### 2.3 Repository module — search

In the same repo module:

- `sanitizeFtsQuery(input)`: split on non-alphanumerics, drop empties, wrap each term as `"term"*`, join with spaces (implicit AND). `deploy serv` → `"deploy"* "serv"*`. Returns `null`/empty signal when no usable terms remain (caller returns zero results without querying). Must never throw — stray `"`/`-`/`*`, emoji, and whitespace-only input are all handled (architecture §5.1).
- `searchArticles(q, limit)`: raw-SQL query per architecture §11 — join `articles_fts` to `articles`, `ORDER BY bm25(articles_fts, 5.0, 1.0)` (title weighted 5×), `snippet(articles_fts, 1, '<mark>', '</mark>', '…', 20)` as the excerpt. Returns `{ results: { id, title, snippet, updatedAt }[], total }`. Limit default 20, max 50.

### 2.4 API route handlers

Per architecture §3 layering — handlers do HTTP only (parse → Zod → repo → status mapping):

- `src/app/api/articles/route.ts`: `GET` (list) → `200 { articles }`; `POST` (create) → `201 { article }`.
- `src/app/api/articles/[id]/route.ts`: `GET` → `200 { article }` / 404; `PUT` (full update) → `200 { article }` / 400 / 404; `DELETE` → `204` empty / 404.
- `src/app/api/search/route.ts`: `GET ?q=&limit=` → `200 { results, total }`. Blank/whitespace `q` → 200 with empty results, never an error.
- Shared error helper producing the contract from architecture §3: `{ error: { code, message, fieldErrors? } }` — `VALIDATION`/400 (with Zod `fieldErrors`), `NOT_FOUND`/404 (message includes the id, e.g. `Article 99 not found`), `500` for unexpected (logged with `console.error`). Non-numeric `id` params → 404.
- Enforce the **100 KB request-body cap** on `POST`/`PUT` (reject larger with 400). Malformed JSON → 400 `VALIDATION`.

### 2.5 Unit tests (Vitest, per architecture §8.1)

All DB tests run against in-memory SQLite (`:memory:`) with migrations applied in `beforeEach` — establish a small shared test helper for this.

- `src/lib/repo/articles.test.ts`: create/read/update/delete round-trips; `updatedAt` bumps on update (and `createdAt` doesn't); list ordering by `updatedAt` DESC; list omits `content`; delete returns false for missing id.
- `src/lib/repo/search.test.ts`: prefix match (`depl` finds "Deploy checklist"); title-over-content ranking (term in title outranks same term in body); snippet contains `<mark>`; limit respected; **sanitizer cases** — `"`, `-`, `*`, empty string, whitespace-only, emoji-only input must never throw and return sensible results (usually empty).
- `src/lib/validation/article.test.ts`: empty title, 201-char title, 100,001-char content, whitespace-trimming behavior, and that each failure produces the exact message strings from task 2.1.

---

## Iteration-specific notes

- **Sequencing within the iteration:** 2.1 → 2.2/2.3 → 2.4; tests (2.5) are best written alongside each module, not batched at the end.
- The `snippet`/`<mark>` output is consumed in iteration 4 by a whitelist token renderer — the repo must guarantee `<mark>`/`</mark>` are the only markup it ever injects (FTS5's `snippet()` escapes nothing, but since react is not rendering this as HTML, the only contract that matters is: split tokens are exactly these two).
- Verify endpoints manually against the seeded dev DB (curl or a REST client) — the request/response examples in architecture §6.2 are the expected shapes, byte-for-byte in structure.
- Do not build Server Actions; writes go through these REST handlers (architecture decision #6).

## Definition of done

- All six endpoints behave per the architecture §6.2 table, including error shapes (validation 400 with `fieldErrors`, 404 with id in message, 204 empty body on delete).
- `npm test` green: repo CRUD, search + sanitizer, validation suites all pass.
- `npm run check` passes.
- App still boots; placeholder page unaffected.

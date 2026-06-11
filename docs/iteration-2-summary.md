# Iteration 2 Summary — Data layer and REST API

**Date:** 2026-06-11
**Scope:** `docs/iterations/iteration-2.md` — all five tasks completed. No UI was built (per the iteration brief); the deliverable is the fully unit-tested backend: shared validation, the repository module (CRUD + FTS5 search with sanitizer), and all six REST endpoints with the standard error contract.

---

## What was built

| Task | Outcome |
| --- | --- |
| 2.1 Shared validation | `src/lib/validation/article.ts` — Zod `articleInput` schema (title trimmed 1–200 chars, content 1–100,000 chars) with the four exact error strings from design spec §2.3, plus the `ArticleInput` inferred type used by repo and handlers. |
| 2.2 Repo CRUD | `src/lib/repo/articles.ts` — `listArticles()` (id/title/updatedAt only, `updatedAt` DESC), `getArticle()` → row or `null`, `createArticle()` (sets `createdAt = updatedAt = Date.now()`), `updateArticle()` (bumps `updatedAt`, `null` if missing), `deleteArticle()` → boolean. All via Drizzle against the singleton client. |
| 2.3 Repo search | Same module — `sanitizeFtsQuery()` (Unicode-aware split on non-alphanumerics, `"term"*` prefix tokens, implicit AND, `null` when no usable terms, never throws) and `searchArticles(q, limit)` using the raw SQL from architecture §11: `bm25(articles_fts, 5.0, 1.0)` ranking, `snippet(…, '<mark>', '</mark>', '…', 20)` excerpts, limit default 20 / clamped 1–50, `total` from an unlimited COUNT. |
| 2.4 API routes | `src/app/api/articles/route.ts` (GET list, POST create → 201), `src/app/api/articles/[id]/route.ts` (GET / PUT / DELETE → 204 empty), `src/app/api/search/route.ts` (blank or unusable `q` → 200 empty, never an error). Shared helpers in `src/lib/api/http.ts`: error contract `{ error: { code, message, fieldErrors? } }`, 100 KB body cap, malformed-JSON → 400 `VALIDATION`, non-numeric ids → 404 with the id in the message, unexpected errors logged via `console.error` → 500 `INTERNAL`. |
| 2.5 Unit tests | 40 tests across 4 files (incl. the iteration-1 smoke test), all green. `src/lib/test/db.ts` provides `setupInMemoryDb()`, which points the client singleton at `:memory:` and re-migrates per test. `articles.test.ts`: CRUD round-trips, `updatedAt` bump without touching `createdAt`, list ordering DESC, list omits `content`, missing-id paths. `search.test.ts`: prefix match, title-over-content ranking, `<mark>` snippets, limit vs. total, result shape, and sanitizer cases (`"` `-` `*`, empty, whitespace-only, emoji-only — never throw, return empty). `validation/article.test.ts`: boundary lengths (200/201, 100,000/100,001), trimming, and the four exact message strings. |

## Verification (all run locally, 2026-06-11)

- `npm run check` → typecheck, ESLint, Prettier, and 40 Vitest tests all pass. ✅
- Manual endpoint sweep against the seeded dev DB (`npm run dev`, PowerShell `Invoke-WebRequest`), matching architecture §6.2 shapes:
  - `GET /api/articles` → 200, 12 seeded articles, list items have no `content` field. ✅
  - `POST /api/articles` → 201 with full article; `GET /api/articles/13` → 200; `PUT` → 200 with bumped `updatedAt` (createdAt unchanged); `DELETE` → 204 empty body; `GET` after delete → 404 `{ "error": { "code": "NOT_FOUND", "message": "Article 13 not found" } }`. ✅
  - `POST {"title":"","content":"x"}` → 400 `VALIDATION` with `fieldErrors.title = ["Title is required"]`; malformed JSON → 400; 110 KB body → 400 ("Request body must be 100 KB or smaller"). ✅
  - `GET /api/articles/abc` → 404 "Article abc not found"; `PUT`/`DELETE` on id 9999 → 404. ✅
  - `GET /api/search?q=zanzibar` → 200 with `<mark>`-highlighted snippet; blank/whitespace/operator-only/missing `q` → 200 `{ "results": [], "total": 0 }`; `limit=2` returns 2 results with `total=3`; non-numeric `limit` falls back to default. ✅
- App still boots; placeholder page unaffected (GET `/` → 200). Dev DB left in its seeded 12-article state (the manual-test article was deleted through the API). ✅

## Assumptions made

1. **500 error code string is `INTERNAL`.** The architecture fixes `VALIDATION` and `NOT_FOUND` but names no code for unexpected errors; `INTERNAL` was chosen and lives in one helper (`unexpectedError`) if a different string is ever wanted.
2. **Sanitizer splits on Unicode non-alphanumerics** (`/[^\p{L}\p{N}]+/u`), not ASCII-only. "Alphanumeric" in architecture §5.1 was read to include accented letters so queries like `déploiement` aren't silently emptied — consistent with the `unicode61` tokenizer. Emoji are neither letters nor numbers and are dropped, as the iteration's test cases require.
3. **Only `title` is trimmed before validation** (per "title — trimmed" in task 2.1); content is validated as-is, so whitespace-only content is technically valid. The brief assigns trimming only to title.
4. **Out-of-range `limit` values are clamped, not rejected** (`<1` → 1, `>50` → 50, non-numeric → default 20). The contract says "default 20, max 50" without an error case, and search must never fail on odd input.
5. **Body-cap and malformed-JSON rejections reuse the `VALIDATION` code** with distinct messages, keeping the error contract to the architecture's defined codes rather than inventing new ones.

## Issues encountered

- **ESLint false positive:** the shared test helper was initially named `useInMemoryDb`, which `react-hooks/rules-of-hooks` flagged as a React hook called at top level. Renamed to `setupInMemoryDb` rather than suppressing the rule.
- **Stale dev server from the iteration-1 session** was still running on port 3000; its workers crashed (500 "Jest worker … exceeding retry limit") when first compiling the new `[id]` dynamic route. Killing it and starting a fresh `npm run dev` resolved it — all endpoints then behaved correctly. Not a code issue.

## Decisions log

| # | Decision | Why |
| --- | --- | --- |
| 1 | HTTP helpers live in `src/lib/api/http.ts`, not under `src/app/api/` | Keeps route files to pure handler wiring (parse → Zod → repo → status) and avoids non-route files inside the routing tree; layering per architecture §3 is preserved (helpers are HTTP-only, no DB access). |
| 2 | `searchArticles` uses the raw better-sqlite3 handle (`getSqlite()`) inside the repo | Drizzle cannot model FTS5 virtual tables; architecture §11 specifies raw SQL. The repo remains the only module touching the DB. |
| 3 | `total` comes from a second unlimited `COUNT(*)` MATCH query | The API example shows `total` exceeding the returned page (`limit=5`, `total=3` semantics); counting only the limited rows would make `total` wrong for iteration 4's "N results" copy. |
| 4 | Body size enforced by reading `request.text()` and checking `Buffer.byteLength` before `JSON.parse` | Content-Length headers can lie or be absent (chunked encoding); measuring actual bytes is the only reliable cap, and it also yields the malformed-JSON 400 path from the same single read. |
| 5 | `parseArticleId` accepts only `/^\d+$/` and safe integers | "Non-numeric id params → 404" per task 2.4; this also 404s negative ids, floats, and overflow values instead of passing garbage to SQLite. |
| 6 | Tests pin time with `vi.spyOn(Date, "now")` where ordering/bump semantics matter | create-then-update within one millisecond would make the `updatedAt`-bump and list-ordering assertions flaky; pinned clocks make them deterministic. |
| 7 | `SEARCH_LIMIT_DEFAULT` / `SEARCH_LIMIT_MAX` exported from the repo and clamping done there | The limit contract belongs to the search implementation, so the route handler stays a thin parser and iteration 4's dropdown (limit 5) reuses the same guarantees. |

## State of the codebase

Working and runnable. `npm run dev` boots the placeholder page with the seeded DB; all six API endpoints behave per architecture §6.2 including error shapes; `npm test` (40 tests) and `npm run check` are green. Nothing beyond iteration-2 scope was built — no UI components, design tokens, or pages (those begin in iteration 3).

# Iteration 2 — Domain core: pure logic + unit tests

**Goal.** Every pure function and every Zod schema the application depends on exists and is unit-tested to the brief's MVP standard. No I/O, no React, no database. Everything in this iteration is fast to test and impossible to get wrong silently.

**Scope.** `src/types/domain.ts`, the `src/lib/**` pure modules, all validation schemas, and their unit tests.

**Out of scope.** Repositories, database access, any component, any route.

**Reference.** `architecture.md` §7.4, §8.1, §10.4, §11.1, §11.2, §11.3; `design-spec.md` §10.2.

**Testing scope note.** The brief places "unit tests for core logic" in MVP. This iteration is where that obligation is discharged for the pure layer. Coverage thresholds from `architecture.md` §11.2 apply: lines 80, functions 80, branches 70, statements 80.

---

## Tasks

### 2.1 Establish the shared result and error types

Create:

- **`src/lib/result.ts`** — a discriminated union `Result<T, E>` with `ok(value)` and `err(error)` constructors, plus `isOk` / `isErr` type guards. This is the return type of every repository function (`architecture.md` §5.1).
- **`src/lib/errors.ts`** — `AppError` with a `code` union covering `NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `DB_UNAVAILABLE`, `INTERNAL`; a `toProblemJson(appError, instance)` mapper producing RFC 9457 `application/problem+json` (the exact shapes in `architecture.md` §7.3, including the `errors: [{ path, message }]` array); and the status-code mapping from `architecture.md` §10.5.

Write `src/lib/errors.test.ts`: each code maps to the documented HTTP status; `NOT_FOUND` → 404; `CONFLICT` → 409 with the `Expected version 4, found 5.` message shape; `VALIDATION_FAILED` → 422; the problem object always carries `type`, `title`, `status`, `detail`, `instance`.

**Done when:** the test file passes and the `type` URLs match the `https://kb.local/problems/*` pattern used in §7.3.

---

### 2.2 Implement slug generation with collision handling

Create **`src/lib/slug.ts`**:

- `slugify(input: string): string` — wraps `slugify@1.6.9`, lowercases, strips diacritics, collapses non-alphanumerics to single hyphens, trims leading/trailing hyphens, and caps the length at 80 characters.
- `uniqueSlug(base: string, exists: (candidate: string) => boolean): string` — appends `-2`, `-3`, … up to 50 attempts, then falls back to a 6-character random suffix (`architecture.md` §8.7 `createArticle` step 1).

Write `src/lib/slug.test.ts`:

- `slugify('Deploying the API')` → `'deploying-the-api'`
- Accented input (`'Café Déploiement'`) produces an ASCII-only slug
- Punctuation and repeated whitespace collapse to single hyphens; no leading/trailing hyphen
- A 120-character title is truncated to ≤80 characters without ending in a hyphen
- `uniqueSlug('deploying-the-api', () => true)` does not loop forever; with a predicate that accepts only the 3rd candidate it returns `deploying-the-api-3`
- The fallback path is reachable: a predicate that always returns true yields a slug with a 6-character suffix

**Done when:** the test passes and the function is pure (no `Math.random` in the deterministic path — use `node:crypto` only for the fallback).

---

### 2.3 Implement FTS5 query preprocessing

Create **`src/lib/fts.ts`** exporting `toFtsQuery(raw: string): string`, implementing the four steps in `architecture.md` §8.1:

1. Trim and collapse whitespace.
2. Strip FTS5 operator characters (`"`, `*`, `(`, `)`, `:`, `^`, `-`) and the operator words `NEAR` / `AND` / `OR` / `NOT` when used as operators.
3. Wrap each remaining token in double quotes and append `*` to the **final** token for prefix matching.
4. Return `''` for empty input — the caller short-circuits without touching the database.

> **This function is load-bearing, not defensive.** `architecture.md` §3.5 records that `"`, `AND`, `foo AND`, and `(unclosed` all raise `SqliteError` when passed straight to `MATCH`. Search must never surface a SQLite error (`design-spec.md` §3.3).

Write `src/lib/fts.test.ts` with **exactly** the five cases from `architecture.md` §11.3, plus one extra:

- `toFtsQuery('deploy api')` → `'"deploy" "api"*'`
- `toFtsQuery('  ')` → `''`
- `toFtsQuery('foo" OR bar')` strips the operator — no `OR` reaches FTS5
- `toFtsQuery('a*b')` does not throw and does not produce a wildcard-only query
- A 300-character input is truncated without throwing
- *(added)* `toFtsQuery('deploy')` → `'"deploy"*'` — a single token still gets the prefix wildcard

**Done when:** the test passes and `toFtsQuery('')` and `toFtsQuery('   ')` both return `''`.

---

### 2.4 Implement FTS5 sentinel-segment parsing

Create **`src/lib/highlight.ts`** exporting `splitSegments(marked: string): SearchSegment[]`.

It parses the `\u0001` / `\u0002` sentinels that FTS5's `highlight()` and `snippet()` emit (`architecture.md` §8.1) into `{ text: string; match: boolean }[]`.

> **Why segments and not HTML.** Returning HTML would force `dangerouslySetInnerHTML`. The architecture spec bans it outright (§6.7, §13.2) and the design spec repeats the ban (`design-spec.md` §10.6 rule 3). Escaping is automatic because the UI renders each segment as a React text node.

Write `src/lib/highlight.test.ts` with exactly the three cases from `architecture.md` §11.3:

- `splitSegments('\u0001deploy\u0002 the api')` → `[{text:'deploy',match:true},{text:' the api',match:false}]`
- Text containing `<script>` is returned as a plain segment with `match: false` and is **not** escaped, stripped, or interpreted
- Empty input → `[]`; input with only sentinels → `[]`

Add: adjacent match segments merge into one; a trailing unmatched segment is preserved.

**Done when:** the test passes and the returned objects contain no HTML strings.

---

### 2.5 Implement Markdown text helpers

Create **`src/lib/markdown.ts`** exporting:

- `plainText(md: string): string` — strips fenced code blocks, inline code backticks, heading markers, emphasis markers, link syntax (keeping the link text), blockquote markers, list markers, table pipes, and HTML-ish angle-bracket tokens; collapses whitespace.
- `excerpt(md: string, max = 160): string` — `plainText` truncated to `max` characters at a word boundary with a trailing `…` when truncated. Used as the `ArticleCard` fallback when `summary` is null (`design-spec.md` §5.3).
- `readingTime(md: string): number` — `Math.max(1, Math.round(words / 200))`, rendering as `{n} min read` (`design-spec.md` §4.1).

Write `src/lib/markdown.test.ts`:

- A body with a fenced code block, a GFM table, and a task list produces plain text containing none of ```` ``` ````, `|`, `- [ ]`, or `##`
- `excerpt` never exceeds `max` characters including the ellipsis
- `excerpt` on an empty body returns `''` (not `'…'`)
- `readingTime('')` returns `1`, never `0`
- `readingTime` of a 400-word body returns `2`

**Done when:** the test passes, including the table and code-block stripping cases.

---

### 2.6 Implement formatting and class-name helpers

Create:

- **`src/lib/format.ts`** — `relativeTime(date: Date, now?: Date): string` using `Intl.RelativeTimeFormat` (seconds → minutes → hours → days → weeks → months → years, choosing the largest unit that yields a value ≥1); `absoluteTime(date: Date): string` using `Intl.DateTimeFormat`; `formatCount(n: number, singular: string, plural: string): string`.
- **`src/lib/cn.ts`** — `export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));` exactly as `design-spec.md` §10.3.

Write `src/lib/format.test.ts`: `relativeTime` returns `'2 days ago'` for a 2-day-old timestamp; returns `'just now'`-equivalent for <1 minute; `formatCount(1, 'result', 'results')` → `'1 result'`; `formatCount(3, 'result', 'results')` → `'3 results'`.

**Done when:** the tests pass and `cn('p-2', 'p-4')` returns `'p-4'` (tailwind-merge resolves the conflict).

---

### 2.7 Author the article validation schemas

Create **`src/lib/validation/article.ts`** containing `ARTICLE_STATUSES`, `EDITABLE_STATUSES`, `articleCreateSchema`, `articleUpdateSchema`, and the inferred types — **copied verbatim from `architecture.md` §7.4**.

> The error messages are user-facing, imperative, and end with a period. `design-spec.md` §10.5 states validation messages come from the Zod schemas verbatim and must not be re-worded in the UI layer.

Write `src/lib/validation/article.test.ts`:

- `articleCreateSchema` accepts the minimum valid payload (`title`, `bodyMd`) and applies defaults `status: 'draft'`, `categoryId: null`
- `''` summary normalizes to `undefined` (the `.transform` runs)
- A 2-character title is rejected with exactly `Title must be at least 3 characters.`
- A 201-character title is rejected with `Title must be 200 characters or fewer.`
- A 301-character summary is rejected with `Summary must be 300 characters or fewer.`
- An empty `bodyMd` is rejected with `Article body cannot be empty.`
- A 200,001-character body is rejected
- `articleUpdateSchema` requires a non-negative integer `version`
- **Cross-check (required by §7.4):** `createInsertSchema(articles)` from `drizzle-zod` accepts every payload `articleCreateSchema` accepts, and vice versa for the shared fields — this is the drift guard between the hand-authored schema and the Drizzle table

**Done when:** the test passes, including the `drizzle-zod` cross-check.

---

### 2.8 Author the category and list-query validation schemas

Create **`src/lib/validation/category.ts`** — `categoryCreateSchema` with `name` (required, trimmed, 1–60, matching the design spec's "Name (required, 1–60)") and `description` (optional, trimmed, ≤200, `''` → `undefined`).

Create **`src/lib/validation/query.ts`** — `listQuerySchema` **copied verbatim from `architecture.md` §7.4**, including every `.catch()`.

> **The `.catch()` calls are the contract.** `architecture.md` §6.2 and §7.4: invalid or unknown query params are coerced to defaults, **never** a 400. A shared URL must always render.

Write `src/lib/validation/category.test.ts` and `src/lib/validation/query.test.ts`:

- `categoryCreateSchema` rejects a 61-character name and a 201-character description
- `categoryCreateSchema` normalizes `''` description to `undefined`
- `listQuerySchema.parse({ page: 'abc' })` yields `page: 1` and **never throws**
- `listQuerySchema.parse({})` yields `{ q: '', status: 'published', sort: 'updated', page: 1, pageSize: 20 }`
- `listQuerySchema.parse({ status: 'bogus', sort: 'bogus' })` falls back to `'published'` / `'updated'`
- `listQuerySchema.parse({ pageSize: '999' })` clamps to 50
- A 201-character `q` does not throw; because `.max(200)` fails, the `.catch('')` fires and the result is `q: ''`
- `listQuerySchema` accepts every combination of the four enum values without throwing

**Done when:** every malformed-input case returns a usable default rather than throwing.

---

### 2.9 Define the shared domain types

Create **`src/types/domain.ts`** with `CategoryRef`, `ArticleListItem`, `ArticleDetail`, `SearchSegment`, `SearchHit`, `Page<T>`, and any additional list/pagination types — matching `architecture.md` §10.4.

`ArticleStatus` is imported with `import type` from `@/server/db/schema` so it is erased at compile time and no server code reaches the browser bundle (§10.4). Add a short comment recording why the `import type` form is required.

Also define the `ActionState` discriminated union from `architecture.md` §7.5 (`idle` | `success` | `error` with optional `fieldErrors` and `conflict`) — this is the Server Action return contract used in iteration 6.

**Done when:** `npx tsc --noEmit` passes and `npm run build` does not pull `better-sqlite3` into any client bundle.

---

### 2.10 Close out the unit-test gate

Replace the placeholder test from iteration 1.9 with the real suite, confirm `vitest.config.ts`'s two-project split (`node` for `src/lib/**` and `src/server/**`, `components` for `src/components/**/*.test.tsx`) is in place, and run `npm run test:coverage`.

**Done when:** `npm run test:coverage` passes with `src/lib/**` at **≥90% line coverage** (the architecture spec's target for `src/lib/**`) and the configured thresholds (lines 80 / functions 80 / branches 70 / statements 80) are met.

---

## Iteration notes

**Sequencing.** 2.1 unblocks 2.2–2.10 (`SearchSegment` and `Result` are used by several modules). 2.7–2.8 are independent of 2.2–2.6. 2.9 can be done any time after 2.1 but must precede iteration 3. 2.10 is last.

**No `server-only` here.** Nothing in `src/lib/**` may import it — `lib/env.ts` is the documented exception and it is already condition-free from iteration 1 (`architecture.md` §4 rule 5, D26).

**Test-first is genuinely cheaper here.** These are pure functions with no setup cost. Writing the test in the same task catches the off-by-one in `uniqueSlug`'s 50-attempt bound and the sentinel-parsing edge cases immediately, rather than through a confusing UI symptom in iteration 5.

**Not in this iteration.** No repository, no database handle, no React component. `src/test/db.ts` and `src/test/factories.ts` belong to iteration 3 because nothing here needs a database.

---

## Definition of done

- [ ] Every module in the table below exists with a co-located `*.test.ts` that passes.
- [ ] `src/lib/**` line coverage ≥90%.
- [ ] `listQuerySchema` never throws on malformed input — verified by test.
- [ ] `toFtsQuery` never emits an unquoted operator — verified by test.
- [ ] `splitSegments` returns plain text segments with no HTML — verified by test.
- [ ] `articleCreateSchema` agrees with `drizzle-zod`'s `createInsertSchema(articles)` on the shared fields — verified by test.
- [ ] `npm run verify` exits 0.

| Module | Test file |
|---|---|
| `src/lib/result.ts` | `src/lib/result.test.ts` |
| `src/lib/errors.ts` | `src/lib/errors.test.ts` |
| `src/lib/slug.ts` | `src/lib/slug.test.ts` |
| `src/lib/fts.ts` | `src/lib/fts.test.ts` |
| `src/lib/highlight.ts` | `src/lib/highlight.test.ts` |
| `src/lib/markdown.ts` | `src/lib/markdown.test.ts` |
| `src/lib/format.ts` | `src/lib/format.test.ts` |
| `src/lib/validation/article.ts` | `src/lib/validation/article.test.ts` |
| `src/lib/validation/category.ts` | `src/lib/validation/category.test.ts` |
| `src/lib/validation/query.ts` | `src/lib/validation/query.test.ts` |
| `src/types/domain.ts` | covered by `tsc --noEmit` |

# Iteration 5 — Full-text search

**Goal:** Ship search-first discovery: debounced header typeahead against `GET /api/search`, and a shareable full results page at `/search?q=`, both powered by SQLite FTS5 over published article titles and content.

**Scope:** FTS query/search implementation, API route, SearchBox, SearchResults page, snippet highlighting styles. **Published only.** No draft search, no filters on search page.

**Sources:** architecture §§5.3, 6.4, 7.2; design §§2.2, 2.5 S2, 3.2, 6.3, 6.10.

**Depends on:** Iteration 1 (FTS table + `toFtsQuery` + seed index), Iteration 3 (CUD keeps FTS in sync). Iteration 2 list UX optional but recommended for journey continuity.

---

## Exit criteria

- [ ] Typing in header search (250ms debounce) shows up to 8 published matches  
- [ ] Keyboard: ↓/↑ highlight, Enter open/submit, Esc close  
- [ ] Enter / “View all” navigates to `/search?q=...`  
- [ ] Full page shows snippets with `<mark>` styling  
- [ ] Empty query, no results, and failed fetch states handled  
- [ ] Seed terms `onboarding`, `deploy`, `vacation` return expected hits  
- [ ] Drafts never appear in typeahead or `/search`  

---

## Task list

### T5.1 — Complete FTS search in `src/lib/fts.ts`

1. Implement `searchArticles({ query, limit })`:
   - `toFtsQuery`; if empty tokens → `{ results: [] }`
   - SQL join `articles_fts` ↔ `Article` with `status = 'PUBLISHED'`
   - `snippet(articles_fts, 2, '<mark>', '</mark>', '…', 12)` for content snippet (column index per schema)
   - Order by `bm25(articles_fts)` ascending
   - Limit default 10, max 20
   - Include id, slug, title, excerpt/snippet, status, category name/slug
2. Use parameterized queries where possible; FTS MATCH string only from `toFtsQuery` sanitized tokens.
3. Map rows to a stable DTO type shared by API and page.

**Deliverable:** Server-side search function unit-testable at the `toFtsQuery` boundary; integration via API.

---

### T5.2 — Route Handler `GET /api/search`

Implement `src/app/api/search/route.ts`:

- Read `q`, `limit` (default 10, clamp max 20; typeahead will pass `limit=8`)
- Trim `q`; empty → `200` `{ query, results: [] }`
- Response shape per architecture §5.3
- Errors → `500` with safe message (no stack)

**Deliverable:** `curl 'http://localhost:3000/api/search?q=onboarding&limit=8'` returns JSON hits.

---

### T5.3 — SearchBox client component

Replace header placeholder with `src/components/search/SearchBox.tsx`:

| Behavior | Spec |
|----------|------|
| Debounce | **250ms** after last keystroke |
| Min query | 1 char after trim; clear dropdown when empty |
| Fetch | `GET /api/search?q=&limit=8` |
| Dropdown | Absolute under input; max-h-80; border + shadow-sm |
| Row | Title + category badge + single-line excerpt; click → `/articles/[slug]` |
| Keyboard | combobox pattern: `role="combobox"`, listbox options, `aria-activedescendant` |
| Loading | Spinner in input; `aria-busy` |
| Empty results | “No published articles match” / design empty |
| Error | “Search failed. Try again.” |
| Submit | Enter with no highlight or explicit control → `/search?q=` |
| A11y | `aria-label="Search articles"`; form `role="search"` |

Width: `w-full max-w-md` in header. No ⌘K required.

**Deliverable:** Header search is the primary discovery affordance.

---

### T5.4 — Full search results page

1. `src/app/search/page.tsx` — Server Component reading `searchParams.q`.
2. If `q` missing/empty: prompt empty state “Search the knowledge base” + affordance to focus search (link is enough).
3. If `q` present: call `searchArticles` (same lib as API, not only client fetch) with limit 10–20.
4. `SearchResults` component:
   - Heading: `Results for “{q}”` + count
   - Rows: title link, category, snippet HTML with marks (**sanitize snippet** or trust FTS mark wrappers only — strip other tags)
5. Style `mark` with design highlight token (`bg-amber-100` / `--color-highlight`).
6. No filter sidebar.

**Deliverable:** Shareable search URLs work with JS disabled for results rendering (SSR).

---

### T5.5 — Revalidation and FTS integrity check

1. Confirm It. 3 actions still call `syncArticleToFts` / `removeArticleFromFts`.
2. Confirm `revalidatePath("/search")` runs after CUD.
3. Manual check: create published article with unique token → appears in search; delete → gone; draft with token → absent.

**Deliverable:** Search reflects writes without re-seed.

---

### T5.6 — Empty and edge states

| Case | UI |
|------|----|
| No matches | “No results for “{q}”” + note published-only + clear → `/` |
| Typeahead no matches | Non-interactive row in dropdown |
| Special characters in q | `toFtsQuery` strips; no 500s |

**Deliverable:** Calm failure modes; no uncaught exceptions.

---

## Iteration-specific dependency notes

- **Blocks It. 6 E2E search step** — journey requires typeahead or search page success on a seed term.
- **Do not** add `includeDrafts` in v1.
- **Do not** implement external search services.
- After this iteration, the product journey **browse → search → edit** is available for testing.

## Suggested verification

```bash
npm run db:seed
npm run dev
# Type "onboard" in header → typeahead shows onboarding article
# Enter → /search?q=onboard → marked snippets
# q=zzzzzznotfound → empty state
# Draft-only term (if any) does not appear
```

# Iteration 4 — Categories, tags, and list organization

**Goal:** Make organization first-class in the browse UX: URL-driven category and tag filters, correct empty states when taxonomy or results are missing, and consistent uncategorized/meta display — completing feature 4 from the brief as refined by architecture/design.

**Scope:** Filter rail/selects, selected states, clear-filters, ensure form category/tag assignment is solid (finish any gaps from It. 3). **No** admin CRUD pages. **No** search API (It. 5).

**Sources:** architecture §7.4; design §§2.5 S1, 3.1, 3.4, 6.6, 6.10.

**Depends on:** Iterations 1–3 (queries, list page, article form with fields preferred).

---

## Exit criteria

- [ ] Home filters by category slug via `?category=`  
- [ ] Home filters by tag slug via `?tag=`  
- [ ] Filters compose with `status` and `page` (reset page to 1 when filter changes)  
- [ ] Desktop chip/list selected styles; mobile native selects  
- [ ] Empty taxonomy and empty filter-result states match design copy  
- [ ] Create/edit can assign category + multiple tags; detail/list reflect them  
- [ ] Null category displays **Uncategorized**  

---

## Task list

### T4.1 — Query parity for filters

1. Verify `listArticles` applies:
   - `category: { slug }` when `categorySlug` set
   - `tags: { some: { tag: { slug } } }` when `tagSlug` set
   - Combined AND with status
2. Verify counts/pagination use the same where clause (no wrong `totalPages`).
3. Add `getCategoryBySlug` / `getTagBySlug` only if needed for headings.

**Deliverable:** Correct filtered result sets from the data layer.

---

### T4.2 — Filter UI (desktop)

On home list (`md+` rail):

1. **Status** — already from It. 2; ensure selected chip style `bg-accent-muted text-accent`.
2. **Categories** — “All” + each category name as link/chip setting `?category={slug}` (clear param for All).
3. **Tags** — list tags similarly with `?tag=`.
4. Use `<nav aria-label="Filters">`.
5. Selected item: `aria-current="page"` or `aria-pressed` as appropriate.
6. Preserve other params when toggling one dimension; **set `page=1`** (or omit page) on filter change.

**Deliverable:** Clickable filter rail matches design S1 desktop wireframe.

---

### T4.3 — Filter UI (mobile)

Below `md`:

1. Stacked native `<select>` for Status, Category, Tag (design §2.5 mobile).
2. Always visible (no collapsible disclosure required in v1).
3. On change, navigate via query string (small client component or form GET).

**Deliverable:** Usable filters on narrow viewports.

---

### T4.4 — Clear filters + empty states

1. When any non-default filter active and `items.length === 0`: EmptyState  
   - Title: “No matching articles”  
   - Description: “Try another category, tag, or status.”  
   - CTA: “Clear filters” → `/` (or published-only default)
2. When categories list empty: filter section message  
   “No categories yet…” per design §6.10 / §3.4.
3. When no tags on form: “No tags available” empty hint (form side).
4. Global empty (zero articles in DB): keep “No articles yet” + Create CTA from It. 2.

**Deliverable:** No dead-end blank pages.

---

### T4.5 — Finish form category/tag assignment

If It. 3 deferred these:

1. Category `<select>` with “No category” → `categoryId` null.
2. Tags checkbox panel; enforce max 20 in UI (disable extras optional) + Zod.
3. On save, write `categoryId` and replace `ArticleTag` rows transactionally.
4. Detail/list meta: category name or Uncategorized; tags with `+N` overflow on list (max 3 shown).

**Deliverable:** Organization round-trips through edit → list → detail.

---

### T4.6 — Optional createCategory / createTag actions (stretch inside iteration)

Only if time remains after T4.1–T4.5:

- Minimal Server Actions with Zod unique slug
- **Do not** build admin pages
- Prefer seed-only if behind on schedule (architecture v1 decision)

**Deliverable:** Document in README whether seed-only or inline create exists.

---

### T4.7 — Cross-check seed coverage

Ensure seed (It. 1) still provides:

- Multiple categories used by published articles
- Shared tags across articles for filter testing
- At least one uncategorized article

Adjust seed if filters cannot be demoed.

**Deliverable:** Manual QA path for each filter dimension.

---

## Iteration-specific dependency notes

- **Does not block search (It. 5)** technically — search ignores category filters on `/search` per design (no filter sidebar on search).
- **Critical path for product completeness** of feature 4; if session time is short after It. 3, architecture allows prioritizing search (It. 5) before deep filter polish — but complete T4.1 + basic chips before declaring organize done.
- Leave app working: default `/` still lists published; filters never 500 on unknown slug (empty list OK).

## Suggested verification

```bash
npm run dev
# Click category Engineering → only those articles
# Click tag onboarding → filtered set
# Combine status=DRAFT + category
# Clear filters → full published list
# Edit article category/tags → list meta updates
```

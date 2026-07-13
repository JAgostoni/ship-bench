# Iteration 4 Summary — Categories, tags, and list organization

**Date:** 2026-07-13  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

Most organization capability already existed from Iterations 2–3 (URL filters, query layer, form category/tags, Uncategorized meta). This iteration verified parity, closed polish gaps, and documented the seed-only taxonomy decision.

### T4.1 — Query parity for filters

Verified `listArticles` in `src/lib/queries/articles.ts`:

| Filter | Where clause |
|--------|----------------|
| Category | `category: { slug }` when `categorySlug` set |
| Tag | `tags: { some: { tag: { slug } } }` when `tagSlug` set |
| Status | `status` unless `ALL`; default `PUBLISHED` |
| Compose | AND across status + category + tag |
| Counts | Same `where` for `count` and `findMany` (pagination totals correct) |

No `getCategoryBySlug` / `getTagBySlug` needed (list heading stays “Articles”).

### T4.2 — Desktop filter rail

`ArticleFilters` (`md+`):

- `<nav aria-label="Filters">` with Status / Categories / Tags
- Chips: selected = `bg-accent-muted text-accent` + `aria-current="page"`
- “All” clears that dimension; other params preserved
- Filter changes omit `page` (resets to page 1)

### T4.3 — Mobile filters

Below `md`: native `<select>`s via GET form to `/` (Status, Category, Tag) + “Apply filters”. Empty taxonomy shows design copy instead of empty selects.

### T4.4 — Clear filters + empty states

| Context | Behavior |
|---------|----------|
| Active filters, zero matches | “No matching articles” / “Try another category, tag, or status.” / CTA “Clear filters” → `/` |
| Zero articles, no filters | “No articles yet” + Create article CTA |
| Empty categories (rail) | “No categories yet” + seed/create hint |
| Empty tags (rail / form) | “No tags available” + configured hint |
| Unknown slug filter | Empty list (no 500) |

### T4.5 — Form category/tag assignment

Confirmed + polished:

- Category `<select>` with “No category” → `categoryId` null
- Empty categories: form hint (no dead select)
- Tag checkbox panel; **max 20** enforced in UI (disable extras + count) and Zod
- Server actions write `categoryId` and replace `ArticleTag` rows
- List: category or **Uncategorized**; tags max 3 + `+N`
- Detail: full category + all tags; **Uncategorized** when null

### T4.6 — createCategory / createTag (stretch)

**Not implemented** (seed-only per architecture v1). Documented in README.

### T4.7 — Seed coverage

Seed still provides:

- 4 categories (Engineering, Product, HR, Operations) used by published articles
- 6 tags shared across articles (`onboarding`, `runbook`, `rfc`, `faq`, `process`, `security`)
- 1 uncategorized published article: `remote-work-tips`

Manual QA path: filter Engineering → tag onboarding → Drafts + engineering → Clear filters → edit category/tags → list/detail meta updates.

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| **Carry-forward from It. 2/3** | Filters, list meta, form fields, and actions were largely complete; this iteration focused on verification, empty-state copy, max-tags UX, and docs. |
| **Seed-only taxonomy** | No admin pages and no inline create actions (T4.6 stretch skipped intentionally). |
| **Mobile apply button** | Form GET + submit (not onChange navigation); acceptable per iteration (“client component or form GET”). |
| **Search** | Still disabled placeholder (Iteration 5). |

---

## Verification (local)

```text
npm run dev          # http://localhost:3000
npm test             # 7 passed
```

Manual / HTTP checks:

| Check | Result |
|-------|--------|
| `/?category=engineering` | Engineering published articles only |
| `/?tag=onboarding` | new-hire-onboarding + remote-work-tips |
| `/?status=DRAFT&category=engineering` | experimental-search-ranking |
| `/?category=product&tag=process` | product RFCs with process tag |
| `/?category=does-not-exist` | Empty state + Clear filters |
| `/articles/remote-work-tips` | Meta shows Uncategorized |
| `/articles/new` | Category select + tag checkboxes |
| Detail after assign | Category + tags on list/detail |

App remains runnable; default `/` lists published articles; filters never 500 on unknown slugs.

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-I4-1 | **Seed-only categories/tags** (no createCategory/createTag) | Architecture v1; stretch only if time after polish; keep finishable |
| D-I4-2 | **Mobile filters stay form GET** | No client JS required; matches It. 2 pattern and iteration allowance |
| D-I4-3 | **Max 20 tags disabled in UI** | Matches Zod + design; prevents confusing validation-only failure |
| D-I4-4 | **Empty taxonomy copy from design §6.10** | Title + description split on desktop rail for readability |

---

## Exit criteria checklist

- [x] Home filters by category slug via `?category=`
- [x] Home filters by tag slug via `?tag=`
- [x] Filters compose with `status` and `page` (reset page on filter change)
- [x] Desktop chip selected styles; mobile native selects
- [x] Empty taxonomy and empty filter-result states match design copy
- [x] Create/edit assign category + multiple tags; detail/list reflect them
- [x] Null category displays **Uncategorized**

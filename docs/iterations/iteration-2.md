# Iteration 2 — Article browsing and detail

**Goal:** Deliver the primary read experience: browse a paginated article list (published by default), open an article by slug, and see correct empty and not-found states — all SSR via Server Components.

**Scope:** Query layer + UI primitives + list + detail + basic status presentation. **No** create/edit mutations, TipTap, or live search API (header search remains placeholder unless you only style it).

**Sources:** architecture §§4.1–4.3, 5.4, 7.1; design §§2.5 S1/S3/S6, 3.1, 3.5, 6.x, 8.

**Depends on:** Iteration 1 complete (DB, seed, shell, utils, tokens).

---

## Exit criteria

- [ ] `/` lists published seed articles (title, excerpt, category or “Uncategorized”, Draft badge if ever shown, relative updated date)  
- [ ] Pagination works via `?page=` (`pageSize=20`)  
- [ ] Status filter works: Published (default) / Drafts / All via `?status=`  
- [ ] Clicking a row opens `/articles/[slug]` with title, meta, prose body  
- [ ] Unknown slug → not-found UI (design S6)  
- [ ] Empty DB / empty filter states render per design §6.10  
- [ ] No client fetch waterfalls for primary list/detail data  

---

## Task list

### T2.1 — Article query module

Implement `src/lib/queries/articles.ts`:

| Function | Behavior |
|----------|----------|
| `listArticles(params)` | Filter by `status` (`PUBLISHED` default when omitted), optional `categorySlug`, optional `tagSlug` (tag filter can accept param now and no-op in UI until It. 4), `page` (1-based), `pageSize` default **20**. Sort `updatedAt desc`. `include: { category: true, tags: { include: { tag: true } } }`. Return `{ items, total, page, pageSize, totalPages }`. |
| `getArticleBySlug(slug)` | Full article with category + tags; return `null` if missing. |

Also add thin helpers if useful:

- `listCategories()` — id, name, slug ordered by name (for It. 4 filters; can ship now)
- `listTags()` — same for tags

**Rule:** Pages call queries only — no raw Prisma in `page.tsx`.

**Deliverable:** Typed query functions covered by manual Studio + page usage.

---

### T2.2 — Shared UI primitives

Implement `src/components/ui/` per design §6:

| Component | Notes |
|-----------|-------|
| `Button.tsx` | Variants: primary, secondary, ghost, danger, danger-ghost; h-10; focus-visible ring; disabled opacity |
| `Input.tsx` | Label pairing later; default/hover/focus/error styles |
| `Label.tsx` | `htmlFor` support |
| `Select.tsx` | Native select styling |
| `Badge.tsx` | Base pill (StatusBadge can wrap) |
| `Textarea.tsx` | Optional until form; can defer if unused |

Use design tokens / CSS variables. Prefer simple className composition over a heavy CVA setup unless already comfortable.

**Deliverable:** Primitives usable by list/detail/header without restyling from scratch later.

---

### T2.3 — StatusBadge, EmptyState, date helpers

1. `StatusBadge` — show **Draft** badge only for `DRAFT` (published has no badge by default per design §3.5). Amber pill styles.
2. `EmptyState` — icon (lucide), title, description, optional CTA button/link.
3. `src/lib/utils/dates.ts` (or similar):
   - `formatRelativeUpdated(date)` → e.g. “Updated 3d ago” for list
   - `formatAbsoluteUpdated(date)` → e.g. “Updated Jul 10, 2026, 2:14 PM” for detail  
   Use `Intl` or small pure helpers; English only.

**Deliverable:** Shared presentation components for list/detail/empty.

---

### T2.4 — Article list components

1. `ArticleListItem` — full-row link to `/articles/[slug]`:
   - Title (semibold, 1-line truncate)
   - Draft badge if draft
   - Excerpt 2-line clamp, muted
   - Meta: category name or **Uncategorized** · up to 3 tags then `+N` · relative date
   - Hover `bg-subtle`; border-b separator; focus-visible ring
2. `ArticleList` — maps items; renders `EmptyState` when empty; renders pagination when `totalPages > 1`.
3. Pagination controls: Previous / “Page {n}” / Next; disable edges; update URL `?page=` preserving other searchParams.

**Copy:** design §8 (`list.title`, empty strings, pagination labels).

**Deliverable:** Presentational list ready for page data.

---

### T2.5 — Home page list + filter chrome (status)

1. Replace placeholder `src/app/page.tsx` with Server Component reading `searchParams`: `status`, `category`, `tag`, `page`.
2. Default status: **PUBLISHED** when `status` omitted.
3. Layout per design S1:
   - **md+:** left filter rail (~220px) + list
   - **&lt; md:** stacked native selects for filters
4. **This iteration:** implement **Status** filter fully (Published / Drafts / All) as URL-driven links or selects.
5. Categories and tags sections: render from `listCategories`/`listTags` **or** show empty-state placeholders; full interactive category/tag filter wiring is completed in It. 4 — if cheap, wire `?category=` / `?tag=` now since queries already support them.
6. Page header: “Articles” (+ optional count).
7. Prefer `force-dynamic` or default dynamic rendering appropriate for SQLite writes (architecture §7.1).

**Recommendation:** Wire category/tag URL filters here if list queries support them (small effort); polish chip selected states in It. 4 if needed.

**Deliverable:** Working browse home with at least status filtering + pagination.

---

### T2.6 — Article detail page

1. `src/app/articles/[slug]/page.tsx` — Server Component:
   - `getArticleBySlug`; if null → `notFound()`
   - Render `ArticleDetail`
2. `ArticleDetail`:
   - Back link “All articles” (`ArrowLeft`) → `/` (not `history.back`)
   - H1 title; Draft badge if draft
   - Meta: category · tags · absolute updated date
   - Actions: **Edit** (link to `/articles/[slug]/edit` — page may not exist until It. 3), **Delete** button can be non-functional stub or hidden until It. 3 — prefer visible Edit link, defer working Delete to It. 3
   - Body: sanitized HTML in `.prose-article` via `dangerouslySetInnerHTML` **only after** `sanitize` (complete sanitizer if still stubbed)
3. Content column `max-w-3xl`.

**Deliverable:** Read full seed articles safely.

---

### T2.7 — Not-found page

Implement `src/app/not-found.tsx` per design S6:

- Icon `FileQuestion`
- Title “Article not found”
- Body copy from design §8 / §2.5
- CTA “Back to articles” → `/`

**Deliverable:** Bad slugs and unknown routes show branded 404.

---

### T2.8 — Header alignment

1. Ensure `AppHeader` “New article” uses primary button styles.
2. Keep search input styled (placeholder only) for layout parity with design.
3. Responsive header: two rows below `md` (logo+New / full-width search) per design §4.2.

**Deliverable:** Shell matches design on tablet/desktop/mobile widths.

---

## Iteration-specific dependency notes

- **Unblocks It. 3:** detail route and list give destinations for post-save redirects and Edit entry points.
- **Sanitizer:** if It. 1 left `sanitize` incomplete, finish it **before** T2.6.
- **Category/tag filter UI:** partial OK; It. 4 owns form assignment + any remaining filter UX.
- **Do not** implement Server Actions or TipTap here — keep the read path stable and reviewable.
- Leave the app **working**: seed data visible, no runtime errors on `/` and valid detail URLs.

## Suggested verification

```bash
npm run db:seed
npm run dev
# / shows published articles
# ?status=DRAFT shows drafts
# ?page=2 if enough rows (or temporarily lower pageSize locally only for check)
# open a slug; confirm prose
# visit /articles/does-not-exist → 404 UI
```

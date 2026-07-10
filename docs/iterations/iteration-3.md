# Iteration 3 — Create, edit, delete (with draft/published)

**Goal:** Complete the write path so content owners can create, update, and delete articles with validation, TipTap editing, draft/published status, HTML sanitization, FTS sync on CUD, and cache revalidation.

**Scope:** Zod schemas, Server Actions, shared `ArticleForm`, TipTap editor + toolbar, create/edit routes, delete with confirm, status on form. Category/tag **fields may be present as optional selects** if cheap; full filter UX remains It. 4 focus. Search remains placeholder.

**Sources:** architecture §§5.2, 5.5, 7.3, 7.5, 8.2, 8.4; design §§2.3–2.4, 2.5 S4/S5, 3.3, 3.6, 6.7–6.8, 7.3.

**Depends on:** Iterations 1–2 (DB, queries, list/detail, UI primitives).

---

## Exit criteria

- [ ] `/articles/new` creates article (draft or published) and redirects to detail  
- [ ] `/articles/[slug]/edit` updates article and redirects to detail  
- [ ] Validation errors show inline (title, slug, content, etc.)  
- [ ] Slug auto-generates from title on create until user edits slug  
- [ ] Delete from detail (and edit) with confirm; redirects `/`  
- [ ] FTS rows stay in sync on create/update/delete  
- [ ] List/detail revalidate after mutations  
- [ ] Draft vs published selectable on form; list status filter still works  

---

## Task list

### T3.1 — Install TipTap and wire dynamic import strategy

1. Install packages (architecture §7.3):

   - `@tiptap/react@^3.27.3`
   - `@tiptap/starter-kit@^3.27.3`
   - `@tiptap/extension-link@^3.27.3`
   - `@tiptap/pm@^3.27.3`

2. Plan `dynamic(() => import(...), { ssr: false })` for the editor from form pages so list/detail bundles stay lean.

**Deliverable:** Dependencies installed; no SSR crash from TipTap.

---

### T3.2 — Zod validation schemas

Implement `src/lib/validation/article.ts` per architecture §7.3:

- `articleStatusSchema`: `DRAFT` | `PUBLISHED`
- `articleFormSchema`: title, slug (regex), contentHtml, status, optional nullable `categoryId`, `tagIds` max 20, optional `expectedUpdatedAt` (ISO datetime) for edit
- Export `ArticleFormInput` type
- Add `src/lib/validation/category.ts` / `tag.ts` only if creating those entities; not required if seed-only

**Deliverable:** Schema ready for unit tests in It. 6 and actions now.

---

### T3.3 — Complete HTML sanitization

1. Finish `src/lib/utils/sanitize.ts` if not done:
   - Allowlist tags: `p, h2, h3, strong, em, s, ul, ol, li, a, code, pre, blockquote, br`
   - Allowlist attrs: `href` on `a` with http/https/mailto only
2. **Sanitize on write** inside create/update actions before persist.
3. Detail page may sanitize again on read as defense-in-depth (optional if write path guaranteed).

**Deliverable:** Stored HTML cannot carry script/event handlers.

---

### T3.4 — Revalidation helpers

`src/lib/utils/revalidate.ts` (or inline carefully):

After CUD, revalidate:

- `/`
- `/search`
- `/articles/${slug}`
- `/articles/${slug}/edit`

On slug change, revalidate **old and new** slug paths.

**Deliverable:** List/detail update without full server restart.

---

### T3.5 — Server Actions for articles

Implement `src/lib/actions/articles.ts` (`"use server"`):

| Action | Behavior |
|--------|----------|
| `createArticle` | Parse FormData or typed input → Zod → sanitize HTML → compute excerpt → insert article + tag links → `syncArticleToFts` → revalidate → redirect to `/articles/[slug]` |
| `updateArticle` | Load by id → if `expectedUpdatedAt` present and mismatches DB `updatedAt`, return `ActionResult` `{ ok:false, code:"CONFLICT" }` → else validate, sanitize, update fields, replace tag links, FTS sync, revalidate (old+new slug), redirect |
| `deleteArticle` | Delete article (cascade `ArticleTag`) → `removeArticleFromFts` → revalidate → redirect `/` |

Use `ActionResult` shape from architecture §8.2 for error returns (validation, unique slug, not found, conflict, internal).

**Unique slug:** map Prisma unique constraint to `fieldErrors.slug` / code `UNIQUE`.

**Deliverable:** Mutations work from forms; FTS stays consistent.

---

### T3.6 — RichTextEditor + EditorToolbar

1. `EditorToolbar` — icon buttons (lucide) in design order:
   Bold, Italic, Strike | H2, H3 | Bullet, Ordered | Link (`window.prompt` for URL) | Code block | Undo, Redo  
   - 36×36 hit targets; `aria-label`; `aria-pressed` when active
2. `RichTextEditor` — TipTap with StarterKit + Link; `min-height` 280px; controlled `content` / `onChange` HTML string; placeholder “Start writing…” when empty; error border when form marks content invalid
3. Toolbar may be static at top of editor (sticky optional).
4. Horizontal scroll toolbar on small screens.

**Deliverable:** Client-only editor produces HTML TipTap output.

---

### T3.7 — Shared ArticleForm

`ArticleForm` client component used by create and edit:

| Field | Behavior |
|-------|----------|
| Title | Required; on create, drives slug until `slugTouched` |
| Slug | Required; helper text `URL: /articles/{slug}`; create auto-slugify |
| Status | Radio group Draft / Published (`fieldset`/`legend`) |
| Category | Native select “No category” + options (load via props from server) — wire now if categories seeded |
| Tags | Checkbox list of existing tags (max 20 enforced by schema) — wire now if tags seeded |
| Content | `RichTextEditor` |
| Hidden | `id`, `expectedUpdatedAt` on edit |
| Actions | Save (“Save article” / “Save changes”); Cancel link; Delete on edit only |

Behavior:

- Submit → server action; on `ok:false` map `fieldErrors` + form banner
- Saving state: button “Saving…”, disabled, `aria-busy`
- Conflict: banner copy from design §8 + “Reload” hard-navigating to edit URL
- Cancel: create → `/`; edit → `/articles/[slug]`; **no dirty guard** (design D / decisions)
- Scroll to first error on validation failure

**Deliverable:** One form for both flows.

---

### T3.8 — Create and edit pages

1. `src/app/articles/new/page.tsx` — server page loads categories/tags; renders form in `max-w-3xl`; title “Create article”.
2. `src/app/articles/[slug]/edit/page.tsx` — load article by slug or `notFound()`; pass initial values + `expectedUpdatedAt` ISO from `updatedAt`; title “Edit article”.

**Deliverable:** Both routes functional end-to-end.

---

### T3.9 — Wire Delete on detail (and form)

1. Detail page: Delete control with visible “Delete” text; confirm  
   `Delete “{title}”? This cannot be undone.`  
   then call `deleteArticle`.
2. Same on edit form (far right).
3. Use native `window.confirm` (no modal library).

**Deliverable:** Article removable from UI; disappears from list.

---

### T3.10 — Status integration check

1. Confirm create-as-draft does **not** appear on default home list.
2. Confirm `?status=DRAFT` or Drafts filter shows it.
3. Publishing via edit moves it to default list.
4. Draft badge visible on detail/list for drafts.

**Deliverable:** Status feature meets architecture §7.5 / design §3.5 for v1.

---

## Iteration-specific dependency notes

- **Blocks It. 5 search quality:** every CUD must sync FTS; missing sync → empty/wrong search.
- **Blocks It. 6 E2E edit step:** create/edit must be stable before Playwright journey.
- **Category/tag on form:** implement selects here so It. 4 can focus on list filters and empty states; if timeboxed, ship form without tags first and complete in It. 4 — prefer shipping both field UIs here since seed data exists.
- **Conflict UX:** implement detection in action now; banner polish acceptable to refine in It. 6.
- App must remain runnable: browse still works; new articles appear after publish.

## Suggested verification

```bash
npm run dev
# New article → fill title/body → save draft → not on / → visible with ?status=DRAFT
# Publish via edit → appears on /
# Edit title → save → detail shows new title
# Delete → confirm → gone from list
# Invalid empty title → field error, no redirect
```

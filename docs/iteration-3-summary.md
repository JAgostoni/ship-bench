# Iteration 3 Summary — Create, edit, delete (with draft/published)

**Date:** 2026-07-13  
**Status:** Complete  
**Exit criteria:** Met

---

## What was built

### Dependencies (T3.1)

Installed TipTap stack per architecture §7.3:

- `@tiptap/react@^3.27.3`
- `@tiptap/starter-kit@^3.27.3`
- `@tiptap/extension-link@^3.27.3`
- `@tiptap/pm@^3.27.3`

Editor is loaded with `next/dynamic(..., { ssr: false })` from `ArticleForm` so list/detail bundles stay free of TipTap.

### Validation (T3.2)

`src/lib/validation/article.ts`:

- `articleStatusSchema`: `DRAFT` | `PUBLISHED`
- `articleFormSchema`: title, slug (regex), contentHtml (plain-text required after strip), status, optional nullable `categoryId`, `tagIds` max 20, optional `expectedUpdatedAt`
- Empty TipTap docs (`<p></p>`) fail with “Content is required”
- Exports `ArticleFormInput` / `ArticleFormValues`

### Sanitization (T3.3)

Existing `sanitizeHtml` (allowlist + DOMPurify) is applied **on write** inside create/update actions before persist. Detail continues to sanitize on read (defense in depth).

### Revalidation (T3.4)

`src/lib/utils/revalidate.ts` — `revalidateArticlePaths(slug, previousSlug?)` revalidates `/`, `/search`, detail, and edit paths; on slug change, both old and new paths.

### Server Actions (T3.5)

`src/lib/actions/articles.ts` (`"use server"`):

| Action | Behavior |
|--------|----------|
| `createArticle` | FormData → Zod → sanitize → excerpt → insert + tags → FTS sync → revalidate → redirect detail |
| `updateArticle` | Load by id → conflict on `expectedUpdatedAt` mismatch → validate → sanitize → update + replace tags → FTS → revalidate (old+new slug) → redirect |
| `deleteArticle` | Hard delete (cascade tags) → remove FTS → revalidate → redirect `/` |

`ActionResult` codes: `VALIDATION` | `NOT_FOUND` | `CONFLICT` | `UNIQUE` | `INTERNAL`. Unique slug maps to `fieldErrors.slug`.

### Editor (T3.6)

- `EditorToolbar` — Bold, Italic, Strike | H2, H3 | Bullet, Ordered | Link (`window.prompt`) | Code block | Undo, Redo; 36×36 hit targets; `aria-label` / `aria-pressed`; horizontal scroll
- `RichTextEditor` — TipTap StarterKit + Link; min-height 280px; placeholder “Start writing…”; error border support

### Shared form (T3.7)

`ArticleForm` client component:

- Title (auto-slugify on create until slug touched)
- Slug with helper `URL: /articles/{slug}`
- Status radio group Draft / Published
- Category select (“No category” + seed options)
- Tag checkbox list
- Content via dynamic TipTap
- Hidden id + `expectedUpdatedAt` on edit
- Save / Cancel / Delete (edit only)
- Inline field errors, form banner, conflict banner + Reload, saving state (`Saving…`, `aria-busy`), scroll to first error

### Routes (T3.8)

| Route | Behavior |
|-------|----------|
| `/articles/new` | Server page loads categories/tags; form title “Create article” |
| `/articles/[slug]/edit` | Load article or `notFound()`; prefill + `expectedUpdatedAt` ISO; “Edit article” |

### Delete wiring (T3.9)

- Detail: `DeleteArticleButton` with confirm  
  `Delete “{title}”? This cannot be undone.`
- Edit form: same confirm + `deleteArticle`

### Status (T3.10)

- Create-as-draft does **not** appear on default home list
- Visible under `?status=DRAFT`
- Publishing moves article onto default published list
- Draft badge still shown on list/detail for drafts (from Iteration 2)

---

## Assumptions and issues

| Item | Notes |
|------|--------|
| **Category/tag on form** | Wired now (select + checkboxes) so Iteration 4 can focus on list filter polish/empty states. |
| **Conflict UX** | Detection + banner + Reload hard-nav implemented; further polish deferred to Iteration 6 if needed. |
| **TipTap placeholder** | Absolute “Start writing…” overlay instead of `@tiptap/extension-placeholder` (design allows either). |
| **Server Action export rule** | Next requires only async exports from `"use server"` modules; `parseArticleFormData` is private (not exported). |
| **Search** | Still a disabled header placeholder (Iteration 5). FTS is kept in sync on CUD for when search lands. |
| **Build warning** | Pre-existing NFT / `db.ts` path-resolution warning remains non-blocking. |
| **Redirect handling** | Client forms catch Next’s `NEXT_REDIRECT` digest so successful saves do not show a false error banner. |

---

## Verification (local)

Commands run successfully:

```text
npm test                 # 7 tests passed
npm run build            # success; routes include /articles/new and /articles/[slug]/edit
npm run dev              # http://localhost:3000
```

HTTP / data checks:

| Check | Result |
|-------|--------|
| `GET /` | 200 |
| `GET /articles/new` | 200; Create article, Save article, Draft/Published, No category, Tags |
| `GET /articles/{seed}/edit` | 200; Edit article, Save changes, Delete |
| `GET /articles/{seed}` | 200; Edit + Delete controls |
| Draft article on `/` | **not** listed |
| Same draft on `/?status=DRAFT` | listed |
| Validation empty title/content | Zod fails with required messages |
| Sanitize strips `script` / `javascript:` href | confirmed |
| FTS insert/delete with CUD | confirmed |
| Publish then delete | status + hard delete + FTS remove confirmed |

Suggested manual browser flow (also in iteration brief):

1. New article → fill title/body → save as draft → absent on `/` → present with Drafts filter  
2. Edit → set Published → appears on `/`  
3. Edit title → save → detail shows new title  
4. Delete → confirm → gone from list  
5. Empty title → field error, no redirect  

---

## Decisions log

| ID | Decision | Rationale |
|----|----------|-----------|
| D-I3-1 | Content validation uses plain-text after `stripHtml`, not raw HTML length | TipTap empty docs are often `<p></p>`; design requires “Content is required” for empty editor |
| D-I3-2 | Category “empty” select value normalized to `null` in Zod transform | Matches optional FK and “No category” UX |
| D-I3-3 | Tag links replaced wholesale on update (`deleteMany` + `createMany`) | Simple, correct many-to-many; ignores stale tag ids |
| D-I3-4 | Category/tag fields shipped in It. 3 form | Iteration brief prefers wiring while seed data exists; list filter polish remains It. 4 |
| D-I3-5 | Delete is a client button + `window.confirm`, not a form POST | Matches design §3.6; works on both detail and edit |
| D-I3-6 | Conflict returns `ActionResult` with code `CONFLICT`; no overwrite in v1 | Architecture §5.2 / design conflict banner |

---

## Out of scope (noted, not built)

- Full search typeahead / `/search` (Iteration 5)
- Playwright critical journey + expanded unit suite (Iteration 6)
- List filter empty-state polish beyond existing It. 2 filters (Iteration 4)
- Auth, toasts, modal library, autosave

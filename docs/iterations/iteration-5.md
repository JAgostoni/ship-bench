# Iteration 5 — Create and Edit Articles

## Goal

Build the create and edit article flows with full form validation, the Markdown editor, Server Actions for mutations, and inline delete with confirmation. After this iteration the complete content authoring cycle works: create a new article, edit an existing one, change its status, and delete it. The application is feature-complete for the MVP.

## Scope

- Server Actions for create, update, and delete mutations (`src/actions/article.ts`)
- `ArticleEditor` client component (dynamic import of `@uiw/react-md-editor`)
- Create article page (`src/app/articles/new/page.tsx`) with full form validation
- Edit article page (`src/app/articles/[slug]/edit/page.tsx`) with pre-populated fields and inline delete confirmation
- Category `<select>` dropdown populated from the API
- Status radio group (Published / Draft)
- Slug preview helper text below the Title field
- Form error handling via `useActionState`

---

## Task List

### 5.1 — Implement Server Actions for article mutations

Create `src/actions/article.ts`. This file is `'use server'`.

**`createArticleAction(prevState, formData: FormData)`**

1. Extract fields from `formData`: `title`, `content`, `status`, `categoryId` (empty string → `null`)
2. Validate with `createArticleSchema` from `src/lib/schemas.ts`. If invalid, return `{ errors: zodIssuesAsFieldMap }` (map Zod issues to field names so the client can display inline errors)
3. Call `createArticle(validatedData)` from `src/lib/articles.ts`
4. Call `revalidatePath('/articles')`
5. Call `redirect('/articles/' + article.slug)` (redirect to the new article's detail page)

**`updateArticleAction(id: string, prevState, formData: FormData)`**

The `id` is curried in — use `updateArticleAction.bind(null, articleId)` in the form component.

1. Extract and validate fields same as create (use `updateArticleSchema`)
2. Call `updateArticle(id, validatedData)`
3. Call `revalidatePath('/articles')` and `revalidatePath('/articles/' + updatedArticle.slug)`
4. Call `redirect('/articles/' + updatedArticle.slug)`

**`deleteArticleAction(id: string)`**

Also curried via `.bind`:

1. Call `deleteArticle(id)` from `src/lib/articles.ts`
2. Call `revalidatePath('/articles')`
3. Call `redirect('/articles')`

**Error return shape** (for `useActionState`):
```ts
type ActionState = {
  errors?: {
    title?: string[];
    content?: string[];
    status?: string[];
    categoryId?: string[];
    _form?: string[];   // for top-level / unexpected errors
  };
};
```

### 5.2 — Implement the `ArticleEditor` client component

Create `src/components/ArticleEditor.tsx` with `'use client'`:

- Dynamically import `@uiw/react-md-editor`:
  ```ts
  const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
  ```
- Props: `{ defaultValue?: string; name: string; error?: string }`
- Internal `useState` to track editor value
- Render:
  1. A loading skeleton (grey `animate-pulse` box, same height as the editor) shown while the dynamic import resolves — use a conditional based on `MDEditor` being `undefined` or handle via Suspense
  2. `<MDEditor value={value} onChange={setValue} minHeight={400} />`
  3. A `<textarea name={name} value={value} readOnly className="sr-only" />` — hidden, keeps the editor value reachable by the Server Action via `formData.get(name)`. The `readOnly` + `sr-only` pattern avoids a controlled/uncontrolled warning while keeping the value in form state.
  4. If `error`: `<p role="alert" className="text-sm text-[--color-error] mt-1">{error}</p>` below the editor; also apply a red border wrapper around the editor when error is present
- Do not customize the `@uiw/react-md-editor` toolbar — use the default

### 5.3 — Implement the create article page

Implement `src/app/articles/new/page.tsx` as a Server Component shell that renders a Client Component form.

**Page structure (Server Component):**
- Fetch categories: call `listCategories()` from `src/lib/categories.ts`
- Render `<CreateArticleForm categories={categories} />`

**`CreateArticleForm`** — a separate Client Component file (`src/components/CreateArticleForm.tsx`) with `'use client'`:

- Use `useActionState(createArticleAction, {})` to bind the form to the Server Action
- Use `useFormStatus` (from `react-dom`) in the submit button to show "Creating…" and disable it while pending

**Form layout (design spec §2.4):**

1. Back link `← Articles` (same style as detail page)
2. `<h2>New Article</h2>` (24px bold)
3. `<hr>`
4. **Title field:**
   - `<label>Title *</label>` + `<input type="text" name="title" maxLength={200} />`
   - On `onBlur`: compute slug preview using a client-side slugify call (import `slugify` directly in the client component) and update a local state variable
   - Below input: helper text "URL: /articles/[computed-slug]" in 13px `--color-text-muted`
   - If `state.errors?.title`: error message below helper text with `role="alert"`
5. **Category field:**
   - `<label>Category</label>` + `<select name="categoryId">`
   - First option: `<option value="">No category</option>`
   - Remaining options sorted alphabetically from the `categories` prop
6. **Status field:**
   - `<fieldset>` with `<legend>Status</legend>`
   - Two radio inputs: `<input type="radio" name="status" value="PUBLISHED">` (default checked) and `<input type="radio" name="status" value="DRAFT">`
   - Labels inline with `44px` minimum touch target
7. **Content field:**
   - `<label>Content *</label>`
   - `<ArticleEditor name="content" error={state.errors?.content?.[0]} />`
8. **Button row** (flex, space-between):
   - Left: `<Link href="/articles">Cancel</Link>` (ghost/secondary style)
   - Right: submit button "Create Article →" (primary, disabled while pending)
9. **Top-level form error**: If `state.errors?._form`: render `<p role="alert">` at the top of the form below the `<h2>` divider

### 5.4 — Implement the edit article page

Implement `src/app/articles/[slug]/edit/page.tsx` as a Server Component shell.

**Data fetching:**
- Call `getArticleBySlug(params.slug)` — `notFound()` if null
- Call `listCategories()` to populate the category dropdown

**Render:** `<EditArticleForm article={article} categories={categories} />`

**`EditArticleForm`** — a separate Client Component (`src/components/EditArticleForm.tsx`) with `'use client'`:

- Bind `updateArticleAction` with the article id: `const [state, formAction] = useActionState(updateArticleAction.bind(null, article.id), {})`
- Form layout identical to the create form with these differences:
  - Page heading: `<h2>Edit Article</h2>`
  - All fields pre-populated from `article` prop (`defaultValue` on inputs, `defaultChecked` on the matching radio, `defaultValue` on select)
  - Slug preview shows the current slug on mount (update on blur if title changes)
  - Submit button label: "Save Changes"
  - After the `[Cancel] [Save Changes]` button row, add the **Delete section**:

**Inline delete confirmation (design spec §2.5):**

Use a local `useState` boolean `showDeleteConfirm`:
- When `showDeleteConfirm === false`: render a ghost-destructive "Delete" button (Lucide `Trash2` icon, `--color-error` text, no border). On click: set `showDeleteConfirm = true`.
- When `showDeleteConfirm === true`: replace the delete button with:
  ```
  Delete this article?   [Cancel]   [Yes, delete]
  ```
  - "Delete this article?" — 14px `--color-text-primary`
  - "Cancel" — text button, `--color-text-secondary`, onClick: `setShowDeleteConfirm(false)`
  - "Yes, delete" — a `<form>` with a hidden input and `action={deleteArticleAction.bind(null, article.id)}` as a button (`<button type="submit">`) with error-red primary style (bg `--color-error`, text white, hover `#b91c1c`)
  - The confirmation uses `role="alert"` when it appears so screen readers announce it

**Cancel links:** both the form-level "Cancel" and the back link navigate to `/articles/[article.slug]` (the detail page), not `/articles`.

### 5.5 — Server Action for categories (optional helper)

Create `src/actions/category.ts` (`'use server'`) with a single `createCategoryAction` function following the same pattern as article actions. This is not exposed in any UI in v1 but ensures the `src/actions/category.ts` file exists as specified in the architecture spec's repo tree.

### 5.6 — Verify the full authoring cycle

With the dev server running and database seeded:

**Create flow:**
1. Click "New Article" in the sidebar
2. Fill in Title — confirm slug preview appears on blur (e.g., "URL: /articles/my-test-article")
3. Select a category from the dropdown
4. Set status to "Draft"
5. Enter Markdown content in the editor (confirm split-pane preview renders)
6. Click "Create Article →" — confirm redirect to the new article's detail page
7. Confirm the new article shows as DRAFT (badge visible), with correct category

**Validation flow:**
1. Submit the create form with blank Title — confirm inline error "Title is required" appears
2. Submit with blank Content — confirm "Content is required" error appears
3. Confirm errors appear inline below the field, not at the top of the form

**Edit flow:**
1. Open an existing article, click "Edit"
2. Confirm all fields are pre-populated
3. Change the title — confirm slug preview updates on blur
4. Change content, click "Save Changes" — confirm redirect to updated detail page with new content

**Delete flow:**
1. On an edit page, click "Delete"
2. Confirm the inline confirmation prompt appears ("Delete this article? [Cancel] [Yes, delete]")
3. Click "Cancel" — confirm prompt disappears and the delete button returns
4. Click "Delete" again, then "Yes, delete" — confirm redirect to `/articles` and article no longer appears in the list

---

## Iteration Notes

- `redirect()` throws an error in Next.js — do not call it inside a `try/catch` that catches all errors. Wrap only the Prisma call (not the redirect) in try/catch, or use a conditional return for errors before calling `redirect()`.
- The hidden `<textarea>` pattern for syncing the MD editor value is required because Server Actions receive `FormData`, not JSON. The hidden textarea must be kept in sync with the editor `useState` value via `onChange`.
- `useActionState` returns `[state, formAction, isPending]` in React 19. Use `isPending` to disable the submit button during submission (this replaces the need for `useFormStatus` in most cases).
- The `bind(null, article.id)` pattern for currying the article id into a Server Action is the standard Next.js 15+ approach. The id is not passed as a hidden form field to avoid tampering.
- The slug preview in the edit form should only show "URL will change to: /articles/[new-slug]" when the title has been changed from its original value. If the title hasn't changed, show the current slug as-is.
- The category `<select>` in both forms must show "No category" as the first option (value `""`). The Server Action treats an empty string for `categoryId` as `null` when creating/updating.

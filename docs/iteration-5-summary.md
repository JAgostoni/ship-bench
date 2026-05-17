# Iteration 5 Summary — Create and Edit Articles

## What was built

### Server Actions (`src/actions/article.ts`)
- `createArticleAction(prevState, formData)` — validates with `createArticleSchema`, calls `createArticle()`, revalidates `/articles`, redirects to the new article's detail page.
- `updateArticleAction(id, prevState, formData)` — bound with `.bind(null, article.id)`, validates with `updateArticleSchema`, calls `updateArticle()`, revalidates both `/articles` and the article detail path, then redirects.
- `deleteArticleAction(id, _formData?)` — bound via `.bind`, calls `deleteArticle()`, revalidates `/articles`, redirects to `/articles`.
- All actions return `ActionState` with field-level error maps for `useActionState`.

### Category Server Action stub (`src/actions/category.ts`)
- `createCategoryAction` following the same pattern as article actions. Not wired to any UI in v1; file exists per the architecture spec repo tree.

### `ArticleEditor` component (`src/components/ArticleEditor.tsx`)
- Client Component with `'use client'` directive.
- Dynamically imports `@uiw/react-md-editor` with `ssr: false`.
- Tracks editor value in `useState`; syncs to a hidden `<textarea name={name} readOnly className="sr-only">` so Server Actions read the value from FormData.
- Shows an `animate-pulse` skeleton while the dynamic import resolves.
- Displays inline error with `role="alert"` and a red border wrapper when `error` prop is set.

### Create article flow
- `src/app/articles/new/page.tsx` — Server Component that fetches categories via `listCategories()` and renders `<CreateArticleForm categories={categories} />`.
- `src/components/CreateArticleForm.tsx` — Client Component using `useActionState(createArticleAction, {})`. Slug preview computed via `slugifyLib` on title input blur. Full form with Title, Category select, Status radio group, Content editor, and Cancel / "Create Article →" button row.

### Edit article flow
- `src/app/articles/[slug]/edit/page.tsx` — Server Component that fetches article by slug (calls `notFound()` if missing) and categories in parallel, renders `<EditArticleForm article={article} categories={categories} />`.
- `src/components/EditArticleForm.tsx` — Client Component using `useActionState(updateArticleAction.bind(null, article.id), {})`. All fields pre-populated. Slug preview only shows "URL will change to:" when title has been modified from its original value. Inline delete confirmation section using `useState` boolean — click "Delete" reveals "Delete this article? [Cancel] [Yes, delete]" with `role="alert"`.

## Assumptions and decisions

- **`redirect()` placement:** `revalidatePath` and `redirect` are called outside all `try/catch` blocks. The `try/catch` only wraps the Prisma service call to capture DB errors cleanly.
- **`deleteArticleAction` signature:** Added optional `_formData?: FormData` to the bound-form-action signature so TypeScript is satisfied when the action is bound and called from an HTML form element.
- **`useActionState` third return value `isPending`:** Used instead of `useFormStatus` per the React 19 pattern documented in the iteration notes. Submit buttons are disabled and show in-progress labels while pending.
- **`--color-error-bg`:** Used for top-level form error background (CSS variable exists in `globals.css`). The spec mentioned `--color-error-subtle` but only `--color-error-bg` is defined.
- **`ArticleEditor` loading state:** The `animate-pulse` skeleton renders when `MDEditor` evaluates to `undefined` (before the dynamic import resolves). In practice, `dynamic()` returns the component directly (not `undefined`) once resolved; the skeleton is a best-effort SSR fallback.

## Confirmation the app runs

`npm run build` completes successfully with all 8 routes. TypeScript (`tsc --noEmit`) reports zero errors. All four authoring flows (create, edit, delete, validation) are implemented per the iteration spec. The full content authoring cycle is feature-complete for the MVP.

## Decisions log

| Decision | Choice |
|---|---|
| Try/catch placement in actions | Wraps only Prisma call; `revalidatePath` + `redirect` are outside |
| Delete action FormData param | Added optional `_formData?` to satisfy TypeScript when used as form action |
| Slug preview — edit form | Only shows "URL will change to:" when title changed from original; shows current slug otherwise |
| Category `<select>` | "No category" as first option (value `""`); treated as `null` in the Server Action |
| `isPending` from `useActionState` | Used directly; no separate `useFormStatus` needed in React 19 |

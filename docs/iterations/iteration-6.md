# Iteration 6 — Editing: Server Actions, editor, concurrency, history

**Goal.** A user can create and edit any article in Markdown with a live preview, save it, and see the change persist across a full page reload — with client and server validation, optimistic-concurrency conflict handling, and view-only revision history.

**Scope.** The article and category Server Actions; the editor form and Markdown editor; the status, archive, history, and display-name components; the create and edit routes; and every write endpoint.

**Out of scope.** New read surfaces (iteration 5 completed those) and Playwright (iteration 7).

**Reference.** `architecture.md` §6.4, §7.3, §7.5, §8.7, §9.3, §9.4, §9.6, §10.2, §10.5; `design-spec.md` §3.5, §4.3, §4.5, §4.6, §5.5, §5.8, §7.4–§7.6.

---

## Tasks

### 6.1 Implement the article Server Actions

Create **`src/app/actions/articles.ts`** with `'use server'` as the first line, exporting `createArticle`, `updateArticle`, and `archiveArticle`, each with the signature `(prevState: ActionState, formData: FormData) => Promise<ActionState>` (compatible with `useActionState`) and returning the `ActionState` union defined in iteration 2.9.

Behaviour contract, exactly as `architecture.md` §7.5:

- Parse `FormData` → object; run the matching Zod schema from `src/lib/validation/article.ts`
- On validation failure return `{ status: 'error', fieldErrors }` — **never throw for user input**
- On success call the repository, then `revalidatePath('/')`, `revalidatePath('/search')`, `revalidatePath(\`/articles/${slug}\`)`, and `revalidatePath('/categories')`
- On `CONFLICT` return `{ status: 'error', message: 'This article was updated by someone else…', conflict: true }` so the form can render the conflict banner
- Read the editor name from the `kb_display_name` cookie, defaulting to `Anonymous editor`
- **Then `redirect(\`/articles/${slug}\`)` OUTSIDE any `try`/`catch`.** Next.js implements `redirect()` by throwing a control-flow signal; catching it silently breaks navigation
- Log one line per mutation at `info`: `{ event, articleId, slug, version, durationMs }`. **Never log article bodies** (§7.6)

Write **`src/app/actions/articles.test.ts`** (node project):

- A payload with a 2-character title returns `{ status: 'error', fieldErrors: { title: ['Title must be at least 3 characters.'] } }` and writes nothing
- A valid payload creates the article, writes revision 1, and returns `{ status: 'success', articleId, slug, version: 1 }`
- A valid payload with a **stale** `version` returns `{ status: 'error', conflict: true }` and leaves the row unchanged
- A hand-crafted `FormData` with an extra unexpected field does not bypass validation
- The action never logs `bodyMd` (assert on the captured log calls)

**Done when:** the tests pass, including the stale-version conflict case.

---

### 6.2 Implement the category Server Action and the display-name cookie

Create **`src/app/actions/categories.ts`** with `'use server'`, exporting `createCategory(prevState, formData)`. Validates with `categoryCreateSchema`, calls the category repository, returns `{ status: 'success' }` or `{ status: 'error', fieldErrors }`, and maps a duplicate name to a form-level error rather than a thrown exception. Revalidates `/` and `/categories`.

Create **`src/app/actions/display-name.ts`** (or add to `categories.ts`) exporting `setDisplayName(prevState, formData)`. Validates a 1–40 character name, writes the `kb_display_name` cookie with `httpOnly: false` (it is read by client components), `sameSite: 'lax'`, `maxAge: 31536000` (1 year), and `path: '/'`.

Write **`src/app/actions/categories.test.ts`**: a duplicate name returns a form-level error and creates no second row; a 61-character name returns a field error; a valid name creates the category and returns success.

**Done when:** the tests pass and a created category appears in the sidebar after the revalidation.

---

### 6.3 Build the Markdown editor and the article form

Create **`src/components/articles/markdown-editor.tsx`** (`'use client'`):

- Wraps `@uiw/react-md-editor` with `preview="live"`
- Loaded via `next/dynamic(..., { ssr: false })` from `article-form.tsx` so its ~120 KB never enters the browse route bundle (§9.3). While loading, render a 520px `Skeleton` with a centered `Loading editor…` label — **never a bare spinner**
- A **controlled** component wired into RHF through a small adapter, so the toolbar and the form share one source of truth
- A sticky toolbar with the 10 buttons from `design-spec.md` E4 (Bold, Italic, H2, H3, Link, Bulleted list, Numbered list, Inline code, Code block, Quote). Each is 32×32 with a 44px hit area, an `aria-label`, and a tooltip. Active state uses `--surface-sunken`. The toolbar scrolls horizontally rather than wrapping below 480px
- A one-line hint below the editor: `Markdown supported — the preview updates as you type.`
- **Preview parity is guaranteed by reusing the same `react-markdown` + `remark-gfm` + `rehype-sanitize` pipeline and `prose` classes as `ArticleBody`** (E5). The preview pane scrolls independently — **no scroll sync** (UX21)
- `Ctrl/⌘+B`, `Ctrl/⌘+I`, `Ctrl/⌘+K` operate on the selection; `Ctrl/⌘+Enter` saves

Create **`src/components/articles/article-form.tsx`** (`'use client'`) using the exact pattern from `architecture.md` §6.4: `useActionState` + `useForm` with `zodResolver(articleCreateSchema)` and `mode: 'onBlur'`, and `<form action={formAction} onSubmit={form.handleSubmit(...)} noValidate>` so the form still submits natively if JavaScript fails.

Field order is fixed (E1): **Title → Slug → Summary → Category/Status (2-up) → Body → Change note → Actions.**

- **Title** is `--text-2xl` semibold, larger than a normal input on purpose
- **Slug is read-only text**, not an input: `Slug: deploying-the-api` in 13px `--ink-subtle` with a `Regenerate from title` ghost button. Clicking opens a confirm dialog with copy `Changing the slug will break existing links to this article.` Regeneration is disabled for published articles unless confirmed (E2)
- **Summary** shows a live `{n} / 300` counter
- **Category** select includes an `Uncategorized` option mapping to `null`
- **Status** select offers **`Draft` and `Published` only** — `Archived` is never selectable in the editor; archive is an action, not a state you type (`design-spec.md` §4.5)
- **Body** renders the dynamic `MarkdownEditor`, with a character counter that appears at 190,000 (`--warning`) and turns `--danger` at 200,000, disabling Save with the hint `Article body is too large (200,000 character limit).`
- **Change note** appears **only on the edit route** (E3), placeholder `What changed? (optional)`, hint `Shown in history. Optional.`
- **Status pill** (E7, E8) cycles `Saved` → `Unsaved changes` → `Saving…` → `Saved` / `Save failed`, rendered as a `role="status" aria-live="polite"` live region
- **Save button** (E9) is disabled when invalid or in flight; label `Save article` (create) / `Save changes` (edit) / `Saving…` (pending)
- **`Save & create another`** is a secondary button on the **create** route only: saves, shows a success toast, and resets the form in place at `/articles/new` with the category retained (E10)
- **Validation** is `mode: 'onBlur'`, then re-validates on change once a field has errored — errors never appear while typing a field for the first time (E12)
- **Dirty guard** (E6): a `beforeunload` handler fires when dirty; in-app navigation away opens a confirm dialog with copy `Discard your unsaved changes?` / `Your edits to this article will be lost.` / `[Keep editing] [Discard]`
- **Form-level errors** render in a `role="alert"` banner above the actions. Validation failures use `Please fix the highlighted fields.` and move focus to the first invalid field; server/network failures use `We couldn't save your changes. Your text is still here.` with a `Try again` action
- **On create, the form starts empty** — title empty, body empty, status `Draft`, category `Uncategorized`. **No pre-filled placeholder body**

Write **`src/components/articles/article-form.test.tsx`** (jsdom) with exactly the three cases from `architecture.md` §11.3:

- Submitting an empty title renders `Title must be at least 3 characters.` and moves focus to the title input
- A 301-character summary renders the summary error
- A valid submit calls the action **once** with the expected `FormData`

Add: the status select does not offer `Archived`; the change-note field is absent on the create route and present on the edit route; the character counter appears at 190,000.

**Done when:** the tests pass, the editor bundle is absent from the browse route's first-load JS, and the create form has no placeholder body text.

---

### 6.4 Implement the conflict banner

Add the conflict banner to **`article-form.tsx`**, rendered when the action returns `conflict: true`. Use the exact markup from `design-spec.md` §5.5:

- `role="alert" tabIndex={-1}` with a ref, and **`focusRef.current?.focus()` on mount** so a screen-reader user is told immediately
- `rounded-card border border-warning/40 bg-warning-soft p-4`, `AlertTriangle` 20px `--warning` `aria-hidden`
- Title `This article was updated by someone else.`; body `Reload the latest version to see their changes, or copy your text first so nothing is lost.`
- **`Copy my text` is placed before any destructive path and is never hidden.** It writes `title + "\n\n" + summary + "\n\n" + bodyMd` to the clipboard and swaps its label to `Copied` for 2 s with a `role="status"` announcement
- `Reload latest version` opens a confirm dialog: `Discard your unsaved edits?` / `Copy them first if you want to keep them.` / `[Keep editing] [Discard and reload]`

Write **`src/components/articles/conflict-banner.test.tsx`** (jsdom):

- The banner renders and receives focus when it appears
- `Copy my text` writes the concatenated title/summary/body to the clipboard mock
- The label changes to `Copied` and reverts after 2 s
- `Reload latest version` opens the confirm dialog rather than discarding immediately

**Done when:** the tests pass and a simulated 409 renders the banner with focus applied.

---

### 6.5 Build the status, archive, and history components

Create `src/components/articles/`:

- **`status-badge.tsx`** — verify the iteration 4.3 implementation still renders only for `draft` and `archived`.
- **`delete-article-button.tsx`** — `'use client'`. **Keep the filename; the component and all copy say Archive** (`design-spec.md` §10.1 naming note). Renders the `⋯` ghost icon button (`aria-label="More actions"`) containing one item: `Archive article` in `--danger`. Opens a Radix confirm dialog with the exact copy: title `Archive “{title}”?`, body `It will be hidden from browse and search. The article and its history are kept, and it stays reachable by direct link.`, actions `[Cancel] [Archive article]`. On success, navigate to `/` and show the toast `Article archived.` with an `Undo` action that calls `archiveArticle` with `status: 'published'` within 5 s (UX11).
  - **The word "delete" must not appear anywhere in the UI** (`design-spec.md` §10.6 rule 7).
- **`revision-list.tsx`** — RSC for the list, client `Dialog` for the viewer. Renders the collapsed-by-default section with summary `History ({n} revisions)`. Expanding lists the **5 most recent** as `#12 · Jason · 2 days ago · "Clarified the rollback steps"` with a `View` button opening a Radix dialog showing that revision's Markdown rendered read-only via `ArticleBody`. **View-only — no restore** (`architecture.md` §16.2). Empty state: `No revisions yet.`
- **`toast.tsx`** in `src/components/ui/` — `'use client'`. Bottom-right, `max-w-sm`, `--surface`, 1px `--border`, `--shadow-overlay`, `rounded-card`, 12px padding. Slide-up 180 ms. Auto-dismiss 4 s for success, 8 s for errors, **never for errors that require action** (those get a banner). `role="status"` for success, `role="alert"` for errors. Close button `aria-label="Dismiss"`. Only the toasts in `design-spec.md` §5.8 exist: `Article created.`, `Article saved.`, `Article published.`, `Article archived.`, `Category created.`, `Display name saved.` plus their error counterparts.

Update **`src/app/articles/[slug]/page.tsx`** to replace the iteration 4 placeholder history section with the real `RevisionList`, and to render `ArchiveArticleButton` inside `ArticleHeader`'s overflow menu.

**Done when:** an archived article is hidden from default browse and search but still renders at its URL with an `Archived` badge and banner; the Undo toast restores it within 5 s; history shows the 5 most recent revisions with a working view dialog.

---

### 6.6 Build the create and edit routes

Create **`src/app/articles/new/page.tsx`** — the focused shell (no sidebar, no TOC, no search input — `design-spec.md` §2.2 and UX6). Renders the document status strip: `← Cancel`, `New article`, the status pill, and `[Save]`. Passes the category list as options; if `?category={slug}` is present, pre-select it. `Cancel` returns to `/`.

Create **`src/app/articles/[slug]/edit/page.tsx`** — same focused shell with `Edit article`, the `version` as a hidden field, and the change-note field present. `Cancel` returns to the article detail.

Create **`src/app/articles/new/loading.tsx`** and **`src/app/articles/[slug]/edit/loading.tsx`** — the 520px editor skeleton with `Loading editor…`.

Add the `<details>`-style mobile behavior: below 768px the editor uses a `[Write | Preview]` segmented control over a single pane and a sticky bottom action bar containing `Cancel` and `Save article`.

> **The editor drops the shell chrome deliberately** (UX6): writing is a focused task, and removing the sidebar removes the largest source of "I'll just check that other article first".

**Done when:** creating an article redirects to its detail page with the `Article created.` toast; editing redirects with `Article saved.`; a `draft → published` transition shows `Article published.`; reloading the page shows the persisted change; the editor has no sidebar or TOC.

---

### 6.7 Add the display-name affordance

Create **`src/components/layout/editing-as-chip.tsx`** (`'use client'`):

- Sidebar footer chip: `Editing as [ {name} ▾ ]`
- Clicking opens a Radix dialog with one field: `Display name` (1–40 chars, required), body copy `Your name appears in an article's history when you save. It is not a login.`, and a `Save name` action
- Saving writes the `kb_display_name` cookie (1 year, `SameSite=Lax`) and shows the `Display name saved.` toast
- Default when unset: `Anonymous editor`, rendered in `--ink-subtle` with a subtle `--warning` dot to signal "you should set this"
- **This is not authentication and must never be described as such in the UI** (`design-spec.md` U4)

Mount it in both `sidebar.tsx` and `mobile-nav.tsx`.

**Done when:** setting a display name makes the next revision record that name, and the history list shows it.

---

### 6.8 Complete the write API

Add the remaining route handlers under `src/app/api/`:

| Route | Method | Contract |
|---|---|---|
| `api/articles/route.ts` | `POST` | Validates with `articleCreateSchema`. `201 Created` + `Location: /api/articles/{id}` returning `{ id, slug, version, status, createdAt }`. `422` returns the exact `errors: [{ path, message }]` shape from §7.3. |
| `api/articles/[idOrSlug]/route.ts` | `PATCH` | Requires `version` in the body. `200` returns `{ id, slug, version, updatedAt }`. `409` returns the conflict problem+json with `errors: [{ path: 'version', message: 'Expected version 4, found 5.' }]`. |
| `api/articles/[idOrSlug]/route.ts` | `DELETE` | Soft-archives (`status = 'archived'`, stamps `archived_at`), retains revisions. `204 No Content`. **Hard delete is not exposed in v1.** |
| `api/categories/route.ts` | `POST` | Body `{ name, description? }` → `201` `{ id, slug, name }`. Duplicate name (case-insensitive) → `409`. |
| `api/test/reset/route.ts` | `POST` | **Guarded:** if `process.env.E2E_TEST_MODE !== '1'`, return `404` with no body. When enabled, delete all rows from `articles`, `categories`, `article_revisions`, rebuild the FTS index, and re-insert the fixture set from `e2e/fixtures/seed.json`. Returns `{ reset: true, articles: 9, categories: 4 }`. |

Every mutation route handler must call `assertSameOrigin(request)` and require a JSON content type — Server Actions get CSRF protection from Next.js automatically, but route-handler mutations do not (`architecture.md` §13.2).

Create **`e2e/fixtures/seed.json`** now — 4 categories and 9 articles with fixed titles, slugs, and statuses (7 published, 2 draft), matching the seed content from iteration 1.7. Iteration 7 consumes it.

Write **`src/app/api/test/reset/route.test.ts`**:

- With `E2E_TEST_MODE` unset, `POST` returns `404` with an empty body
- With `E2E_TEST_MODE=1`, `POST` returns `{ reset: true, articles: 9, categories: 4 }` and the FTS index is rebuilt (a subsequent search finds the fixture articles)

Write **`src/app/api/articles/route.test.ts`** (writes): a `PATCH` with a stale version returns `409`; a `DELETE` returns `204` and sets `status = 'archived'` while retaining revisions; a `POST` with an invalid body returns `422` with the documented `errors` array.

**Done when:** the tests pass, the reset endpoint is invisible without `E2E_TEST_MODE=1`, and `curl -X DELETE` archives rather than deletes.

---

## Iteration notes

**Sequencing.** 6.1 and 6.2 are independent. 6.3 depends on 6.1 (the form imports the action and `ActionState`). 6.4 is part of 6.3's completion. 6.5 depends on 6.1 (archive) and iteration 3.5 (revisions). 6.6 depends on 6.3–6.5. 6.7 is independent after 6.1 (the cookie is read by the action). 6.8 depends on 6.1–6.2 and on the fixture file.

**`redirect()` outside `try`/`catch`.** This is the single most common way to silently break a Next.js Server Action. `redirect()` throws a control-flow signal; a `catch` around the repository call that also wraps the redirect will swallow it and the user will see nothing happen.

**Autosave is deliberately not implemented** (E6, UX7). Every save is an explicit, version-checked write that creates a revision. Autosave would generate revision noise and race the optimistic-concurrency check.

**No `dangerouslySetInnerHTML` anywhere.** The editor preview and `ArticleBody` both use `react-markdown` without `rehype-raw` (D6). The conflict banner and the preview must not introduce an exception.

**Not in this iteration.** No Playwright specs, no CI changes. The fixture JSON is created here because the reset endpoint consumes it; the specs that use it are iteration 7.

---

## Definition of done

- [ ] Creating an article redirects to its detail page and the article persists across a full reload.
- [ ] Editing an article increments `version`, writes exactly one revision, and persists across a full reload.
- [ ] Client validation and server validation both reject the same payloads with the same messages.
- [ ] A stale-version save renders the conflict banner with focus applied, and `Copy my text` copies the user's content.
- [ ] The status select offers only `Draft` and `Published`.
- [ ] Archiving is a soft status change with a 5-second Undo; the word "delete" appears nowhere in the UI.
- [ ] History shows the 5 most recent revisions, collapsed by default, view-only.
- [ ] The editor renders in the focused shell with no sidebar, TOC, or search input.
- [ ] The editor bundle is not in the browse route's first-load JS (`next/dynamic` + `ssr: false`).
- [ ] The display-name cookie changes the `editorName` recorded on new revisions.
- [ ] `POST /api/test/reset` returns 404 without `E2E_TEST_MODE=1`.
- [ ] `npm run verify` exits 0.

| Module | Test file |
|---|---|
| `src/app/actions/articles.ts` | `src/app/actions/articles.test.ts` |
| `src/app/actions/categories.ts` | `src/app/actions/categories.test.ts` |
| `src/components/articles/article-form.tsx` | `src/components/articles/article-form.test.tsx` |
| conflict banner (in `article-form.tsx`) | `src/components/articles/conflict-banner.test.tsx` |
| `src/app/api/test/reset/route.ts` | `src/app/api/test/reset/route.test.ts` |
| `src/app/api/articles/route.ts` | `src/app/api/articles/route.test.ts` |

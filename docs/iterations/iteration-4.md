# Iteration 4: Editing (MVP Feature 3)

**Goal:** Build the Markdown editing experience — a split-pane editor with live preview, create and edit article forms, and server-side mutation logic. After this iteration, users can create, edit, and delete articles.

**Scope:** MVP Feature 3 — basic editing for all articles. This iteration delivers the full editing workflow: create → view → edit → save → delete.

---

## Task 4.1: Build MarkdownEditor Component

**File:** `src/components/ui/markdown-editor.tsx`

Client Component (`'use client'`). Props: `initialContent?: string`, `onChange: (content: string) => void`, `error?: string`, `value: string` (controlled component — parent owns the state).

### Desktop Layout (≥768px)
- Split pane: flex row, `min-h-[400px]`, grow to fill available space
- Left pane (50%): `<textarea>` for raw Markdown
  - Monospace font: `font-mono text-sm leading-relaxed`
  - Background: `bg-neutral-50`, padding: `p-4`, no border (container handles border)
  - Resize: vertical only (`resize-y`)
  - Tab key inserts 2 spaces (do NOT move focus) — use `onKeyDown` handler:
    ```typescript
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
        });
      }
    };
    ```
  - `aria-label="Markdown editor"`
- Right pane (50%): live preview
  - Wrapped in `prose prose-neutral lg:prose-lg max-w-none`
  - `p-4`, `bg-white`, `overflow-y-auto`
  - Renders `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with `value` as children
  - Links: `target="_blank" rel="noopener noreferrer"` via custom link component
- Divider between panes: `border-r border-neutral-200`
- Error state: container border turns red when `error` prop is set

### Mobile Layout (<768px)
- Single pane with "Write" / "Preview" tab toggle above
- Tabs: two adjacent buttons (segmented control)
  - Active: `bg-neutral-900 text-white`
  - Inactive: `bg-white text-neutral-600 border border-neutral-300`
  - Full-width, equally sized
- Textarea minimum height: 300px
- Preview renders full-width when "Preview" tab is active

### Mobile Tab State
- Internal state: `activeTab: 'write' | 'preview'`, defaults to `'write'`
- Desktop (≥768px): tabs hidden, both panes visible
- Use `useState` + a media query or `matchMedia` to detect mobile

**What to verify:**
- Typing in textarea updates the live preview in real-time
- Markdown renders correctly: headings, bold, italic, lists, code blocks, tables, blockquotes, links
- Tab key inserts 2 spaces at cursor position
- Mobile: tabs toggle between Write and Preview views
- Error state shows red border
- Textarea is resizable vertically
- Both panes scroll independently on desktop

---

## Task 4.2: Create Server Actions

**File:** `src/lib/actions.ts`

Server-side functions using `'use server'` directive. These handle all mutation logic.

### `createArticle(formData: FormData)`
1. Extract fields from FormData: `title`, `content`, `categoryId` (optional), `status`
2. Parse with `articleCreateSchema` (Zod)
3. Generate slug from title via `generateSlug()`
4. Generate excerpt from content via `stripMarkdown()` (or let Prisma handle it)
5. Create article via `prisma.article.create()`
6. `revalidatePath('/')` to update the article list cache
7. Return the created article (for redirect)
8. On error: throw (caught by form's error handling)

### `updateArticle(id: number, formData: FormData)`
1. Extract fields from FormData
2. Parse with `articleUpdateSchema`
3. If title changed: regenerate slug via `generateSlug()`
4. If content changed: regenerate excerpt
5. Update article via `prisma.article.update()`
6. `revalidatePath('/')` and `revalidatePath('/articles/[slug]')`
7. Return the updated article
8. On error: throw

### `deleteArticle(id: number)`
1. Delete article via `prisma.article.delete()`
2. `revalidatePath('/')`
3. Return success
4. On error: throw

**What to verify:** Each Server Action creates/updates/deletes correctly. Revalidation clears the cache. Errors are thrown with descriptive messages. Category association works. Slug updates when title changes.

---

## Task 4.3: Build StatusToggle Component

**File:** `src/components/ui/status-toggle.tsx`

Client Component. Props: `value: 'draft' | 'published'`, `onChange: (value: 'draft' | 'published') => void`, `disabled?: boolean`

- Renders as a radio group (two adjacent buttons):
  - "● Draft" — dot is amber (`text-amber-500`)
  - "● Published" — dot is green (`text-green-500`)
- Active option: `bg-neutral-900 text-white`
- Inactive option: `bg-white text-neutral-600 border border-neutral-300`
- Hover (inactive): `bg-neutral-50`
- Focus: `ring-2 ring-accent-500 ring-offset-2` (shared focus ring on the group container)
- Implementation: hidden radio inputs with visible labels styled as buttons
  - Use `<input type="radio">` with `sr-only` + styled `<label>` for accessibility
  - `role="radiogroup"` on container, `aria-label="Article status"`
- Disabled: `opacity-50 cursor-not-allowed`

**What to verify:** Clicking Draft/Published toggles the selection. Only one is active at a time. Keyboard accessible (arrow keys navigate radio group). Disabled state works. Dots are colored correctly.

---

## Task 4.4: Build ArticleForm Component

**File:** `src/components/articles/article-form.tsx`

Client Component (`'use client'`). Props: `mode: 'create' | 'edit'`, `initialData?: Article`, `categories: Category[]`

### Layout
- Single column, max-width 860px
- Title field at top (Input component, full width)
  - Label: "Title"
  - Required: true
  - Max length: 200 chars
  - Character counter appears when within 20% of limit: `{current}/{max}` shown below input
- Category and Status on one row (flex, gap-4, wrap on mobile)
  - Category: `<select>` styled to match Input. Options: "No category" (value="") + all categories (value={id})
  - Status: `<StatusToggle>` component
- Slug display (edit mode only): read-only text, `text-sm text-neutral-500`, "Slug: {slug}"
- MarkdownEditor below, filling remaining vertical space
- Button row at bottom: flex, gap-3, justify-end
  - Create mode: "Cancel" (secondary, navigates back), "Save as Draft" (secondary, submits with status="draft"), "Publish" (primary, submits with status="published")
  - Edit mode: "Cancel" (secondary), "Delete..." (danger, left-aligned), "Save" (primary)

### Form State & Validation
- Controlled form state via `useState`: `{ title, content, categoryId, status }`
- Client-side validation on submit:
  - Title required: "Title is required"
  - Title max 200: "Title must be 200 characters or fewer"
  - Content required: "Content cannot be empty"
  - Display inline errors below each field
- Server-side validation errors: displayed as a banner above the form
  - `bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md`
  - "Something went wrong. Please try again."
- Submit flow:
  1. Validate client-side
  2. If valid: set `isSubmitting = true`, disable all inputs
  3. Call Server Action (via form `action` prop or direct call)
  4. On success: `router.push('/articles/' + result.slug)`
  5. On error: set `serverError`, re-enable form

### Create Mode Specific
- Default status: `"draft"`
- "Save as Draft" and "Publish" buttons both call `createArticle` with the respective status
- Cancel navigates back (`router.back()`) or to `/` if no history

### Edit Mode Specific
- Pre-fill all fields from `initialData`
- Show slug (read-only) below title
- Single "Save" button calls `updateArticle` — status is determined by the toggle value
- Delete flow:
  1. Click "Delete..." → `window.confirm("Delete this article? This cannot be undone.")`
  2. On confirm: call `deleteArticle`, `router.push('/?deleted=1')`
  3. On cancel: do nothing

### Accessibility
- Form has `aria-label={mode === 'create' ? 'Create article' : 'Edit article'}`
- Errored fields use `aria-describedby` pointing to error message element
- Error banner uses `role="alert"`
- Loading state: `aria-busy="true"` on form, buttons show Loader2 spinner

**What to verify:**
- Create form: fills in all fields, both "Save as Draft" and "Publish" work
- Edit form: pre-fills with existing data, save updates correctly
- Validation errors appear inline, prevent submission
- Character counter appears near limit
- Delete confirmation dialog works, article is removed
- Server error banner appears on failure
- Loading state disables form during submission
- Redirect works correctly after create/edit/delete

---

## Task 4.5: Build Create Article Page

**File:** `src/app/articles/new/page.tsx`

Client Component. Implementation:

- Fetch categories via Prisma (in a parent Server Component or via a small wrapper) — or call `GET /api/categories` on mount
- Render: back link "← Back" at top, then `<ArticleForm mode="create" categories={categories} />`
- The form handles all logic internally

**What to verify:** Navigate to `/articles/new` — form renders with empty fields. Create a draft article — redirects to detail. Create a published article — appears on home page. Cancel navigates back.

---

## Task 4.6: Build Edit Article Page

**File:** `src/app/articles/[slug]/edit/page.tsx`

Server Component wrapper + Client Component for the form.

- Server Component: fetch article by slug (include category relation)
  - If not found: `notFound()`
  - Fetch all categories
  - Pass `initialData` and `categories` to the Client Component
- Client Component: renders `<ArticleForm mode="edit" initialData={article} categories={categories} />`
- Back link: "← Back to article" linking to `/articles/[slug]`

**What to verify:** Navigate to `/articles/getting-started/edit` — form pre-filled. Change title, save — redirects to new slug. Change content, save — new content renders. Delete article — redirects to home, article gone from list.

---

## Task 4.7: Create REST API Routes

**Files:** `src/app/api/articles/route.ts`, `src/app/api/articles/[id]/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/search/route.ts`

Server Components use Prisma directly, but API routes are needed for:
- Programmatic access (future integrations)
- E2E test setup (seeding test data)
- External consumers

### GET /api/articles
- Query params: `q`, `category`, `status`, `page`, `limit`
- Default status filter: `published` (don't expose drafts via API by default)
- Returns `{ articles, total, page, totalPages }`
- Validation: Zod schema for query params

### POST /api/articles
- Body validated with `articleCreateSchema`
- Returns `201` with created article
- `400` on validation error
- `500` on server error

### GET /api/articles/[id]
- Returns `200` with article
- `404` if not found

### PUT /api/articles/[id]
- Body validated with `articleUpdateSchema`
- Returns `200` with updated article
- `404` if not found
- `400` on validation error

### DELETE /api/articles/[id]
- Returns `204 No Content`
- `404` if not found

### GET /api/categories
- Returns `{ categories }` with article counts
- No pagination needed (small dataset)

### GET /api/search
- Query params: `q` (required), `page`, `limit`
- Delegates to `searchArticles()` from `src/lib/search.ts`
- Returns same shape as GET /api/articles

All routes: wrap handlers in try/catch, return proper HTTP status codes, use Zod for validation, never expose internal errors in production.

**What to verify:** Each endpoint returns correct JSON. Validation errors return 400 with error details. Not found returns 404. Search returns ranked results. Categories include article counts.

---

## Iteration 4 Completion Checklist

- [ ] MarkdownEditor renders split-pane on desktop, tabbed on mobile
- [ ] Tab key inserts 2 spaces in textarea
- [ ] Live preview updates in real-time
- [ ] Server Actions create, update, and delete articles correctly
- [ ] Revalidation works: home page updates after mutations
- [ ] StatusToggle renders and keyboard-navigates correctly
- [ ] ArticleForm validates client-side, shows errors, handles server errors
- [ ] Create page: form works, draft and publish actions work, cancel works
- [ ] Edit page: pre-filled, save works, slug updates on title change
- [ ] Delete flow: confirm dialog → redirect to home → article gone
- [ ] All API routes return correct status codes and JSON
- [ ] Create → view → edit → save → view → delete lifecycle works end-to-end
# Iteration 4 Summary — Editor

## What Was Built

Iteration 4 enabled article creation and editing with a Markdown editor featuring live preview, form validation, save/discard flows, and toast notifications.

### 1. Toast System (`components/ui/ToastContainer.tsx`)
- Wraps the `sonner` library (`Toaster` component, already installed in Iteration 1 dependencies)
- Positioned bottom-right with 2-second auto-dismiss duration
- Renders at the root layout level to be available across the entire app
- Marked as `'use client'` since `sonner` requires client-side rendering

### 2. ConfirmationModal (`components/ui/ConfirmationModal.tsx`)
- Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`
- Semi-transparent overlay (`z-[var(--z-modal)]`) with centered dialog content
- Focus trap within modal (Tab/Shift+Tab cycling)
- `Escape` key dismisses the modal
- `role="dialog"` and `aria-modal="true"` for accessibility
- Auto-focuses the cancel button on mount

### 3. MarkdownTextarea (`components/article/MarkdownTextarea.tsx`)
- Custom textarea wrapper with Tab key interception (inserts 2 spaces instead of cycling)
- Auto-expand height behavior (tracks content changes)
- Monospace font, 15px, line-height 1.8
- Minimum 300px height with vertical resize allowed
- Forwarded ref support for external access

### 4. ArticleEditor (`components/article/ArticleEditor.tsx`)
- **Desktop layout (≥1024px)**: Split-pane grid — left column has title input + editor textarea, right column has live preview
- **Mobile layout (<1024px)**: Tabbed interface — `✏️ Write` | `👁️ Preview` tabs, full-width title input at top
- **State management**: React `useState` for title/content, tracks modification state
- **Live preview**: Renders Markdown → HTML via `renderMarkdown` + `sanitizeHtml` in real-time as user types
- **Empty preview**: Shows "Preview will appear as you write..." when content is empty
- **Save flow**: 
  - Client-side validation (title/content required) shows inline errors before server call
  - Calls server action (`createArticle` or `updateArticle`) with FormData
  - On success: success toast ("Article saved.") + redirect to detail view
  - On validation error: inline errors + error toast
  - On network error: error toast ("Failed to save. Please try again."), content preserved
- **Keyboard shortcuts**: `⌘S` / `Ctrl+S` triggers save
- **Unsaved changes warning**: `beforeunload` event listener warns if user tries to navigate away
- **Discard flow**: If has changes → shows `ConfirmationModal` with "Discard or stay here?". If no changes, navigates directly
- **Props**: `title?`, `content?`, `isEdit: boolean`, `articleId?`
- **Form errors**: `FormErrors` state with `title` and `content` fields. Errors clear automatically when user starts editing the field again

### 5. Server Actions (`src/actions/articles.ts`)
- **`createArticle(formData: FormData)`**: 
  - Validates input with `createArticleSchema`
  - Inserts into `articles` table with `id` (UUID), `status: 'published'`, timestamps
  - Returns `{ success: true, article: { id } }` or `{ success: false, errors: ActionError[] }`
  - Catches database errors and returns generic failure message
- **`updateArticle(id: string, formData: FormData)`**:
  - Validates input with `updateArticleSchema`
  - Updates existing article, sets `updated_at`
  - Returns `{ success: true, article: { id } }` or 404 if article not found
  - Returns errors on validation or database failures
- Marked with `'use server'` directive to keep all DB logic on the server

### 6. Create Article Route (`app/(public)/articles/new/page.tsx`)
- Static server component that renders `<ArticleEditor isEdit={false} />`
- Generates route as `○ /articles/new` (statically prerendered)

### 7. Edit Article Route (`app/(public)/articles/[id]/edit/page.tsx`)
- Server component that fetches article by ID
- Returns `notFound()` if article doesn't exist (renders the existing 404 page)
- Renders `<ArticleEditor isEdit={true} articleId={id} />` populated with existing title and content
- Generates route as `ƒ /articles/[id]/edit` (dynamic, per-article)

### 8. Navigation Linking
- **"+ New" button in header**: Updated from a dead `<Button>` to a styled `<Link>` pointing to `/articles/new`
- **"Edit" button in ArticleDetail**: Was already linking to `/articles/[id]/edit` from Iteration 2

### 9. Root Layout Integration
- `ToastContainer` added to `app/layout.tsx` wrapped in the `<body>` so toasts are available globally

### 10. Pre-existing Issues Fixed
- **Search route Zod v4 API**: Changed `.errors` to `.issues` in `app/api/search/route.ts` (Zod v4 renamed the property)
- **Button forwardRef**: Wrapped `Button.tsx` in `forwardRef` to support ref forwarding required by `ConfirmationModal`

## Package Scripts Added
No new package scripts added.

## Storage Format
Content is stored as raw Markdown in SQLite (as planned in the iteration spec). HTML rendering happens at display time via `markdown-it` → DOMPurify.

## Assumptions & Issues

1. **Status defaults to `published`**: New articles are created with `status: 'published'` to match the v1 simplification decision in the iteration spec. Draft/published toggle is deferred to post-MVP.
2. **Category assignment deferred**: Title input has a placeholder comment ("metadata placeholder — v2") for category selector. Actual category assignment functionality is reserved for v2.
3. **`sonner` for toast system**: The iteration spec mentioned creating custom `Toast`/`ToastContainer` components. `sonner` was already listed as a dependency in `package.json`, so it was used directly instead of building a custom implementation.
4. **`next lint` no longer works in Next.js 16**: The built-in `next lint` command was removed in Next.js 15/16. TypeScript checking is validated through `npm run build` which runs the TypeScript compiler and catches all type errors.
5. **Content is stored as raw Markdown**: The edit page pre-fills the textarea with the raw Markdown string (not HTML). This avoids the complexity of HTML → Markdown conversion on edit.

## Confirmation

- ✅ `npm run build` passes — compiled successfully, TypeScript checked without errors
- ✅ `GET /articles/new` returns 200 with rendered editor (title input, textarea, preview)
- ✅ `GET /articles/[id]/edit` returns 200 with pre-filled editor content
- ✅ `GET /api/articles` returns 7 articles confirming database is healthy
- ✅ Dev server starts successfully on `http://localhost:3000`
- ✅ Static analysis shows `/articles/new` (static), `/articles/[id]/edit` (dynamic) routes registered

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Server Actions with `'use server'` directive** | Rather than REST API routes or separate service functions called from the client, `'use server'` actions keep all DB operations server-side. The directive ensures `better-sqlite3` never leaks into the client bundle. |
| 2 | **`sonner` over custom Toast implementation** | The iteration spec suggested building custom `Toast`/`ToastContainer` components, but `sonner` was already in `package.json` with `^2.0.7`. Using `sonner` provides a tested, accessible toast system with no extra dependencies. |
| 3 | **Title input as bare `<input>` not textarea** | For a large text field with ~24px feel, a styled `<input>` works better for single-line editing. No multi-line title was specified in the design spec. |
| 4 | **Sticky bottom action bar on mobile** | Iteration spec called for a "sticky bottom action bar" — implemented with `position: sticky` on the actions container so Discard/Save remain visible on scroll. |
| 5 | **FormData for server action input** | Server actions receive `FormData` objects (from form submissions) rather than plain TypeScript objects. This keeps the action signature consistent with HTML form conventions and avoids client-side serialization of complex objects. Zod validation runs server-side on the extracted values. |

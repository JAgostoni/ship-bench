# Iteration 4 — Editor

## Goal

Enable article creation and editing with a Markdown editor featuring live preview, Zod-validated form submission, and proper save/discard flows with toast notifications. By the end, a user can write, save, and edit articles.

---

## Tasks

### 4.1 Markdown Parser Library

Add the Markdown-to-HTML rendering library used for both the editor preview and the article detail view.

**Steps:**
1. Install `markdown-it`: `npm install markdown-it` and `npm install -D @types/markdown-it`
2. Create `src/lib/markdown.ts`:
   - Configure `markdown-it` with sensible defaults:
     - Enabled: headings, lists, links, code blocks, blockquotes, tables, horizontal rules
     - Syntax highlighting for code blocks (via `highlight.js` or simple CSS, optional)
   - Export a `renderMarkdown(md: string): string` function that returns sanitized HTML
3. Install `DOMPurify` for sanitizing rendered HTML: `npm install dompurify` and `npm install -D @types/dompurify`
   - Create `src/lib/sanitize.ts`: wrap `DOMPurify.sanitize()` with article-safe config (allow common markdown HTML elements)
4. **Update the ArticleDetail component** (from Iteration 2):
   - If the content is Markdown, render it through `renderMarkdown` → sanitize → display inside `.kb-prose`
   - This unifies the read path with the write path

### 4.2 Create Article Route

Build the new article creation page.

**Steps:**
1. Create `app/(public)/articles/new/page.tsx`:
   - Renders the `<ArticleEditor>` component in create mode
   - Links from the "+ New" button in the header
2. Create `src/lib/validation.ts` (if not already created):
   - `createArticleSchema`: `z.object({ title: z.string().min(1, 'Title is required.'), content: z.string().min(1, 'Article content is required.') })`
   - `CreateArticleInput` type inference from the schema

### 4.3 Article Editor Component

Build the Markdown editor with live preview.

**Steps:**
1. **ArticleEditor** — `components/article/ArticleEditor.tsx`:
   - Props: `title?` (string), `content?` (string), `isEdit: boolean`, `onSave`, `onDiscard`, `state: 'draft' | 'saving' | 'saved'`
   
   **Desktop layout (≥1024px) — Split-pane:**
   - Left column (400px max):
     - Title input: large text field (~24px feel), `aria-label="Article title"`, `aria-required="true"`
     - Below title: metadata placeholder (category selector, status toggle — v2)
   - Middle column (flex):
     - Markdown textarea: monospace font, 15px, line-height 1.8
     - Tab key inserts 2 spaces (not tab-cycling — use `onKeyDown` to intercept `Tab`)
     - Minimum 300px height, auto-expand
     - `aria-label="Article content"`
   - Right column (flex):
     - Live preview pane styled identically to article detail (reuses `.kb-prose` class)
     - Renders Markdown → HTML in real-time as user types
   - Bottom row: **Discard** (tertiary, right-aligned) and **Save** (primary, right-aligned)
   
   **Mobile layout (<1024px) — Tabbed:**
   - Full-width title input at top
   - Two tabs: `✏️ Write` | `👁️ Preview`
   - Active tab shows editor OR preview
   - Sticky bottom action bar: Discard | Save

2. **Editor state management**:
   - Use React `useState` for title/content
   - Track whether content has been modified (for unsaved changes confirmation)
3. Create `components/article/MarkdownTextarea.tsx` (or use plain `<textarea>` with custom Tab handling):
   - Handle Tab key insertion of 2 spaces
   - Auto-expand height

### 4.4 Edit Article Route

Build the edit variant of the editor that loads existing article data.

**Steps:**
1. Create `app/(public)/articles/[id]/edit/page.tsx`:
   - Fetch article by ID (same logic as `ArticleDetail` but returns editable data)
   - If not found: render empty state
   - If found: render `<ArticleEditor>` in edit mode, pre-filled with the article's title and Markdown content
   - If content is stored as HTML, display as-is in the editor textarea (or convert back to Markdown if the editor expects Markdown input — simpler path: store as Markdown directly, skip HTML→Markdown conversion)
2. **Storage decision**:
   - Store article content as **raw Markdown** in the database (not HTML)
   - Render Markdown → HTML only at display time (ArticleDetail view)
   - This simplifies round-trips and avoids HTML → Markdown conversion on edit

### 4.5 Server Action for Create & Update

Implement Server Actions for creating and updating articles, wired to Zod validation.

**Steps:**
1. Create Server Actions at `src/actions/articles.ts`:
   - `async function createArticle(data: CreateArticleInput)`:
     - Parse & validate input with Zod schema
     - If valid: insert into `articles` table using Drizzle ORM
     - Generate UUID for id (`crypto.randomUUID()`)
     - Set timestamps (`new Date().toISOString()`)
     - Set default `status: 'draft'` for new articles (or `'published'` for simplicity in v1)
     - Return `{ success: true, article }`
     - On validation error: return `{ success: false, errors: [{ field, message }] }`
   - `async function updateArticle(id: string, data: UpdateArticleInput)`:
     - Parse & validate input
     - Update existing article, set `updated_at`
     - Return `{ success: true, article }` on success
     - Return `{ success: false, errors: [...] }` on validation or 404
2. Wire Server Actions to the ArticleEditor `onSave` callback:
   - On successful save: call `revalidatePath('/')`, redirect to `/articles/[id]` (detail view), show success toast: "Article saved." (auto-dismiss 2s)
   - On validation error: display inline errors below relevant inputs, show error toast
   - On network error: show toast "Failed to save. Please try again." with [Retry] — preserve editor content

### 4.6 Validation, Unsaved Changes & Discard Flows

Implement form validation display, unsaved changes confirmation, and discard handling.

**Steps:**
1. **Inline validation**:
   - If title is empty on save: red text "Title is required." below title, input border turns `--color-error`, focus title input
   - If content is empty on save: red text "Article content is required." below editor, border turns `--color-error`
   - Use React `useState` or a lightweight form library (React Hook Form + `@hookform/resolvers/zod`)
2. **Unsaved changes on navigation**:
   - If user tries to leave the editor page (browser close, back button): show `window.beforeunload` confirmation
   - If user clicks "Discard": show a confirmation modal:
     - "You have unsaved changes. Discard or stay here?" with [Stay] and [Discard] options
     - Use `role="dialog"`, `aria-modal="true"`
     - Focus trap within modal, `Escape` to dismiss
   - **ConfirmationModal** — `components/ui/ConfirmationModal.tsx`:
     - Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`
3. **Discard behavior**:
   - From create view: discard navigates back to browse view (`/`)
   - From edit view: discard navigates back to article detail (`/articles/[id]`)
   - In both cases, discard closes modal without saving, content lost

### 4.7 Link Editor UI to Navigation

Wire up all navigation links so the create/edit flows are reachable and properly redirect after save.

**Steps:**
1. Update the "+ New" button in the header to link to `/articles/new`
2. Update the "Edit" button on the article detail view to link to `/articles/[id]/edit`
3. On save success: redirect to `/articles/[id]` (detail view of the created/updated article)
4. On discard:
   - From create: redirect to `/`
   - From edit: redirect to `/articles/[id]`

---

## Iteration Notes

- **Dependency**: Requires Iteration 1 (DB, validation layer, UI components) and Iteration 2 (ArticleDetail for redirect target). Does NOT require Iteration 3 (search).
- **Storage format decision**: Content is stored as **raw Markdown** in SQLite. This simplifies the editor round-trip because what the user writes is what gets stored. Markdown → HTML conversion only happens at render time in `ArticleDetail`.
- The design spec calls for a Markdown editor with live preview. The split-pane layout matches design spec Section 1.4.
- Autosave is **explicitly excluded** per design spec Decision #4. Manual save only, with `⌘S` / `Ctrl+S` keyboard shortcut supported (bind in the editor with `useEffect` + `keydown` listener).
- Status defaults to `published` for v1 simplicity (draft/published toggle can be added post-MVP).
- Category assignment in the editor is deferred to post-MVP (v2 feature).

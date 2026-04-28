# Iteration 4: Editor, Forms, and Full CRUD

**Goal:** Implement the complete article creation and editing experience, including the Markdown editor, form validation, autosave, tag input, and category selection. The app should support end-to-end article lifecycle: create, edit, and delete with full UX fidelity.

**Deliverable:** A user can create a new article, edit an existing one, see live Markdown preview, receive validation feedback, recover drafts from `localStorage`, and delete articles with confirmation.

---

## Task List

### 4.1 Build MarkdownEditor component
- File: `src/components/MarkdownEditor.tsx`
  - **Desktop (≥768px):** split-pane layout.
    - Container: `flex h-[calc(100vh-280px)] min-h-[400px] rounded-lg border border-slate-200`.
    - Left pane (50%): `<textarea>` with `font-mono text-sm p-5 resize-none border-none outline-none`.
    - Divider: `w-px bg-slate-200`.
    - Right pane (50%): live preview via `react-markdown` + `remark-gfm`, `p-5 overflow-y-auto`.
  - **Mobile (<768px):** tabbed layout.
    - Tab bar: "Write" | "Preview". Active tab has `border-b-2 border-blue-600`.
    - Content area below tabs shows textarea or preview based on active tab.
  - Props: `value`, `onChange`, `placeholder`.
  - Accessibility: textarea has `aria-label="Article content"` (visually hidden label if needed).

### 4.2 Build TagInput component
- File: `src/components/TagInput.tsx`
  - Display existing tags as removable chips (`rounded-sm bg-slate-100 px-2 py-1 text-xs` with `X` icon).
  - Inline text input after chips. Typing + `Enter` or `,` creates a new chip.
  - `Backspace` on empty input removes the last chip.
  - Validation: max 10 tags, max 30 chars each, alphanumeric + hyphen only. Block invalid characters at input level.
  - Props: `tags: string[]`, `onChange(tags)`.

### 4.3 Build ArticleEdit page (`src/routes/ArticleEdit.tsx`)
- Handles **both** `/articles/new` and `/articles/:slug/edit`.
- **Loader logic:**
  - For new article: no fetch; form starts empty.
  - For edit: fetch article by slug. If not found, render `EmptyState`.
- **Form state (local `useState`):**
  - `title`, `content`, `categoryId`, `tags`.
  - Track `original` snapshot for dirty detection.
- **Breadcrumb:**
  - New: "Articles" → "New Article"
  - Edit: "Articles" → "Edit 'Article Title'"
- **Action bar:**
  - "Save" (primary, disabled until form is valid and dirty).
  - "Cancel" (ghost) → back to article detail (if editing) or home (if new).
  - Autosave indicator (right-aligned): `Unsaved changes` (amber), `Saving...` (spinner), `Saved` (green check, fades after 2s), `Draft saved locally` (cloud icon).
- **Title input:**
  - `text-2xl font-bold`, placeholder "Article title".
  - Bottom border only (`border-b-2 border-slate-200`), focus `border-blue-600`.
  - Validation: required, max 200 chars. Show inline error on blur if invalid.
- **Category dropdown:**
  - Native `<select>` styled per design spec §6.2.
  - Fetch categories via `GET /api/categories`.
  - Default option: "None".
- **Tags:** render `TagInput`.

### 4.4 Implement form validation
- **Client-side (Zod reuse):**
  - Import `ArticleCreateSchema` from `shared/schemas.ts`.
  - Validate on blur (title) and on save attempt (all fields).
  - Error style: `border-red-500 ring-2 ring-red-500/20`, error text `text-sm text-red-600` with `AlertCircle` icon.
- **Server-side:**
  - On save, call `POST` or `PUT`. If API returns validation errors, map `details` array to field-level errors.
  - If slug collision occurs (unique constraint), show inline error under title: "An article with a similar title already exists."

### 4.5 Implement autosave to localStorage
- Cadence: every 2000 ms after the last keystroke (`setTimeout` reset on each change).
- Key: `draft:new` or `draft:<slug>`.
- Store: `{ title, content, categoryId, tags, savedAt }`.
- On mount (edit or new): check `localStorage` for a draft.
  - If draft exists and is newer than the loaded article (for edits) or non-empty (for new), pre-populate form and set dirty state.
- On successful server save: clear the localStorage draft key.
- On network save failure: keep draft, show "Draft saved locally" indicator with cloud-offline icon. Do **not** block editing.

### 4.6 Implement dirty guard and unload handler
- Compare current form values against:
  - New: empty state.
  - Edit: original fetched state.
- If dirty, attach `beforeunload` listener: "You have unsaved changes. Leave anyway?"
- On Cancel navigation, return to previous page without prompt if not dirty.

### 4.7 Wire save and navigation
- **Save handler:**
  - Validate with Zod.
  - Call `POST /api/articles` (new) or `PUT /api/articles/:slug` (edit).
  - On success: clear draft, show success toast, navigate to `/articles/:slug`.
  - On error: show error toast/banner with retry option.
- **Cancel handler:**
  - New → navigate to `/`.
  - Edit → navigate to `/articles/:slug`.

### 4.8 Integrate delete flow (already started in Iteration 3)
- Confirm modal must already work from `ArticleDetail`. Ensure deletion redirects to `/` with a success toast.

### 4.9 Update placeholder routes
- Replace placeholder `ArticleEdit` stubs in `src/App.tsx` with the real `ArticleEdit` component for both `/articles/new` and `/articles/:slug/edit`.

### 4.10 Iteration health check
- Run `npm run dev`.
- Manual verification:
  - Create article with title, content, category, tags → save → detail page shows correct data.
  - Edit article → change content → save → detail reflects changes, slug unchanged.
  - Trigger validation errors (empty title, too-long title) → inline errors appear.
  - Type in editor → refresh page before saving → draft is recovered from `localStorage`.
  - Delete article → confirm modal → redirect to home with toast.
  - Search for newly created article by title and content.
- Run `npm run test:unit:run` — no regressions.
- Commit the iteration.

---

## Iteration-Specific Notes
- **localStorage vs. server save:** The architecture spec designates `localStorage` autosave only; the server is updated on explicit Save. Do not add a background server autosave—this keeps the implementation simple and avoids conflict handling complexity.
- **Slug immutability:** When editing, the slug field is not exposed in the UI. The server ignores any slug changes on `PUT` per Iteration 2. The frontend does not need to manage slug state.
- **Category/tag data on new articles:** Even though category browsing is v2, the create/edit form should allow assigning a category and tags because the schema and API support it, and the design spec requires these fields in the editor.
- **Editor toolbar:** Intentionally omitted per design spec §5.3. Users type raw Markdown. A toolbar can be added in v1.1 or v2.
- **Scroll sync:** Not required in v1 per design spec §5.3. Each pane scrolls independently.

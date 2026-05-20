# Iteration 4: Dynamic Split-Pane Markdown Editor & Operations

## Goal & Scope
Implement the application's create and update workflows. Build Next.js Server Actions with strict Zod schemas to validate mutations, write editor pages, and develop a 50/50 split-pane Markdown editor (desktop) that collapses into a tabbed workspace (tablet/mobile). The editor must feature debounced parsing, scroll synchronization, and browser dirty-state guards.

At the end of this iteration, a team member will be able to create new articles, edit existing ones with side-by-side previews, toggling categories and statuses, and save changes securely.

---

## Task Checklist

### 1. Next.js Server Actions & Schemas
- [ ] **Create Server Actions**:
  Implement write mutations in [src/lib/actions.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/actions.ts):
  - Define `articleSchema` using `zod`: title (string, 2-100 characters), slug (url friendly format), content (string, minimum 5 characters), categoryId (nullable integer), status (`draft` / `published`).
  - Implement `createArticleAction`: validate inputs, insert rows to `articles` SQLite table, trigger FTS5 updates via triggers, and execute Next.js `revalidatePath('/articles')` to refresh lists.
  - Implement `updateArticleAction`: validate inputs, update corresponding database fields, set `updatedAt = new Date()`, and execute path revalidations (`revalidatePath('/articles')` and `revalidatePath('/articles/[slug]')`).

### 2. Interactive Controls Header Row
- [ ] **Build Editor Control Bar**:
  Create the visual inputs header in [src/components/MarkdownEditor.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/MarkdownEditor.tsx):
  - Place a large, borderless, single-line text input for Title (`fs-xl` bold) with a subtle placeholder.
  - Expose Category Select Dropdown containing chevron icons, populated by DB-driven lists.
  - Expose Status Select Dropdown to toggle between Draft and Published lifecycle badges.
  - Expose action buttons: Cancel (neutral text button navigating backward) and Save Changes (elevated Cobalt button).

### 3. Dual Workspace (Split Pane / Tabs)
- [ ] **Build Split-Pane Editor Workspace**:
  Implement side-by-side dynamic previews in `src/components/MarkdownEditor.tsx`:
  - **Desktop (>= 1024px)**: Display side-by-side 50/50 flex panels.
    - *Left Pane*: A standard textarea set to `var(--font-mono)` with active line wrapping, matching IDE line paddings.
    - *Right Pane*: Read-only live preview canvas rendering parsed HTML.
  - **Tablet/Mobile (< 1024px)**: Restructure the panels into a tabbed navigation header: `[Write Markdown]` and `[Preview Output]`. Implement horizontal swipe touch gestures to transition between tabs.
  - **Live Compilation**: Debounce inputs by 75ms before compiles to avoid UI typing lag. Parse via `marked` and sanitize via `DOMPurify` before injecting HTML.

### 4. Interactive Scrolling Synchronization
- [ ] **Build Scroll Offset Sync Hooks**:
  Add scrolling triggers to mirror offsets in `src/components/MarkdownEditor.tsx`:
  - Calculate proportional height offsets when a user scrolls the editor pane:
    `const scrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);`
  - Apply the matching percentage to the live preview panel scroll position, maintaining inline scroll alignments.

### 5. Router Creation & Update Pages
- [ ] **Create Creation and Edit Pages**:
  Link editing interfaces into file routing locations:
  - Create [src/app/articles/new/page.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/articles/new/page.tsx) to fetch category list options and load an empty editor shell.
  - Create [src/app/articles/[slug]/edit/page.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/articles/[slug]/edit/page.tsx) to fetch the target article details, map categories, and populate the editor.

### 6. Dirty-State browser warnings
- [ ] **Build Page Leave Event Guards**:
  Protect users from accidentally abandoning unsaved drafts:
  - Add standard window event listeners on `beforeunload` executing if local inputs diverge from initially populated database props.
  - Display browser alerts checking: *"You have unsaved changes. Are you sure you want to leave this page?"*

---

## Verification & QA Checkpoints

### 1. Functional Form Validations
- Navigate to `/articles/new` on the local dev server.
- Click "Save Changes" with completely empty inputs:
  - Verify that the page prevents submission and displays distinct red form validation alerts.
- Enter a title "Drizzle ORM setup", set the category to "Engineering", and type standard Markdown paragraphs with list items.
- Confirm that the live preview updates in real-time without typing latency.
- Save the changes, verify redirection to the article's detail view, and check that the new article renders successfully.

### 2. Tab Collapsing & Scroll Mirror Walkthrough
- Edit an article and resize the browser window below 1024px:
  - Verify that the layout shifts into tabs and that you can switch between editor and preview.
- Expand the screen back to desktop size.
- Scroll through a long markdown document and verify that the preview pane scrolls in tandem, keeping corresponding sections visible.
- Make edits and click the sidebar category link:
  - Confirm the browser warning modal prevents immediate navigation, requesting confirmation.

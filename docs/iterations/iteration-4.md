# Iteration 4: Write Flow

## Goal
Implement the article creation and editing experience with a live Markdown preview.

## Scope
- API endpoints for creating and updating articles.
- Two-pane Markdown editor.
- Article status management (Draft/Published).
- Form validation.

## Tasks
1. **API: Write Endpoints**:
   - Implement `POST /api/articles` with Zod validation.
   - Implement `PATCH /api/articles/:id` for updates.
   - Automatically generate unique slugs from the title.
2. **Web: Editor Component**:
   - Create a `MarkdownEditor` component using a controlled `<textarea>`.
   - Implement a side-by-side layout (Input on left, Preview on right).
   - Use `useDeferredValue` for the preview to maintain typing performance.
3. **Web: Create/Edit Pages**:
   - Implement `/articles/new` and `/articles/:id/edit` routes.
   - Add fields for Title, Content (Markdown), Category selection, and Status (Draft/Published).
4. **Web: Form Logic**:
   - Implement form validation using Zod.
   - Add "Save", "Cancel", and "Delete" (for edit mode) actions.
   - Support `Cmd/Ctrl + S` shortcut to save changes.
5. **UX Polish**:
   - Add status badges (Draft/Published) to the article detail view.
   - Implement "Success" and "Error" notifications (toasts or simple alerts).

## Notes
- The editor should use a monospace font (JetBrains Mono or system default) for the input pane.
- Ensure the preview rendering is consistent with the Article Detail view.

# Iteration 4 Summary: Write Flow

## Summary of Work
In this iteration, the "Write Flow" was implemented, enabling users to create, edit, and delete articles with a real-time Markdown preview experience.

### API Improvements
- **Write Endpoints**: Added `POST /api/articles`, `PATCH /api/articles/:id`, and `DELETE /api/articles/:id` endpoints.
- **Slug Management**: Implemented automatic, unique slug generation from article titles. Slugs are ensured to be unique by appending a counter if a collision occurs.
- **Validation**: Integrated shared Zod schemas (`CreateArticleSchema`, `UpdateArticleSchema`) for rigorous request validation.
- **Status Filtering**: Updated the article list endpoint to support optional status filtering, while maintaining the `PUBLISHED` default for the public read flow.

### Web Improvements
- **Markdown Editor**: Created a dedicated `MarkdownEditor` component featuring:
  - Side-by-side layout (Input/Preview).
  - Monospace font for the editor pane.
  - High-performance live preview using React 19's `useDeferredValue`.
- **Create/Edit Pages**: Implemented a unified `ArticleEdit` page that handles both creation and updates.
- **Form Logic**:
  - Full form state management with TanStack Query mutations.
  - Keyboard shortcut: `Cmd/Ctrl + S` to save.
  - Category selection and status (Draft/Published) management.
  - Delete functionality with confirmation.
- **UX Polish**:
  - Added an "Edit" button to the article detail view for easy navigation to the editor.
  - Implemented status badges (Draft/Published) in the article detail view.
  - Added success/error notifications using a simple toast-like system.
  - Updated the global sidebar "New Article" link.

## Assumptions and Issues
- **Slug Stability**: Assumed that while slugs are auto-generated from titles, they should only be updated if the user hasn't provided a manual slug or if the title changes significantly in a DRAFT state. Currently, the API regenerates the slug if the title is provided and slug is omitted in the request.
- **Notification System**: Implemented a simple local notification state within the `ArticleEdit` component. A global toast system might be preferable in a future iteration.
- **Type Safety**: Updated `packages/types` to make `slug` optional in `CreateArticleSchema` to accommodate server-side generation while maintaining client-side type safety.

## Verification Results
- **API**: Verified `POST`, `PATCH`, and `DELETE` article endpoints via manual inspection of logic and schema alignment.
- **Web**: Verified the two-pane editor layout, live preview responsiveness, and keyboard shortcuts.
- **Routing**: Confirmed that `/articles/new` and `/articles/:slug/edit` correctly load the editor with the appropriate context.

## Decisions Log
| ID | Decision | Rationale |
| :--- | :--- | :--- |
| DEC-014 | Deferred Preview | Used `useDeferredValue` for the Markdown preview to ensure that even with large articles, the typing experience remains lag-free. |
| DEC-015 | Unified Editor Page | Combined Create and Edit logic into a single `ArticleEdit` component to maximize code reuse and maintain a consistent editing experience. |
| DEC-016 | Server-side Slug Gen | Centralized slug generation in the API to ensure uniqueness across the database without requiring complex client-side checks. |

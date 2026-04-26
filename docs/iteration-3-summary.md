# Iteration 3 Summary: Content Creation & Maintenance

## Built in this Iteration
- **Validation**: Implemented Zod schemas for article creation and updates to ensure data integrity.
- **Server Actions**: Created `createArticle` and `updateArticle` actions with server-side validation and slug generation.
- **Editor Component**: Built a reusable `MarkdownEditor` with:
  - Split-pane layout (Editor/Preview).
  - Live rendering using `react-markdown`.
  - Responsive behavior: Switches to a stacked layout on tablets.
  - Form validation error display using `Red-600`.
- **Pages**:
  - `/articles/new`: New article creation page.
  - `/articles/[slug]/edit`: Article editing page pre-populated with existing content.
- **Redirects**: Implemented automatic redirection back to the article detail page after successful save/update.

## Assumptions & Decisions
- **Default Author**: Since authentication is not part of the MVP, articles are assigned to the first available user in the database or a 'default-user' ID.
- **Slug Generation**: Implemented a simple slugifier that converts titles to URL-friendly strings.
- **Client-side Redirects**: Used `window.location.href` for redirects within the Client Component `MarkdownEditor` to ensure the page fully refreshes and reflects the latest database state.

## Verification
- **Create Flow**: Verified that a new article can be created, validated, and redirected to its detail page.
- **Edit Flow**: Verified that an existing article can be edited and changes are persisted.
- **Responsive UI**: Verified the layout shifts correctly between desktop and tablet breakpoints.
- **Validation**: Verified that empty titles or content trigger the appropriate error messages.

## Decisions Log
- **Redirect Strategy**: Chose `window.location.href` over `useRouter` in the editor component to ensure server-side data is fresh upon redirection.
- **Slug Handling**: Decided to update the slug if the title changes during an edit, meaning the URL of the article may change.

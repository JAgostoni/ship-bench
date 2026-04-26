# Iteration 3: Content Creation & Maintenance

## Goal
Implement the ability to create new articles and edit existing ones via a Markdown editor.

## Tasks
- [ ] **Validation Schemas**:
    - Create Zod schemas for Article creation and updates (title, content).
- [ ] **Create New Page (`/articles/new`)**:
    - Implement the split-pane layout: Left (Form/Textarea) and Right (Live Preview).
    - Use `react-markdown` for the live preview.
    - Implement a Server Action to save the new article to the database.
- [ ] **Edit Article Page (`/articles/[slug]/edit`)**:
    - Implement the same split-pane layout, pre-populated with existing article data.
    - Implement a Server Action to update the article.
- [ ] **UX Enhancements**:
    - Implement the Tabbed View for the editor on Tablet breakpoints.
    - Add form validation error messages using the Red-600 color token.
    - Ensure saving redirects the user back to the Article Detail page.

## Notes
- Ensure the split-pane editor handles scrolling independently or synchronized as per the design spec.
- All mutations must be handled via Next.js Server Actions.

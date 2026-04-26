# Iteration 3: Article Creation & Editing

**Goal:** Users can write new articles and edit existing ones.
**Scope:** Implements MVP Feature 3 (Basic editing). Introduces form handling, Next.js Server Actions, and a responsive Markdown editor.

## Tasks

1. **Server Actions & Core Logic Unit Tests:** 
   - Create `src/actions/article.actions.ts`.
   - Implement a `createArticle` action that takes a title and content, generates a URL-safe slug from the title, saves to Prisma, and calls `revalidatePath`.
   - Implement an `updateArticle` action that updates an existing record by ID/slug.
   - Write a unit test (`tests/unit/article.actions.test.ts`) using the native Node.js test runner to verify the core logic of title-to-slug generation and basic data validation.

2. **Responsive Editor Component:** 
   - Create `src/components/Editor.tsx`.
   - Implement a layout that switches between a side-by-side split pane (Desktop) and a Tabbed view (Mobile: Write | Preview).
   - Use a raw `<textarea>` (styled with monospace font `var(--font-family-mono)`) for the input.
   - Use the `MarkdownViewer` component from Iteration 2 for the live preview pane.

3. **Create Article Flow:** 
   - Create `src/app/articles/new/page.tsx`.
   - Implement the page header with a "Cancel" button and "Save" submit button.
   - Wire the form to the `createArticle` Server Action. On success, redirect the user to the newly created article's detail page.
   - Update the placeholder "New Article" button in `src/app/layout.tsx` to link to this page.

4. **Edit Article Flow:** 
   - Create `src/app/articles/edit/[slug]/page.tsx`.
   - Fetch the existing article to populate the default values of the `Editor`.
   - Wire the form to the `updateArticle` Server Action. On success, redirect back to the article detail page.
   - Add an "Edit" button to the `src/app/articles/[slug]/page.tsx` view that links to this edit page.

5. **E2E Testing (Journey 3):** 
   - Create `tests/edit.spec.ts`.
   - Write a test that navigates to `/articles/new`, fills in a title and markdown content, submits the form, and verifies the user is redirected to the detail page showing the new content.

## Notes on Dependencies & Sequencing
- The `Editor` component relies on `MarkdownViewer` from Iteration 2.
- Testing this flow relies on the ability to view articles built in Iteration 2.
# Iteration 3 Summary

## What was built
- **Server Actions for Articles:** Created `src/actions/article.actions.ts` containing `createArticle` and `updateArticle` for handling form submissions without traditional API routes.
- **Unit Tests:** Added `tests/unit/article.actions.test.ts` using the native Node.js test runner to ensure correct logic for generating URL-safe article slugs.
- **Responsive Editor Component:** Built `src/components/Editor.tsx` and its corresponding CSS module. It features a side-by-side Markdown editing and preview pane on larger screens, which gracefully falls back to a tabbed (Write vs. Preview) interface on smaller screens.
- **Article Creation Flow:** Added the `/articles/new` route to render the editor for new posts. Clicking "Save" calls the `createArticle` Server Action, revalidates paths, and redirects to the newly published article.
- **Article Edit Flow:** Added the `/articles/edit/[slug]` route which fetches the existing article, populates the editor, and submits to the `updateArticle` Server Action. 
- **UI Enhancements:** Updated the article detail page (`/articles/[slug]`) to include an "Edit" button in the header.
- **E2E Testing:** Authored `tests/edit.spec.ts` (Journey 3) using Playwright to successfully verify the end-to-end flow of creating a new article and verifying the rendered output.

## Assumptions & Issues Encountered
- **Next.js Server Actions Export Constraint:** Server actions must be exported as `async` functions from files marked with `'use server'`. The `generateSlug` utility had to be defined as `async` to comply with these rules. The unit test and calling functions were updated to `await` it.
- **Draft/Published Status:** Per the architecture spec and MVP rules (Stretch features), the concept of "Draft" versus "Published" is explicitly excluded from the MVP. Therefore, articles are considered instantly available (though not in the index yet since the index is built on an assumption of being visible). 
- **Slug Collisions:** Added a basic random string appendage logic during slug creation to handle potential title collisions safely in the short term.
- **Routing & Revalidation:** After both creating and updating articles, `revalidatePath` is invoked to ensure the updated content serves fresh versions instead of hitting the Next.js cache. 

## Confirmation
- The application runs locally successfully (`npm run dev`).
- The Playwright tests run and pass without errors (`npx playwright test`).
- The `node:test` execution (`npx tsx --test`) correctly executes and validates the slug generation logic. 
- The end-to-end forms for creating and editing correctly mutate the local SQLite database and redirect accurately.

## Decisions Log
- **Editor Component Architecture:** Consolidated the Form tag, the save/cancel actions, and the Workspace (Write/Preview) layout into a single, cohesive Client Component (`Editor.tsx`). This reduces prop-drilling complexity between Server and Client components.
- **Form Actions Binding:** Used the `.bind()` method inside the edit Server Component (`page.tsx`) to pass the article ID directly to the `updateArticle` Server Action, ensuring clean parameters while utilizing FormData.
- **Styling the Edit Button:** Added an `.editButton` class within the article detail CSS module, utilizing the standard `--color-bg-surface` layout pattern outlined in the design spec to keep consistency without relying on complex overriding rules.
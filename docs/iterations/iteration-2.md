# Iteration 2: Article Browsing & Detail View

**Goal:** Users can browse a list of available articles and read their full contents.
**Scope:** Implements MVP Feature 1 (Article browsing and detail pages). Focuses purely on read-only Data Fetching using React Server Components.

## Tasks

1. **Global Layout Shell:** 
   - Update `src/app/layout.tsx` to include the global Header.
   - Include a placeholder text/logo on the left and a placeholder "New Article" button on the right. (Search bar will come later).
   - Constrain the `<main>` content area to a max-width of `960px` and apply mobile-first global padding per the design spec.

2. **Markdown Rendering Component:** 
   - Install `react-markdown` and `remark-gfm`.
   - Create `src/components/MarkdownViewer.tsx`.
   - Implement a CSS Module (`MarkdownViewer.module.css`) providing a `.prose` class that handles typographic spacing, headings, lists, blockquotes, and inline code styling for the rendered Markdown.

3. **Article Detail Page:** 
   - Create `src/app/articles/[slug]/page.tsx`.
   - Fetch the specific article from Prisma using the `slug` param. Handle the `404 Not Found` state if the slug doesn't exist.
   - Render the article's title (`<h1>`), metadata (date), and the `<MarkdownViewer>` for the content.

4. **Home Page / Browse View:** 
   - Update `src/app/page.tsx`.
   - Fetch all articles from Prisma, ordered by `updatedAt` descending.
   - Render a list of articles showing the Title and a brief excerpt or metadata.
   - Wrap each item in a `Link` pointing to `/articles/[slug]`.
   - Implement an "Empty State" UI if zero articles exist in the database.

5. **E2E Testing (Journey 1):** 
   - Create `tests/browse.spec.ts`.
   - Write a test that visits the home page, clicks on the first article in the list, and verifies that the Markdown content is rendered on the subsequent detail page.

## Notes on Dependencies & Sequencing
- Requires the seeded database from Iteration 1.
- Building the `MarkdownViewer` here is a prerequisite for the live-preview editor in Iteration 3.
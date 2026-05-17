# Iteration 3 Summary: Search

## Summary of Work
In this iteration, high-performance search functionality was integrated into the Knowledge Base application. Users can now search across article titles and content with dynamic, debounced results and visual highlighting.

### API Improvements
- **Full-Text Search Integration**: Updated the `GET /api/articles` endpoint to support a `search` query parameter.
- **PostgreSQL FTS**: Enabled the `fullTextSearchPostgres` preview feature in Prisma and utilized the `search` operator for efficient querying of `title` and `content` fields.
- **Search Logic**: Implemented an "AND" search strategy where multiple keywords are joined to ensure relevant results.

### Web Improvements
- **Global Search UI**: Added a prominent search bar to the sidebar layout using a custom input component with a search icon and keyboard shortcut hint.
- **Keyboard Shortcut**: Implemented `Cmd/Ctrl + K` global shortcut to quickly focus the search bar from anywhere in the app.
- **Debounced Search**: Integrated a 300ms debounce on the search input to prevent excessive API calls while providing a "live" feel.
- **Search Results Page**: Updated the `Home` page to handle search queries, updating the page title and showing clear results or "No results" empty states.
- **URL Sync**: Ensured search state is persisted in the URL query string (`?search=...`) for shareability and consistent "back" button behavior.

### UX Polish
- **Term Highlighting**: Created a `Highlight` component in the `ArticleCard` to visually emphasize matching search terms in both the title and the excerpt.
- **Visual Feedback**: Added subtle transitions and focus rings to the search input, maintaining the "Cinematic Monolith" aesthetic.

## Assumptions and Issues
- **Prisma 7.8.0 Configuration**: Noticed that Prisma 7 no longer supports `url` in the `schema.prisma` file, requiring it to be handled via `prisma.config.ts`. Reverted manual schema changes that were causing validation errors.
- **Combined Vector Search**: While search currently checks both title and content fields via an `OR` match in Prisma, a truly high-performance combined vector index (as mentioned in the architecture spec) would be better implemented via a generated column or manual migration in a future performance pass.
- **Build System**: The build system (`tsc`) remains broken as noted in Iteration 2 due to missing `tsconfig.json` files in the monorepo boilerplate. Functionality was verified via `npm run dev` and manual API testing.

## Verification Results
- **API**: Verified that `GET /api/articles?search=React` correctly returns articles containing "React" in either title or content.
- **API**: Confirmed that empty search results return an empty array with total 0.
- **Web**: Verified debounced navigation to `/?search=...` as the user types.
- **Web**: Confirmed that `Cmd/Ctrl + K` focuses the search input.
- **UX**: Verified that matching terms are highlighted in the article list.

## Decisions Log
| ID | Decision | Rationale |
| :--- | :--- | :--- |
| DEC-011 | Prisma Search Operator | Used the built-in Prisma `search` operator instead of raw SQL to maintain better integration with existing filtering and pagination logic while still utilizing PostgreSQL FTS. |
| DEC-012 | Client-side Highlighting | Implemented highlighting on the client to avoid complex DB-side string manipulation and to ensure it works across both title and excerpt consistently. |
| DEC-013 | Global Search Navigation | Chose to make the sidebar search global (navigating to home) to simplify the user's mental model, as searching while in a specific category was deemed a secondary use case for v1. |

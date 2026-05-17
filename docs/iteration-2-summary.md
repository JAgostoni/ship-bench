# Iteration 2 Summary: Read Flow

## Summary of Work
In this iteration, the core "Read Flow" of the Knowledge Base application was implemented. Users can now browse articles on the home page, filter them by category, and read full articles with rich Markdown formatting and syntax highlighting.

### API Improvements
- **Category Endpoints**: Added `GET /api/categories` to support the sidebar navigation.
- **Article Endpoints**: 
  - `GET /api/articles`: Implemented with pagination and category filtering.
  - `GET /api/articles/:slug`: Fetches a single article with all its relations (category, tags).
- **Data Integrity**: Articles are ordered by `createdAt` descending. By default, the Read Flow only returns articles with `PUBLISHED` status.

### Web Improvements
- **Global Layout**: Created a persistent sidebar layout with navigation and dynamic category links.
- **Home Page**: Implemented a responsive article list with `ArticleCard` components.
- **Article Detail**: Added a dedicated page for reading articles.
- **Markdown Rendering**: Integrated `react-markdown` with `shiki` for high-fidelity code syntax highlighting.
- **UX Enhancements**:
  - Implemented **Skeleton Screens** for loading states in both the list and detail views.
  - Added "min read" estimation based on content length.
  - Responsive design for mobile (sidebar collapses to top nav).

## Assumptions and Issues
- **Article Status**: Assumed that the "Read Flow" should primarily show `PUBLISHED` articles, although full status handling is slated for Iteration 4.
- **Syntax Highlighting**: Chose to use `shiki` as specified in the architecture, which provides superior highlighting but required a client-side highlighter initialization.
- **Broken Build Script**: Noticed that the `tsc` command in `package.json` was failing due to missing `tsconfig.json` files in the boilerplate. While I focused on feature implementation and verified functionality via `npm run dev` and `curl`, a full build system fix may be needed in a future "cleanup" task.

## Verification Results
- **API**: Verified `GET /api/articles`, `GET /api/articles/:slug`, and `GET /api/categories` via `curl`.
- **Web**: Verified component rendering and routing logic.
- **Database**: Confirmed that the API correctly queries relations and handles filters.

## Decisions Log
| ID | Decision | Rationale |
| :--- | :--- | :--- |
| DEC-008 | Client-side Shiki | Initialized Shiki in a `Markdown` component to meet the architecture's requirement for high-quality syntax highlighting without needing a specialized server-side rendering pass. |
| DEC-009 | Published Only | Defaulted the article list to `PUBLISHED` status to ensure the "Read Flow" is relevant for end-users. |
| DEC-010 | Back-button logic | Used `useNavigate(-1)` for the article detail page to preserve the user's previous search/filter context. |

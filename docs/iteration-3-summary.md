# Iteration 3 Summary: Article Browsing, Search, and Category Filtering

This document summarizes the execution and verification of Iteration 3, establishing the primary read and discovery pathways for the Simplified Knowledge Base application.

---

## 1. Summary of What Was Built

### Backend Search Utility
*   **Query Sanitation**: Implemented `sanitizeSearchQuery` in `src/lib/search.ts` to scrub syntax characters (`*`, double quotes, logical keywords) that provoke SQLite FTS5 parser errors, ensuring query execution safety.
*   **FTS5 Execution**: Developed `searchArticles` querying the virtual `articles_fts` index utilizing the `MATCH` operator. Formulated weighted search strings targeting the title column with a `3x` boost factor over content fields (`title:(${query})^3 OR content:(${query})`).
*   **Result Mapping**: Joined index hits back to standard articles and categories tables, filtered out `draft` state records to protect secure workspace logs, and sorted results in descending relevance order using the `bm25` rating scores.

### Keyboard Shortcuts & Debounced Search Input
*   **Keyboard Binding**: Augmented the `LayoutShell.tsx` component with a global `keydown` event listener targeting `Ctrl+K` and `Cmd+K` inputs. The handler activates focus on the global `id="global-search"` search bar and highlights standard queries instantly.
*   **Input Debounce**: Integrated a 200ms debounce timer inside `LayoutShell.tsx` to collect user keyboard input before initiating soft client-side Next.js routing changes (`router.push`). This minimizes server load while ensuring immediate responsive feedback.
*   **Escape Key Handling**: Supported standard `Escape` key inputs inside the global keydown listener to instantly blur the search bar and collapse the mobile search container overlay.

### Articles Search & Browse Page
*   **Query-Driven Routing**: Structured `src/app/articles/page.tsx` as a React Server Component that resolves `searchParams` on demand to filter products.
*   **Precedence Hierarchy**: Evaluated query parameters dynamically: FTS5 query search takes priority if active, followed by category slug matches (including a dedicated `uncategorized` filter path), falling back to fetching all published guides if none are present.
*   **High-Density Cards**: Constructed premium responsive layout cards rendering title typography, truncated description content snippets (via CSS `line-clamp: 1`), categorization indicators, publishing status, and human-friendly relative duration metrics (e.g. "Last updated 2 days ago").
*   **Visual Empty States**: Engineered illustrative empty states built using CSS shapes rather than standard static image assets, complete with adaptive cobalt action buttons allowing users to clear filters or write a document.

### High-Readability Document Canvas
*   **Dynamic Slug Pages**: Configured `src/app/articles/[slug]/page.tsx` routing. The page retrieves matching articles from the database, producing a standard `notFound()` 404 response if missing.
*   **Sticky Actions Bar**: Positioned an action header at the top of the canvas that remains sticky during scroll actions. The bar displays interactive breadcrumbs navigation paths (`All Articles` > `Category` > `Article Title`), an outline Cobalt `Edit Article` action button, a status badge, and an outline red `Delete Article` button.
*   **Markdown Parsing & Sanitation**: Configured server-side markdown parsing utilizing the `marked` library, and cleaned the resultant HTML output using `isomorphic-dompurify` to protect against script injections.
*   **Visual Styling System**: Structured a dedicated CSS Module stylesheet (`page.module.css`) to define optimal typography spacing parameters for rendered markdown components, such as headers, blockquotes, padded tables, and JetBrains Mono code block overlays.
*   **Metadata Footer**: Included word count, character count, estimated reading time, and formatted dates.

---

## 2. Assumptions Made and Issues Encountered

*   **Status Isolation**: Assumed that search and browse list directories are exclusively public interfaces, meaning only articles in the `published` status should ever be returned. `draft` articles are safely ignored and reserved for the workspace editor view (to be built in Iteration 4).
*   **FTS5 Automatic Migrations**: The database connection setup (`src/lib/db.ts`) already contained runtime initializers that dynamically check for standard tables and provision `articles_fts` + sync triggers. Consequently, no manual Drizzle SQL migrations were necessary.
*   **Next.js 16 Search and Routing Parameters**: Since the codebase uses Next.js 16.x, `params` and `searchParams` must be treated as Promises. I resolved these asynchronously using `await` inside both browse and detail server components to prevent hydration mismatches and compilation errors.

---

## 3. Decisions Log

### Soft Debounced Search vs. Instant Submit
*   **Tradeoff**: Refreshing search results on every keypress causes page transitions and server queries that can trigger visual stuttering on low-end machines. Adding an input debounce of 200ms allows smooth typing while preserving search-as-you-type responsiveness.
*   **Resolution**: Implemented the debounced effect inside `LayoutShell.tsx` using `setTimeout` triggers, resetting the timer on subsequent key presses. Form submissions or Enter presses ignore the timer to execute instantly and blur inputs.

### Raw SQL FTS5 JOIN vs. Drizzle Select API
*   **Tradeoff**: Drizzle ORM does not support virtual FTS5 MATCH operators natively. Standard Drizzle queries would require complex SQL template literals inside a `db.select()` construct.
*   **Resolution**: Implemented raw SQL executions using `db.all(sql`...`)` to run search queries. Results are then safely mapped to normal data models and Date objects inside the backend utility, preserving interface consistency.

---

## 4. Local Execution Confirmation

*   **Unit Verification**: Executed standard assertions validating query sanitization and markdown compiler safety. All 4 assertions executed by Vitest passed successfully:
    ```bash
    ✓ src/lib/smoke.test.ts (1 test) 5ms
    ✓ src/lib/search.test.ts (3 tests) 29ms
    ```
*   **Production Build**: Verified type safety and app bundles compilation:
    ```bash
    next build
    ✓ Compiled successfully in 2.2s
    Finished TypeScript in 3.1s ...
    ✓ Generating static pages using 6 workers (4/4) in 568ms
    ```
*   **Manual Walkthrough**: Tested the following journeys locally on `http://localhost:3000`:
    1.  Used `Ctrl+K` to instantly focus the search input, typed "Node.js", and verified the URL updated to `/articles?search=Node.js` with the correct results.
    2.  Confirmed that search matches are sorted correctly with higher relevance weighting on titles.
    3.  Selected a guide, verified details render, clicked breadcrumbs to navigate backward, and confirmed that CSS layouts adapt properly across responsive viewport breakpoints.

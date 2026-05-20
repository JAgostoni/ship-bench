# Iteration 3: Article Browsing, Search, and Category Filtering

## Goal & Scope
Implement the application's primary read and discovery pathways. Establish sub-millisecond full-text search using SQLite's FTS5, focus inputs instantly with keyboard shortcuts, debounce user key presses, build high-density list and category-filtered browse cards, and create a high-readability, sanitized markdown article detail canvas.

At the end of this iteration, the user will be able to search the entire database, filter documents by category, click into any article to read it, and see code blocks and tables parsed securely.

---

## Task Checklist

### 1. FTS5 Search Utility Backend
- [ ] **Create FTS5 Search Logic**:
  Implement the search execution utility in [src/lib/search.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/search.ts):
  - Add query string sanitation to scrub special operators (e.g., wildcards `*`, boolean logical queries) that cause SQLite FTS5 crashes.
  - Implement dynamic query builder applying the `MATCH` operator against `articles_fts`.
  - Format the query to scale title relevance 3x higher than content match hits (`title:(${query})^3 OR content:(${query})`).
  - Join search results back to standard `articles` rows, filter out `draft` status items, and sort results by BM25 relevance scores.

### 2. Global Keyboard Shortcuts & Input Debounce
- [ ] **Implement Header Search Controllers**:
  Build interaction handlers inside the persistent header search field:
  - Add an active global event listener to focus `id="global-search"` instantly when a user presses `Ctrl+K` or `Cmd+K`, and blur/reset on `Esc`.
  - Add keyboard debounce logic (200ms) to ensure queries are not dispatched on every single keypress.
  - Trigger a soft Next.js navigation updating the browser URL query parameter (`/articles?search=query`) when debouncing completes.

### 3. Article Search & Browse List
- [ ] **Construct Browse Router Page**:
  Create the article index page in [src/app/articles/page.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/articles/page.tsx):
  - Read query parameters (`category` slug, `search` query) from Server Component params.
  - Fetch corresponding rows from the database: if search is active, fetch via `searchArticles(query)`; if category is active, fetch by category ID; else return all published articles.
  - Render browse headers including query details and count badges ("Search Results for 'Node.js' - 3 articles").
  - Create the **Article Card Component**: render title (`fs-md` semi-bold), one-line content snippet (using CSS `line-clamp: 1`), category pill, status pill, and a human-friendly last updated date ("Last updated 2 days ago").
  - Create **UX Empty States**: build visual CSS shape overlays to render when search filters return zero results, or when a selected category has zero documents. Provide call-to-action buttons ("Clear Search Filters").

### 4. High-Readability Detail Canvas
- [ ] **Construct Article Detail Router Page**:
  Create [src/app/articles/[slug]/page.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/articles/[slug]/page.tsx) to support seamless reading:
  - Retrieve current article matching the URL slug parameter from the database (return a 404 response if the article is missing).
  - Implement a sticky action header at the top of the canvas containing breadcrumbs navigation (`Category Name` > `Article Title`), an "Edit Article" primary cobalt button, a status pill, and a red-accented "Delete Article" button.
  - Create the centered document canvas container (`max-width: 720px`) styling articles in a large bold header `fs-xxl` with metadata counts (estimated read time, character length, publishing date).
  - Parse the markdown body using `marked` (v18.0.3) and sanitize the resulting HTML on the server using `isomorphic-dompurify` (v2.20.0).
  - Style output elements in a designated CSS Module stylesheet: headers (h1-h3), blockquotes, lists, tables with thin borders, and code blocks using `JetBrains Mono` with soft padded dark background overlays.

### 5. Unit & Integration Testing
- [ ] **Write Core Logic Unit Tests**:
  Create the test suite [src/lib/search.test.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/search.test.ts) detailed in the architecture spec:
  - Test query parser sanitization to verify characters like `*` are stripped safely without crashing.
  - Test Markdown HTML compiler and sanitizers to verify inline `<script>` injection attacks and unsafe javascript links are stripped while correct HTML tags remain.

---

## Verification & QA Checkpoints

### 1. Automated Testing Assertions
- Run the unit test suites:
  ```bash
  npm run test
  ```
- Confirm that both the search query sanitization and Markdown sanitization suites pass.

### 2. Functional & Search Relevance Walkthrough
- Navigate the dev browser through search workflows:
  - Press `Ctrl+K` from any route to focus search and type "Node.js".
  - Verify that the URL updates to `/articles?search=Node.js` and that the corresponding seeded articles render instantly.
  - Confirm that search results are ranked by title matches first.
  - Click on an article card and verify that the detail view displays clean, responsive typography.
  - Click the category breadcrumb at the top of the detail canvas to navigate back to the filtered list view.

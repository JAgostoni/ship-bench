# Iteration 4: Search Functionality

**Goal:** Users can quickly find articles by searching across titles and content.
**Scope:** Implements MVP Feature 2 (Search). Focuses on header integration, URL state management, and basic SQLite search queries.

## Tasks

1. **Search Input Component:** 
   - Create `src/components/SearchBar.tsx` as a Client Component.
   - Implement an input field that updates the URL search parameters (`/search?q=value`) when the user presses `Enter` or submits the form. If the query is empty, do nothing.
   - Ensure the input is fully accessible (e.g., `aria-label="Search articles"`).
   - Integrate `SearchBar` into the center of the global Header in `src/app/layout.tsx`.

2. **Search Results Page:** 
   - Create `src/app/search/page.tsx`.
   - Read the `q` parameter from `searchParams`.
   - Query Prisma for articles where the `title` OR `content` matches the query using SQLite `LIKE` operators (e.g., `contains: query`).

3. **Results UI & Empty State:** 
   - Render the search results in a dense list, highlighting or showing a snippet of the match if possible, and linking to the respective article detail pages.
   - Implement the "No Results" empty state UI (as defined in the UX spec) if the query returns zero matches.

4. **E2E Testing (Journey 2):** 
   - Create `tests/search.spec.ts`.
   - Write a test that enters a known query into the header search bar, presses Enter, and verifies that the search results page loads and displays the expected article(s).

## Notes on Dependencies & Sequencing
- This completes the MVP scope. Ensure all three core Playwright tests (Browse, Edit, Search) pass successfully after this iteration is complete.
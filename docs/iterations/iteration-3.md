# Iteration 3: Search

## Goal
Implement full-text search across article titles and content.

## Scope
- PostgreSQL Full-Text Search (FTS) integration.
- Global search bar with dynamic results.
- Search result highlighting.

## Tasks
1. **API: Search Integration**:
   - Update `GET /api/articles` to support a `search` query parameter.
   - Implement PostgreSQL FTS using `tsvector` and `tsquery` (via Prisma `raw` queries if necessary).
   - Ensure search covers both `title` and `content` fields.
2. **Web: Search UI**:
   - Implement a prominent search bar in the global header/sidebar.
   - Add a global keyboard shortcut (`Cmd/Ctrl + K`) to focus the search bar.
3. **Web: Search Results**:
   - Implement debounced search (300ms) to trigger API calls as the user types.
   - Display search results in the main content area, replacing the "Latest Articles" list.
   - Implement an "Empty State" for no results found.
4. **UX Polish**:
   - Highlight matching terms in the article title and excerpt.
   - Ensure search state is reflected in the URL for shareability.

## Notes
- Refer to `DEC-001` in the architecture spec regarding PostgreSQL FTS.
- Search should be "Search-First" as per the design direction.

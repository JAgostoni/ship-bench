# Iteration 2: Browsing & Reading

## Goal
Implement the search-first navigation and the ability to browse and read articles.

## Tasks
- [ ] **Global Header Component**:
    - Create a sticky header with Logo, Global Search Bar, and "New Article" button.
    - Implement the search input with a $300\text{ms}$ debounce.
- [ ] **Home Page (`/`)**:
    - Implement "Recent Articles" list showing title, author, and date.
    - Create the "Get Started" empty state for when no articles exist.
- [ ] **Search Results Page (`/articles`)**:
    - Implement server-side filtering based on the `q` search parameter.
    - Use SQL `LIKE` queries to search across `title` and `content`.
    - Create the "No results found" empty state.
- [ ] **Article Detail Page (`/articles/[slug]`)**:
    - Implement the detail view with breadcrumbs, metadata, and rendered Markdown content using `react-markdown`.
    - Add the "Edit" button that links to the edit page.
- [ ] **Styling**:
    - Apply the "Calm & Professional" color palette and typography scale from the Design Spec.
    - Ensure responsive layouts for Desktop and Tablet.

## Notes
- Focus on the "Discovery" flow: Home $\rightarrow$ Search $\rightarrow$ Detail.
- Use Server Components for data fetching to maximize load speed.

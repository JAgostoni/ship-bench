# Iteration 2 Summary: Browsing & Reading

## Built in this Iteration
- **Global Header**: Implemented a sticky header with logo, a debounced search bar (300ms), and a "New Article" action.
- **Home Page**: Created a landing page featuring a "Recent Articles" list with metadata (author, date) and a "Get Started" empty state for new installations.
- **Search Results Page**: Implemented `/articles` with server-side filtering using SQL `LIKE` queries across titles and content, including "No results found" and "Empty search" states.
- **Article Detail Page**: Created a readable single-column view at `/articles/[slug]` with breadcrumbs, metadata, and Markdown rendering via `react-markdown`.
- **Visual Styling**: Integrated the "Calm & Professional" color palette using CSS variables and applied the Tailwind Typography plugin for consistent article formatting.

## Assumptions & Issues
- **Search**: Used basic SQL `LIKE` queries as per architecture spec, which is sufficient for the projected MVP scale.
- **Navigation**: Assumed that the "New Article" button in the header should link to `/articles/new`, which will be implemented in Iteration 3.

## Verification
- App runs locally.
- **Flow Verified**: Home $\rightarrow$ Search $\rightarrow$ Article Detail.
- **Empty States**: Verified that the Home page and Search page handle empty database states gracefully.
- **Responsive**: Layouts adapt correctly for Desktop and Tablet viewports.

## Decisions Log
- **CSS Variables**: Defined the design spec's palette as CSS variables in `globals.css` to ensure consistency and easy updates.
- **Debounce Logic**: Implemented the 300ms search debounce using a `useEffect` hook in the `GlobalHeader` component to balance responsiveness and server load.
- **Markdown Rendering**: Used `react-markdown` paired with `@tailwindcss/typography` (`prose` classes) to ensure high readability of documentation content.

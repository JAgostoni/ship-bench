# Iteration 4 Summary

## Summary
In this iteration, the Search functionality (MVP Feature 2) was successfully implemented. The following tasks were completed:
- Created a `SearchBar` client component (`src/components/SearchBar.tsx`) with associated CSS modules to match the design spec.
- Integrated the `SearchBar` into the global layout header (`src/app/layout.tsx`).
- Created the Search Results page (`src/app/search/page.tsx`) to query the SQLite database via Prisma using `LIKE` operators on both article `title` and `content`.
- Implemented robust UI states for search results, including a well-designed "No Results" empty state as defined in the UX spec.
- Added comprehensive E2E tests (`tests/search.spec.ts`) for the search journey and updated the `smoke.spec.ts` locator to properly reflect the header component structure.

## Assumptions & Issues Encountered
- **Prisma Schema Scope:** The initial `page.tsx` code included an attempt to fetch `category` relationships via `include: { category: true }`. However, per the Architecture and Backlog specs, `Category` features were intentionally scoped out for the MVP. This caused a Prisma client validation error during test execution. The code was updated to remove this invalid relationship lookup, strictly adhering to the MVP constraints.
- **Test Suit Hangs/Interactive Run:** Encountered issues running Playwright interactively via `npx playwright test` which occasionally hung or opened test reports automatically. Resorted to passing the `CI=1` flag to run tests cleanly in a non-interactive, headless manner.
- **Smoke Test Locator:** The existing `smoke.spec.ts` incorrectly expected the main app logo "Knowledge Base" to be wrapped in an `<h1>` tag. Given that `<h1>` is reserved semantically for the main content block headers (e.g., "Recent Articles" or the Article Title itself), the test was updated to target the header's navigation link specifically instead of an `<h1>`.

## Confirmation
The application runs successfully locally via `npm run dev`. The full end-to-end Playwright test suite passes (4/4 tests), confirming that core flows including article browsing, editing, and the newly implemented search feature work seamlessly.

## Decisions Log
- **Vanilla CSS:** Maintained the use of strictly Vanilla CSS Modules for styling the `SearchBar` and Search Results page, avoiding Tailwind classes as mandated by the architectural guidelines.
- **URL Parameter-Based Search:** Chose to use `next/navigation`'s `useSearchParams` and standard query parameters (`?q=...`) to handle search state. This ensures that search URLs are shareable, cacheable, and directly accessible without relying on complex client-side application state.
- **Client/Server Component Split:** The `SearchBar` is marked as a `'use client'` component to handle interactive input and router pushing, while the results view `page.tsx` remains a React Server Component to handle direct database querying with no client-side waterfall fetching.
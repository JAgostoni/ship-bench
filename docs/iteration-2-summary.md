# Iteration 2 Summary

## What was built
- **Global Layout Shell**: Created `layout.tsx` and `layout.module.css` with a responsive header and main content area centered with a maximum width, sticking to the design spec's Vanilla CSS requirement.
- **Markdown Rendering Component**: Integrated `react-markdown` and `remark-gfm`. Created a `MarkdownViewer` component that safely renders article content with a `.prose` typography stylesheet ensuring optimal text readability (max 65ch width, proper spacing and lists, monospace for code).
- **Home Page / Browse View**: Updated `page.tsx` to read directly from the SQLite database via Prisma. Implemented an empty state when no articles exist, and an article list with a 150-character summary excerpt otherwise.
- **Article Detail Page**: Built `articles/[slug]/page.tsx` that fetches article data based on the dynamic slug parameter. The page presents a breadcrumb trail, the title, metadata, and uses the `MarkdownViewer` to render its full content.
- **E2E Testing**: Wrote Journey 1 in `tests/browse.spec.ts` which uses Playwright to verify that users can view the homepage, click on an article, and successfully navigate to an article detail page displaying rendered Markdown content.

## Assumptions made / issues encountered
- While writing the Playwright test, testing via `getByRole('link', { name: 'Knowledge Base' })` failed because the test ambiguously matched the global logo header ("Knowledge Base") as well as an article explicitly titled "Welcome to the Knowledge Base". This was resolved by using exact matching.
- I assumed the "New Article" link should go to `/articles/new` (which hasn't been implemented yet) based on common routing patterns.

## Confirmation
- The app builds successfully with no TypeScript errors (`npm run build`).
- The app has been verified locally, reading data correctly from Prisma using React Server Components.
- The Playwright tests ran and passed (`npx playwright test tests/browse.spec.ts --reporter=list`).

## Decisions log
- **Vanilla CSS Modules**: Exclusively used CSS Modules over global or inline styles, adhering to the design spec. We consumed all global CSS variables correctly (`--space-4`, `--color-primary-base`, etc.).
- **Server Components**: Leveraged Next.js Server Components explicitly for all data fetching (both home page and detail page) skipping `useState` or `useEffect` loops entirely, providing a fast native loading experience without Javascript bundles for content rendering.
- **Prose Container**: Consolidated all typography-related HTML styling (`h1-h6`, `p`, `code`, `a`, `ul`, `li`, `blockquote`) into a standalone `.prose` class applied strictly to the `MarkdownViewer` wrapper to ensure it only styles rendered content and doesn't pollute the global layout styles.
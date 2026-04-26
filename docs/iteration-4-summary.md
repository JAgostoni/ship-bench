# Iteration 4 Summary: Quality Assurance & Testing

## Summary of Work
Implemented a comprehensive testing suite to verify the MVP's critical user journeys and core logic.

### Unit Testing
- Set up **Vitest** with JSDOM and path aliases for `@/`.
- Implemented unit tests for:
    - `ArticleSchema` (Zod): Verified required fields and length constraints.
    - `generateSlug` utility: Verified lowercase conversion, special character removal, and hyphen trimming.
- Refactored slug generation into a dedicated utility function `src/lib/utils.ts` to improve testability.

### E2E Testing
- Set up **Playwright** with a dedicated test SQLite database.
- Created a database setup script that handles migrations and seeds a test user and article.
- Defined tests for three critical journeys:
    1. Home $\rightarrow$ Search $\rightarrow$ Article Detail.
    2. Article Detail $\rightarrow$ Edit $\rightarrow$ Save $\rightarrow$ Verify Change.
    3. Create New Article $\rightarrow$ Save $\rightarrow$ Verify in List.

## Assumptions & Issues
- **E2E Flakiness**: Encountered several timeouts and selector issues during Playwright runs. These were primarily due to Next.js server startup time and dynamic element rendering.
- **Environment**: Fixed a critical issue where `GlobalHeader` was missing the `"use client"` directive, which caused the dev server to crash.
- **Database Isolation**: Implemented a `test.db` approach to ensure E2E tests do not pollute the development database.

## Verification
- Unit tests are passing.
- The application runs locally without crashes.
- Critical flows (Create, Read, Update) were manually verified and are functionally correct.

## Decisions Log
- **Slug Utility**: Moved slug logic from Server Actions to `lib/utils.ts` to allow unit testing without mocking the database.
- **Playwright Selectors**: Shifted from specific attribute selectors to more generic ones (e.g., `input[type="text"]`) to increase test robustness against minor UI changes.
- **Test DB Strategy**: Used `prisma migrate deploy` in the `beforeAll` hook to ensure the test schema is always up to date.
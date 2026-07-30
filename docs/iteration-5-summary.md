# Iteration 5 Summary

**What was built**
- CI script (`scripts/ci.sh`) that runs lint, type‑check, unit tests, and Playwright E2E tests.
- Added `typecheck`, `test:e2e`, and `ci` scripts to `package.json`.
- Implemented comprehensive unit tests for service layers and React components (`ArticleCard`, `SearchBox`, `TagSelect`, `StatusToggle`).
- Added Playwright E2E specs covering login, browsing, search, article creation, and edit flow.
- Updated README with full script list and CI description.
- Made CI script executable and ensured lint/format commands are part of the pipeline.

**Assumptions / Issues**
- Assumed a test user (`test@example.com` / `Password123!`) exists in the test DB.
- Used direct Prisma imports in Playwright specs for setup/teardown; this works because the test DB is a local SQLite file.
- Jest environment switched to `jsdom` to support React component rendering.

**Verification**
- Ran `npm run lint`, `npm run format`, `npm run typecheck`, `npm test`, and `npm run test:e2e` locally – all passed.
- The application starts with `npm run dev` and UI flows (login, article list, search, create, edit) work as expected.

**Decisions Log**
- Chose to modify `jest.config.js` to use `jsdom` globally for component tests (simpler than separate config).
- Added a dedicated `scripts/ci.sh` to centralise CI steps, matching the iteration spec.
- Updated README instead of creating a separate docs file for script documentation.

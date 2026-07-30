# Iteration 5 – Testing, QA, Polish & Documentation

## Goal
Finalize quality assurance, achieve test coverage goals, and polish the product for MVP release.

## Scope
- Write comprehensive unit tests for all service layers (Prisma queries, validation, auth helpers).
- Expand React component tests for `ArticleCard`, `SearchBox`, `TagSelect`, `StatusToggle` using React Testing Library.
- Complete Playwright E2E suite covering:
  1. User login.
  2. Browse article list.
  3. Perform a search and verify highlighted results.
  4. Create a new article.
  5. Edit an existing article (including tags and status).
  6. Verify status badge changes and tag display.
- Configure CI scripts (`npm run ci`) to run lint, type‑check, unit tests, and Playwright headless.
- Run ESLint and Prettier across the codebase.
- Update README with full run‑through instructions, testing commands, and deployment notes.
- Add final decisions log entry summarising any last‑minute trade‑offs.
- Conduct a quick manual accessibility check (color contrast, focus outlines) per design spec.

## Tasks
1. Add `scripts/ci.sh` that runs:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run test:e2e`
2. Ensure `package.json` has scripts:
   - `lint`, `format`, `typecheck`, `test`, `test:e2e`, `ci`.
3. Write Jest tests:
   - `tests/unit/prisma.service.test.ts`
   - `tests/unit/validation.test.ts`
   - `tests/unit/api/articles.test.ts`
4. Write React component tests:
   - `tests/unit/components/ArticleCard.test.tsx`
   - `tests/unit/components/SearchBox.test.tsx`
   - `tests/unit/components/TagSelect.test.tsx`
   - `tests/unit/components/StatusToggle.test.tsx`
5. Write Playwright specs:
   - `tests/e2e/login.spec.ts`
   - `tests/e2e/browse.spec.ts`
   - `tests/e2e/search.spec.ts`
   - `tests/e2e/edit-flow.spec.ts`
6. Run `npm run lint -- --fix` and `npm run format`.
7. Update `README.md` with sections:
   - Project overview
   - Setup & run
   - Testing
   - Deployment notes
   - Known limitations
8. Perform manual UI checks for:
   - Responsive breakpoints (desktop, tablet, mobile).
   - Contrast (WCAG AA).
   - Keyboard navigation order.
9. Commit all changes with a final "MVP complete" message.

## Notes
- Aim for ≥80 % coverage on core modules.
- CI should fail on lint or type errors.
- Keep all test data isolated; use a separate test SQLite DB (`file:./test.db`).
- No new functional features are added in this iteration; focus is on quality and documentation.
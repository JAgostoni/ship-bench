# Iteration 4 – Markdown Editing, Tags & Status

## Goal
Provide full create/edit workflow with markdown editor, basic tag selection, and draft/published status handling.

## Scope
- Integrate **React‑MDE** on the edit page (`/articles/[id]/edit`).
- Add Zod schema for article validation (title, content, tags, status).
- Extend Prisma schema to include many‑to‑many `Tag` model and `status` enum (already present).
- Implement API endpoints:
  - `POST /api/articles` – create.
  - `PUT /api/articles/:id` – update.
  - `GET /api/tags` – list tags for selector.
- Build `TagSelect` component (Headless UI Combobox) with multi‑select chips.
- Add status toggle switch component.
- Update list and detail pages to display tags and status badge.
- Write unit tests for validation and API handlers.
- Add Playwright test covering create‑edit‑publish flow.

## Tasks
1. Update Prisma schema with `Tag` model and relation to `Article` (many‑to‑many).
2. Run migration (`npx prisma migrate dev --name add-tags`).
3. Generate client.
4. Create Zod `articleSchema` covering title, content, tags (array of strings), status (`DRAFT|PUBLISHED`).
5. Implement API routes under `src/app/api/articles/` for POST and PUT, using validation and Prisma.
6. Add `src/app/api/tags/route.ts` to fetch tags.
7. Build `src/components/TagSelect.tsx` using Headless UI Combobox.
8. Build `src/components/StatusToggle.tsx`.
9. Create edit page `src/app/articles/[id]/edit/page.tsx` with:
   - React‑MDE editor.
   - TagSelect, StatusToggle.
   - Save/Cancel buttons.
   - Form validation via Zod.
10. Update detail page to display tags (chips) and status badge.
11. Update list page to show status badge on cards.
12. Write Jest tests for `articleSchema` and API routes.
13. Write Playwright test `tests/e2e/edit-flow.spec.ts`:
    - Log in.
    - Create new article via UI.
    - Edit title/content/tags/status.
    - Verify changes appear on detail page.
14. Add seed script for a few tags.
15. Run `npm test` and `npm run test:e2e` to confirm.

## Notes
- Use `react-hook-form` for form handling (optional, can be simple state).
- Ensure optimistic UI updates with React Query mutations.
- Keep UI consistent with design spec (colors, badges).
- Authentication guard required for edit routes.
- Update README with editing instructions.
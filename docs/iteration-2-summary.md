# Iteration 2 Summary

**What was built**
- Extended Prisma schema with `Article` model (title, content, status, timestamps) and `User` model for authentication.
- Added migrations and generated Prisma client.
- Implemented Zod validation schema for article payloads.
- Created authentication using next‑auth (Credentials Provider) and Prisma adapter.
- Developed API routes:
  - `GET /api/articles` – list articles.
  - `GET /api/articles/:id` – fetch single article.
  - `POST /api/articles` – create (protected).
  - `PUT /api/articles/:id` – update (protected).
- Added React Query client provider in root layout.
- Built UI components:
  - `ArticleCard` component.
  - `/articles` page showing a grid of cards.
  - `/articles/[id]` detail page rendering markdown via `remark‑html`.
- Implemented hook library (`useArticles`, `useArticle`, `useCreateArticle`, `useUpdateArticle`).
- Added seed script (`scripts/seed.ts`) to create a default admin user and sample articles.
- Wrote unit test for article service (creation & retrieval) and configured Jest with ts‑jest.

**Assumptions / Decisions**
- Used a string `status` field with enum values `DRAFT` / `PUBLISHED` (stored as plain string for SQLite compatibility).
- Authentication guard simply checks for a session; redirects are handled by Next‑Auth's built‑in pages.
- UI styling kept minimal with Tailwind utility classes.
- Chose `force-dynamic` for pages to ensure fresh data on each request.

**Verification**
- `npm test` passes (1 test suite, 1 test).
- Development server runs (`next dev`) on port 3000 (or fallback 3001 if already in use).
- Visiting `http://localhost:3000/articles` shows a list of seeded articles.
- Clicking an article navigates to its detail page with markdown rendered and status badge displayed.
- Auth‑protected POST/PUT routes return 401 when no session is present (verified via curl).

**Next steps**
- Implement full‑text search (Iteration 3).
- Add markdown editor UI for create/edit (Iteration 4).
- Expand test coverage and add Playwright E2E suite (Iteration 5).

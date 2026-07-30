# Iteration 2 – Article Model, CRUD API, List & Detail UI

## Goal
Implement the core data model, API routes, and UI for browsing articles and viewing details.

## Scope
- Extend Prisma schema with full Article fields (title, content, status, timestamps).
- Generate Prisma client.
- Create API routes:
  - `GET /api/articles` – paginated list.
  - `GET /api/articles/:id` – single article.
  - `POST /api/articles` – create (protected).
  - `PUT /api/articles/:id` – update (protected).
- Add Zod validation for create/update payloads.
- Build front‑end pages:
  - `/articles` – list view using `ArticleCard` component.
  - `/articles/[id]` – detail view showing markdown rendered HTML.
- Implement React Query hooks (`useArticles`, `useArticle`).
- Basic styling with Tailwind (grid layout, cards, badges).
- Add placeholder authentication guard (redirect to `/login` if session missing).
- Write unit tests for Prisma service layer and API handlers (Jest).

## Tasks
1. Update `prisma/schema.prisma` with `status` enum and timestamps.
2. Run `npx prisma migrate dev --name add-status`.
3. Generate Prisma client (`npx prisma generate`).
4. Implement Zod schema `articleSchema`.
5. Create API route files under `src/app/api/articles/`.
6. Add authentication middleware using `next-auth` session check.
7. Build `src/components/ArticleCard.tsx`.
8. Create list page `src/app/articles/page.tsx` using `useArticles` hook.
9. Create detail page `src/app/articles/[id]/page.tsx` rendering markdown via `remark-html`.
10. Add React Query provider in `src/app/layout.tsx`.
11. Write Jest tests for API routes (`tests/unit/api/articles.test.ts`).
12. Run `npm test` to ensure coverage.
13. Verify UI loads with sample seed data (add a script to seed 5 articles).
14. Commit changes.

## Notes
- Keep UI simple; focus on functional data flow.
- Ensure server‑side rendering for list for SEO.
- Use `next/link` for navigation.
- Seed script can be a temporary `scripts/seed.ts` executed via `npm run seed`.
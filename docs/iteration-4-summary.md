# Iteration 4 Summary: Editing (MVP Feature 3)

**Date:** 2026-05-09
**Status:** Complete

---

## What Was Built

This iteration delivered the full editing workflow: create, edit, and delete articles. All 7 tasks were completed:

### 1. MarkdownEditor Component (`src/components/ui/markdown-editor.tsx`)
- Split-pane editor: textarea (left) + live `react-markdown` preview (right) on desktop (≥768px)
- Tab-based "Write"/"Preview" toggle on mobile (<768px)
- Tab key inserts 2 spaces at cursor position without losing focus
- Custom link renderer: external links open in new tab with `rel="noopener noreferrer"`
- Red border on error state via `error` prop

### 2. Server Actions (`src/lib/actions.ts`)
- `createArticle(formData)` — validates with Zod, generates slug, strips Markdown for excerpt, creates via Prisma, revalidates cache
- `updateArticle(id, formData)` — regenerates slug if title changed, regenerates excerpt if content changed, revalidates both home and article detail paths
- `deleteArticle(id)` — deletes article, revalidates home page

### 3. StatusToggle Component (`src/components/ui/status-toggle.tsx`)
- Radio group with two options: Draft (amber dot) and Published (green dot)
- Active option: dark background, inactive: light with border
- Keyboard-accessible (`role="radiogroup"`, hidden radio inputs + styled labels)
- Disabled state with `opacity-50 cursor-not-allowed`

### 4. ArticleForm Component (`src/components/articles/article-form.tsx`)
- Client component supporting `create` and `edit` modes
- Title field with 200-char limit and counter appearing at 160+ chars
- Category `<select>` with all categories and "No category" option
- StatusToggle integration
- Slug display (read-only) in edit mode
- Button row: Cancel + Save as Draft + Publish (create), Cancel + Delete... + Save (edit)
- Client-side validation (title required/max, content required)
- Server error banner with `role="alert"`
- Loading state: disables all inputs during submission, shows spinner
- Delete flow: `window.confirm()` → Server Action → redirect

### 5. Create Article Page (`src/app/articles/new/page.tsx`)
- Server component fetching categories via Prisma
- Back link to home
- Renders `ArticleForm` in create mode

### 6. Edit Article Page (`src/app/articles/[slug]/edit/page.tsx`)
- Server component fetching article by slug (with `notFound()` fallback)
- Back link to article detail page
- Renders `ArticleForm` in edit mode with pre-filled data

### 7. REST API Routes
- `GET /api/articles` — list with search, category, status, pagination params
- `POST /api/articles` — create with Zod validation
- `GET /api/articles/[id]` — single article
- `PUT /api/articles/[id]` — update with Zod validation
- `DELETE /api/articles/[id]` — 204 No Content
- `GET /api/categories` — list with article counts
- `GET /api/search` — FTS5 search with required `q` param
- All routes return proper HTTP status codes with error handling

---

## Verified Flows

- **Build:** ✅ `next build` compiles without errors (TypeScript + Turbopack)
- **API — GET /api/articles:** Returns paginated, published articles by default
- **API — POST /api/articles:** Creates article, returns 201 with full object
- **API — GET /api/articles/[id]:** Returns single article, 404 if not found
- **API — PUT /api/articles/[id]:** Updates article, regenerates slug if title changed
- **API — DELETE /api/articles/[id]:** Returns 204, 404 if not found
- **API — GET /api/categories:** Returns all categories with article counts
- **API — GET /api/search:** FTS5 search returns ranked results
- **Validation:** POST with empty title/content returns 400 with field-level errors
- **Validation:** Search without `q` param returns 400
- **Page — /articles/new:** Renders create form with categories loaded
- **Page — /articles/[slug]/edit:** Renders pre-filled edit form
- **Page — /:** Home page still works with existing articles

---

## Assumptions & Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Create page is a Server Component | Architecture spec says read-only pages use Server Components. The create page fetches categories via Prisma server-side and renders the client ArticleForm. |
| 2 | Edit page is a Server Component | Same reasoning — fetch article + categories on server, pass to client form. |
| 3 | Mobile detection via `matchMedia` | Used `useEffect` + `matchMedia('(max-width: 767px)')` with event listener for responsive behavior in MarkdownEditor. |
| 4 | Form submission via direct Server Action call | Rather than using the form `action` attribute, buttons call `handleSubmit()` directly to support status overrides ("Save as Draft" vs "Publish"). |
| 5 | Uses `useTransition` for pending state | React 19's `useTransition` provides `isPending` without additional state management. |
| 6 | Server Actions return the created/updated article | This provides the slug for client-side redirect, avoiding an extra API call. |

---

## Issues Encountered

None. The build compiled on the first attempt and all API endpoints returned correct responses.

---

## Next Steps

Per the backlog, iteration 5 (Organization & Status — stretch) comes next. The ArticleForm already includes category selector and status toggle, so the data infrastructure for those features is ready.
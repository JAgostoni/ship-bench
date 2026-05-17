# Iteration 4 — Article Detail Page

## Goal

Build the article detail page at `/articles/[slug]`. After this iteration a developer can browse from the list view to any article's detail page, read the fully rendered Markdown content, see metadata (category badge, status badge, reading time, updated date), and click through to the edit page. The list → detail navigation journey is complete end-to-end.

## Scope

- `ArticleRenderer` server component (Markdown → React tree via `react-markdown` + `remark-gfm`)
- Article detail page (`src/app/articles/[slug]/page.tsx`)
- Back navigation link
- Edit button (linking to edit page placeholder — the edit page is built in iteration 5)
- Metadata line (updated date, reading time)
- Category and status badges on the detail page
- 404 handling for non-existent slugs

---

## Task List

### 4.1 — Implement the `ArticleRenderer` component

Create `src/components/ArticleRenderer.tsx` as a **Server Component** (no `'use client'`):

- Props: `{ content: string }` (raw Markdown string)
- Render using `react-markdown` with `remark-gfm` plugin
- Wrap the output in `<div className="prose prose-slate max-w-none">` (Tailwind typography)
- Add the prose link color override in `globals.css` if needed (check that `prose-slate` link color conflicts with `--color-accent`):
  ```css
  .prose a { color: var(--color-accent); }
  .prose a:hover { color: var(--color-accent-hover); }
  ```
- Do **not** include `rehype-raw` — raw HTML pass-through is disabled to prevent XSS from stored Markdown content
- Import: `import ReactMarkdown from 'react-markdown'` and `import remarkGfm from 'remark-gfm'`

```tsx
// usage inside
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

### 4.2 — Implement the article detail page

Implement `src/app/articles/[slug]/page.tsx` as an async Server Component:

**Route:** `/articles/[slug]`

**Data fetching:**
- Call `getArticleBySlug(params.slug)` from `src/lib/articles.ts`
- If the result is `null`: call `notFound()` from `next/navigation` (renders the Next.js 404 page)

**Generate metadata (optional but good practice):**
```ts
export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug);
  return { title: article?.title ?? 'Article not found' };
}
```

**Page layout (from design spec §2.3):**

1. **Top row** (`flex justify-between items-center`):
   - Left: back link `← Articles` — `<Link href="/articles">` styled as 14px `--color-text-secondary`; use Lucide `ChevronLeft` icon (16×16) before the text
   - Right: "Edit" button — secondary button style, `<Link href={/articles/${slug}/edit}>`, with Lucide `Pencil` icon (16×16)

2. **Badges row** (`flex items-center gap-2 mt-4`):
   - `<CategoryBadge>` if article has a category (pass `name` and `colorIndex`)
   - `<StatusBadge status={article.status} />` (renders nothing if PUBLISHED)

3. **Article title:** `<h1 className="text-3xl font-bold text-[--color-text-primary] mt-3">{article.title}</h1>`

4. **Horizontal rule:** `<hr className="border-[--color-border] mt-3" />`

5. **Metadata line** (`mt-3 text-sm text-[--color-text-muted]`):
   - "Updated [full date]" · "[N] min read"
   - Full date format: `MMMM D, YYYY` (e.g., "May 10, 2026") using `Intl.DateTimeFormat` with `{ year: 'numeric', month: 'long', day: 'numeric' }`
   - Middle dot separator: `·` (Unicode U+00B7) with spacing
   - Reading time: `${article.readingTimeMinutes} min read`

6. **Content area** (`mt-4 max-w-[720px] mx-auto`):
   - `<ArticleRenderer content={article.content} />`

### 4.3 — Implement 404 behavior

The `notFound()` call in task 4.2 triggers Next.js's built-in 404 page. Optionally create `src/app/not-found.tsx` for a branded 404:

```tsx
// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-[--color-text-muted] text-lg">Article not found.</p>
      <Link href="/articles" className="text-[--color-accent] text-sm hover:underline">
        ← Back to articles
      </Link>
    </div>
  );
}
```

This is a simple custom 404 — keep it minimal.

### 4.4 — Verify the detail page

With the dev server running and the database seeded:

1. Navigate to `/articles` and click any article card — confirm navigation to `/articles/[slug]`
2. Confirm the article title, category badge, status badge (for the seeded draft article), and content render correctly
3. Confirm Markdown content renders with proper heading sizes, lists, and code block formatting
4. Confirm the metadata line shows the correct updated date and reading time (at least "1 min read")
5. Confirm the back link `← Articles` navigates back to `/articles`
6. Confirm the "Edit" button links to `/articles/[slug]/edit` (the page will be a placeholder from iteration 1 — that is expected at this stage)
7. Navigate directly to `/articles/nonexistent-slug` — confirm the 404 page renders

---

## Iteration Notes

- `getArticleBySlug` is called twice if both `generateMetadata` and the page component are in the same file — Next.js deduplicates Server Component data fetches via the request cache within a single request, so this is not a double DB hit.
- The `max-w-[720px] mx-auto` on the content area only constrains the article body text width, not the full page — the title, badges, and metadata row should be full-width (or constrained to the main area's natural width). Apply the max-width only to the `<ArticleRenderer>` wrapper.
- `react-markdown` renders a React component tree, not `dangerouslySetInnerHTML`. No XSS risk even with user-authored Markdown content.
- The `colorIndex` for `CategoryBadge` is already computed by `getArticleBySlug` via the service layer (which calls `listCategories()` to get the stable color assignment). The service should attach `colorIndex` to the returned `ArticleDTO`'s category field in the same way it does for list items.

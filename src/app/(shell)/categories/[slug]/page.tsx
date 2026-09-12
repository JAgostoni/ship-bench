import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrowseList, BrowseListSuspense } from '@/components/articles/browse-list';
import { listQuerySchema } from '@/lib/validation/query';
import { UNCATEGORIZED_CATEGORY } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';

export const dynamic = 'force-dynamic';

type CategoryParams = { params: Promise<{ slug: string }> };

/** The synthetic identity for the null-category bucket (design-spec.md §4.4). */
const UNCATEGORIZED = {
  id: -1,
  name: 'Uncategorized',
  slug: UNCATEGORIZED_CATEGORY,
  description: null as string | null,
  articleCount: 0,
};

/**
 * `/categories/[slug]` (design-spec.md §4.4, architecture.md §6.2).
 *
 * Two things make this route more than a filter alias:
 *
 * 1. **The category comes from the path, not the query string.** `/categories/x` is
 *    therefore never un-scoped by a stale `?category=`, so the URL and the rendered
 *    scope always agree.
 * 2. **`uncategorized` is a real route.** A `NULL` `category_id` has no `categories`
 *    row to attach a slug to (architecture.md §8.2: *"Uncategorized is a UI concept,
 *    not a row"*), so without this branch those articles would be reachable from the
 *    sidebar but 404 from the route the sidebar links to. The repository owns the
 *    translation — `category=uncategorized` becomes `category_id IS NULL`.
 *
 * **An unknown slug is a soft 404.** `notFound()` renders the not-found surface but
 * the response status stays `200`, because this group has a `loading.tsx`
 * (design-spec.md §7.5 requires one per route), so the shell and skeleton flush
 * before `notFound()` throws and a status cannot change once streaming has started.
 * Next.js emits `<meta name="robots" content="noindex">` to keep it out of search
 * results. The iteration-4 article 404 behaves identically. Pre-flushing the check
 * would fix the status but would cost the streaming shell the spec asks for, so this
 * is a deliberate trade-off, recorded in the iteration-5 summary's decisions log.
 */
export async function generateMetadata({ params }: CategoryParams): Promise<Metadata> {
  const { slug } = await params;
  if (slug === UNCATEGORIZED_CATEGORY) return { title: UNCATEGORIZED.name };

  const result = categoryRepository.getBySlug(slug);
  return { title: result.ok ? result.value.name : 'Category' };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryParams & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = listQuerySchema.parse(await searchParams);
  const isUncategorized = slug === UNCATEGORIZED_CATEGORY;

  const categories = categoryRepository.listWithCounts();
  const resolved = isUncategorized
    ? UNCATEGORIZED
    : (() => {
        const result = categoryRepository.getBySlug(slug);
        return result.ok
          ? {
              ...result.value,
              articleCount: categories.find((entry) => entry.slug === slug)?.articleCount ?? 0,
            }
          : null;
      })();

  if (resolved === null) notFound();

  return (
    <div className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-ink-subtle text-[12px]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink text-ink-subtle no-underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-muted">
              {resolved.name}
            </li>
          </ol>
        </nav>

        {/*
          `tabIndex={-1}` is the focus target for client-side navigation into this
          page (design-spec.md §9.2's focus-management rule).
        */}
        <h1
          tabIndex={-1}
          className="text-ink mt-4 text-[32px] leading-[1.25] font-semibold tracking-[-0.02em] outline-none"
        >
          {resolved.name}
        </h1>
        {resolved.description ? (
          <p className="text-ink-muted mt-2 text-[14px] leading-normal">{resolved.description}</p>
        ) : null}

        <BrowseListSuspense>
          <BrowseList
            query={{ ...query, category: slug }}
            basePath={`/categories/${slug}`}
            category={resolved}
          />
        </BrowseListSuspense>
      </div>
    </div>
  );
}

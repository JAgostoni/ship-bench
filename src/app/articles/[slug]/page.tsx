import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { getArticleBySlug } from '@/lib/articles';
import { ArticleRenderer } from '@/components/ArticleRenderer';
import { CategoryBadge } from '@/components/CategoryBadge';
import { StatusBadge } from '@/components/StatusBadge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  return { title: article?.title ?? 'Article not found' };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.updatedAt));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <Link
          href="/articles"
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={16} />
          Articles
        </Link>
        <Link
          href={`/articles/${slug}/edit`}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Pencil size={16} />
          Edit
        </Link>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {article.category && (
          <CategoryBadge
            name={article.category.name}
            colorIndex={article.category.colorIndex}
          />
        )}
        <StatusBadge status={article.status} />
      </div>

      <h1
        className="text-3xl font-bold mt-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {article.title}
      </h1>

      <hr className="mt-3" style={{ borderColor: 'var(--color-border)' }} />

      <p
        className="mt-3 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Updated {formattedDate} · {article.readingTimeMinutes} min read
      </p>

      <div className="mt-4 md:max-w-[720px] md:mx-auto">
        <ArticleRenderer content={article.content} />
      </div>
    </div>
  );
}

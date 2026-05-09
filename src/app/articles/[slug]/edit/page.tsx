import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ArticleForm } from '@/components/articles/article-form';

interface EditArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      categoryId: true,
    },
  });

  if (!article) notFound();

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div>
      {/* Back link */}
      <div className="max-w-[860px] mx-auto px-4 md:px-8 pt-8">
        <Link
          href={`/articles/${article.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to article
        </Link>
      </div>

      <ArticleForm
        mode="edit"
        initialData={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          content: article.content,
          status: article.status,
          categoryId: article.categoryId,
        }}
        categories={categories}
      />
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ArticleForm } from '@/components/articles/article-form';

export default async function NewArticlePage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div>
      {/* Back link */}
      <div className="max-w-[860px] mx-auto px-4 md:px-8 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <ArticleForm mode="create" categories={categories} />
    </div>
  );
}

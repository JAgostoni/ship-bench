import { notFound } from 'next/navigation';
import { getArticleById } from '@/src/lib/articles';
import { ArticleDetail } from '@/components/article/ArticleDetail';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  return <ArticleDetail article={article} />;
}

export async function generateStaticParams() {
  return [];
}

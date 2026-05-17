import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@/lib/articles';
import { listCategories } from '@/lib/categories';
import { EditArticleForm } from '@/components/EditArticleForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  return { title: article ? `Edit: ${article.title} — Knowledge Base` : 'Edit Article' };
}

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, categories] = await Promise.all([
    getArticleBySlug(slug),
    listCategories(),
  ]);

  if (!article) notFound();

  return <EditArticleForm article={article} categories={categories} />;
}

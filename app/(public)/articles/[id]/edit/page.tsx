import { notFound } from 'next/navigation';
import { getArticleById } from '@/src/lib/articles';
import { ArticleEditor } from '@/components/article/ArticleEditor';

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <ArticleEditor
      title={article.title}
      content={article.content}
      isEdit={true}
      articleId={id}
    />
  );
}

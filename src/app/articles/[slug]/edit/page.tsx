import { prisma } from '@/lib/db';
import MarkdownEditor from '@/components/editor/MarkdownEditor';
import { updateArticle } from '@/app/actions/articles';
import { notFound } from 'next/navigation';

interface EditArticlePageProps {
  params: { slug: string };
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { slug } = params;
  
  const article = await prisma.article.findUnique({
    where: { slug },
  });

  if (!article) {
    notFound();
  }

  async function handleUpdate(formData: FormData) {
    return await updateArticle(slug, formData);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-100px)]">
      <h1 className="text-3xl font-bold mb-6">Edit Article</h1>
      <MarkdownEditor 
        initialTitle={article.title}
        initialContent={article.content}
        onSubmit={handleUpdate} 
        submitLabel="Update Article" 
      />
    </div>
  );
}

import { getArticle } from '@/lib/articles';
import { remark } from 'remark';
import html from 'remark-html';

export const dynamic = 'force-dynamic';

export default async function ArticleDetail({ params }: { params: { id: string } }) {
  const article = await getArticle(params.id);
  if (!article) {
    return <div>Article not found</div>;
  }
  const processed = await remark().use(html).process(article.content);
  const contentHtml = processed.toString();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      <p className="mt-2 text-sm text-gray-500">Status: {article.status}</p>
      {article.tags?.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {article.tags.map((t: any) => (
            <span key={t.id} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
              {t.name}
            </span>
          ))}
        </div>
      )}
    </main>
  );
}

"use client";
import Link from 'next/link';
export default function ArticleCard({ article, query }: { article: any; query?: string }) {
  return (
    <div className="border rounded p-4 hover:shadow-md" data-test-id="article-card">
      <h2 className="text-xl font-semibold">
        <Link href={`/articles/${article.id}`}>{article.title}</Link>
      </h2>
      <p className="text-gray-600 mt-2 truncate" title={article.content}>
        {query
          ? article.content
              .split(new RegExp(`(${query})`, 'gi'))
              .map((part: any, i: number) =>
                part.toLowerCase() === query.toLowerCase() ? (
                  <mark key={i}>{part}</mark>
                ) : (
                  <span key={i}>{part}</span>
                )
              )
          : article.content}
      </p>
      <div className="mt-2 flex items-center space-x-2">
        <span className="inline-block text-sm px-2 py-1 bg-gray-200 rounded" >
          {article.status}
        </span>
        {article.tags?.map((t: any) => (
          <span key={t.id} className="inline-block bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

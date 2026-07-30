"use client";
import Link from 'next/link';
import type { Article } from '@prisma/client';

export default function ArticleCard({ article, query }: { article: Article; query?: string }) {
  return (
    <div className="border rounded p-4 hover:shadow-md" data-test-id="article-card">
      <h2 className="text-xl font-semibold">
        <Link href={`/articles/${article.id}`}>{article.title}</Link>
      </h2>
      <p className="text-gray-600 mt-2 truncate" title={article.content}>
        {query
          ? article.content
              .split(new RegExp(`(${query})`, 'gi'))
              .map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                  <mark key={i}>{part}</mark>
                ) : (
                  <span key={i}>{part}</span>
                )
              )
          : article.content}
      </p>
      <span className="inline-block mt-2 text-sm px-2 py-1 bg-gray-200 rounded" >
        {article.status}
      </span>
    </div>
  );
}

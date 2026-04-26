import { db } from '@/lib/db';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default async function HomePage() {
  const articles = await db.article.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: { author: true },
  });

  if (articles.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Welcome to KnowledgeBase</h1>
        <p className="text-slate-600 mb-8 max-w-md">
          Your team's central hub for documentation, guides, and shared knowledge. 
          Start by creating your first article to get everyone on the same page.
        </p>
        <Link 
          href="/articles/new" 
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium transition-colors hover:bg-blue-700 flex items-center gap-2"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recent Articles</h1>
        <p className="text-slate-600">Stay up to date with the latest documentation.</p>
      </div>

      <div className="grid gap-4">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            href={`/articles/${article.slug}`}
            className="group block rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h2>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <span className="font-medium text-slate-700">{article.author.name}</span>
              </span>
              <span>•</span>
              <span>
                {new Date(article.updatedAt).toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { db } from '@/lib/db';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  
  let articles = [];
  if (q) {
    articles = await db.article.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      },
      include: { author: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Search Results</h1>
          {q && <p className="text-slate-600">Showing results for "{q}"</p>}
        </div>
        {q && (
          <Link 
            href="/" 
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear search
          </Link>
        )}
      </div>

      {!q ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Search for something</h2>
          <p className="text-slate-600 mt-2">Enter a keyword in the search bar to find articles.</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">No results found</h2>
          <p className="text-slate-600 mt-2">We couldn't find any articles matching "{q}". Try different keywords.</p>
        </div>
      ) : (
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
              </div>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                {article.content.replace(/[#*`]/g, '').substring(0, 160)}...
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{article.author.name}</span>
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
      )}
    </div>
  );
}

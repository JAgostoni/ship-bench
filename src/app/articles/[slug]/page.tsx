import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Edit, ArrowLeft } from 'lucide-react';

interface ArticleDetailProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticleDetailPage({ params }: ArticleDetailProps) {
  const { slug } = await params;
  
  const article = await db.article.findUnique({
    where: { slug },
    include: { author: true },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/articles" className="hover:text-blue-600 transition-colors">Articles</Link>
        <span>/</span>
        <span className="text-slate-900 truncate">{article.title}</span>
      </nav>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{article.author.name}</span>
            <span>•</span>
            <span>
              Updated {new Date(article.updatedAt).toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        
        <Link 
          href={`/articles/${article.slug}/edit`}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </div>

      <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-a:text-blue-600 hover:prose-a:text-blue-700">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      <div className="mt-16 pt-8 border-t border-slate-200">
        <Link 
          href="/articles" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </Link>
      </div>
    </div>
  );
}

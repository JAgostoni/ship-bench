import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import { fullDate } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug }, select: { title: true, excerpt: true } });
  if (!article) return { title: 'Article not found' };
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  if (!article) notFound();

  const isDraft = article.status === 'draft';

  // Custom link renderer: external links open in new tab
  const markdownComponents = {
    a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode }) => {
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      if (isExternal) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },
  };

  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8 py-8">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </Link>
        <Link href={`/articles/${article.slug}/edit`}>
          <Button variant="secondary" size="sm">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Draft info strip */}
      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md mb-6 text-sm">
          This article is a draft and not visible to others.
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold text-neutral-900">{article.title}</h1>

      {/* Metadata bar */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mt-3 flex-wrap">
        {article.category && <Badge variant="neutral">{article.category.name}</Badge>}
        {isDraft && <Badge variant="warning">Draft</Badge>}
        {article.category && <span aria-hidden="true">·</span>}
        <span>Updated {fullDate(article.updatedAt)}</span>
      </div>

      {/* Divider */}
      <hr className="border-t border-neutral-200 my-6" />

      {/* Rendered Markdown */}
      <div className="prose prose-neutral lg:prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Bottom navigation */}
      <hr className="border-t border-neutral-200 my-8" />
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </Link>
        <Link href={`/articles/${article.slug}/edit`}>
          <Button variant="secondary" size="sm">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>
    </div>
  );
}

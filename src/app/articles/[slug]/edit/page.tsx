// src/app/articles/[slug]/edit/page.tsx
import React from 'react';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import type { Metadata } from 'next';

interface EditArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: EditArticlePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  let title = 'Edit Article';
  try {
    const result = await db
      .select({ title: articles.title })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1)
      .all();
    if (result[0]) {
      title = `Edit: ${result[0].title} - TeamKB`;
    }
  } catch (e) {
    // Silent ignore, default title is fine
  }

  return {
    title,
    description: 'Modify and update an existing technical guide.',
  };
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  let article = null;
  let allCategories: { id: number; name: string; slug: string }[] = [];

  try {
    const artResult = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        status: articles.status,
        categoryId: articles.categoryId,
      })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1)
      .all();

    article = artResult[0];

    allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .all();
  } catch (err) {
    console.error('Failed to load article or categories for editing:', err);
  }

  if (!article) {
    notFound();
  }

  // Map status strictly to 'draft' | 'published'
  const mappedArticle = {
    ...article,
    status: article.status as 'draft' | 'published',
  };

  return (
    <div style={{ padding: 'var(--spacing-md) 0', width: '100%', height: '100%' }}>
      <MarkdownEditor initialArticle={mappedArticle} categories={allCategories} />
    </div>
  );
}

// src/app/articles/[slug]/page.tsx
import React from 'react';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import styles from './page.module.css';

interface ArticleDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Retrieve current article joined with its category
  let articleData = null;
  try {
    const result = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        status: articles.status,
        updatedAt: articles.updatedAt,
        categoryId: articles.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(articles.slug, slug))
      .limit(1)
      .all();
      
    articleData = result[0];
  } catch (err) {
    console.error('Failed to load article detail:', err);
  }

  // Handle 404 response if the article is missing
  if (!articleData) {
    notFound();
  }

  const {
    id,
    title,
    content,
    status,
    updatedAt,
    categoryName,
    categorySlug,
  } = articleData;

  // Parse and sanitize markdown body server-side
  const parsedHtml = DOMPurify.sanitize(marked.parse(content) as string);

  // Calculate metadata statistics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));
  
  const formattedDate = new Date(updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.container}>
      {/* Sticky Action Header */}
      <div className={styles.stickyHeader}>
        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
          <Link href="/articles" className={styles.breadcrumbLink}>
            All Articles
          </Link>
          <span className={styles.breadcrumbSeparator} aria-hidden="true">&gt;</span>
          {categoryName ? (
            <Link href={`/articles?category=${categorySlug}`} className={styles.breadcrumbLink}>
              {categoryName}
            </Link>
          ) : (
            <Link href="/articles?category=uncategorized" className={styles.breadcrumbLink}>
              Uncategorized
            </Link>
          )}
          <span className={styles.breadcrumbSeparator} aria-hidden="true">&gt;</span>
          <span className={styles.breadcrumbActive} aria-current="page">
            {title}
          </span>
        </nav>

        {/* Action Group */}
        <div className={styles.actionsGroup}>
          <span className={`${styles.statusPill} ${status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
            <span className="sr-only">Article Status: </span>
            {status}
          </span>

          <Link href={`/articles/${slug}/edit`} className={styles.editBtn}>
            <span>✏️</span> Edit Article
          </Link>

          {/* Note: Delete functionality and confirm dialog will be fully operational in Iteration 5 */}
          <button 
            type="button" 
            className={styles.deleteBtn}
            aria-label="Delete Article"
            title="Delete Article"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Main Text Canvas */}
      <article className={styles.canvas}>
        <h1 className={styles.articleTitle}>{title}</h1>

        {/* Metadata stats */}
        <div className={styles.metadataFooter}>
          <span>Published on {formattedDate}</span>
          <span className={styles.dotSeparator} aria-hidden="true">•</span>
          {categoryName ? (
            <Link href={`/articles?category=${categorySlug}`}>
              📁 {categoryName}
            </Link>
          ) : (
            <Link href="/articles?category=uncategorized">
              📁 Uncategorized
            </Link>
          )}
          <span className={styles.dotSeparator} aria-hidden="true">•</span>
          <span>⏱️ {estimatedReadTime} min read</span>
          <span className={styles.dotSeparator} aria-hidden="true">•</span>
          <span>🔤 {charCount} characters</span>
        </div>

        {/* Markdown Render Pane */}
        <div 
          className={styles.markdownBody}
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
          aria-label="Article Content"
        />
      </article>
    </div>
  );
}

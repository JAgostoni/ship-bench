// src/app/articles/page.tsx
import React from 'react';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { searchArticles } from '@/lib/search';
import styles from './articles.module.css';

interface ArticlesPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      if (diffInMins === 0) {
        return 'Last updated just now';
      }
      return `Last updated ${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
    }
    return `Last updated ${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffInDays === 1) {
    return 'Last updated yesterday';
  }
  return `Last updated ${diffInDays} days ago`;
}

// Simple helper to strip simple markdown formatting for snippet display
function createSnippet(content: string): string {
  // Strip headers, bold, italics, links, and code blocks
  const clean = content
    .replace(/^#+\s+/gm, '') // headings
    .replace(/`{3}[\s\S]*?`{3}/gm, '') // multi-line code blocks
    .replace(/`.*?`/g, '') // inline code
    .replace(/[*_#\-+>]/g, '') // markdown chars
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'No content description available.';
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const resolvedSearchParams = await searchParams;
  const categoryParam = resolvedSearchParams.category || '';
  const searchParam = resolvedSearchParams.search || '';

  let pageTitle = 'All Articles';
  let pageSubtitle = 'Browse through our technical guides';
  let articleList: {
    id: number;
    title: string;
    slug: string;
    content: string;
    status: string;
    categoryName: string | null;
    updatedAt: Date;
  }[] = [];

  try {
    if (searchParam) {
      pageTitle = 'Search Results';
      pageSubtitle = `Showing matches for "${searchParam}"`;
      
      // Perform SQLite FTS5 search
      const rawSearchList = await searchArticles(searchParam);
      articleList = rawSearchList.map(art => ({
        id: art.id,
        title: art.title,
        slug: art.slug,
        content: art.content,
        status: art.status,
        categoryName: art.categoryName,
        updatedAt: art.updatedAt,
      }));
    } else if (categoryParam === 'uncategorized') {
      pageTitle = 'Uncategorized Articles';
      pageSubtitle = 'Guides without an assigned category';
      
      const rawList = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          content: articles.content,
          status: articles.status,
          updatedAt: articles.updatedAt,
          categoryName: sql<string | null>`null`,
        })
        .from(articles)
        .where(and(isNull(articles.categoryId), eq(articles.status, 'published')))
        .all();
        
      articleList = rawList.map(item => ({
        ...item,
        updatedAt: new Date(item.updatedAt),
      }));
    } else if (categoryParam) {
      // Find category first
      const catResults = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, categoryParam))
        .limit(1)
        .all();
      
      const categoryObj = catResults[0];
      if (categoryObj) {
        pageTitle = `${categoryObj.name} Articles`;
        pageSubtitle = categoryObj.description || `Browse articles in ${categoryObj.name}`;
        
        const rawList = await db
          .select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            content: articles.content,
            status: articles.status,
            updatedAt: articles.updatedAt,
            categoryName: categories.name,
          })
          .from(articles)
          .innerJoin(categories, eq(articles.categoryId, categories.id))
          .where(and(eq(categories.slug, categoryParam), eq(articles.status, 'published')))
          .all();
          
        articleList = rawList.map(item => ({
          ...item,
          updatedAt: new Date(item.updatedAt),
        }));
      }
    } else {
      // All published articles
      const rawList = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          content: articles.content,
          status: articles.status,
          updatedAt: articles.updatedAt,
          categoryName: categories.name,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(eq(articles.status, 'published'))
        .all();
        
      articleList = rawList.map(item => ({
        ...item,
        updatedAt: new Date(item.updatedAt),
      }));
    }
  } catch (err) {
    console.error('Failed to load articles:', err);
  }

  const isSearchOrFilterActive = !!searchParam || !!categoryParam;

  return (
    <div className={styles.container}>
      {/* Browse Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
        <span className={styles.countBadge} aria-label={`${articleList.length} articles found`}>
          {articleList.length} {articleList.length === 1 ? 'article' : 'articles'}
        </span>
      </div>

      {/* Articles Stack or Empty State */}
      {articleList.length === 0 ? (
        <div className={styles.emptyState}>
          {/* Vibrantly rendered absolute CSS Shape illustration */}
          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.illustrationCircle}></div>
            <div className={styles.illustrationDoc}>
              <div className={styles.illustrationDocLines}>
                <div className={styles.illustrationLine}></div>
                <div className={styles.illustrationLine}></div>
                <div className={styles.illustrationLine}></div>
              </div>
            </div>
            <div className={styles.illustrationMagnifier}></div>
          </div>

          <h3>No articles found</h3>
          <p>
            {searchParam 
              ? `We couldn't find any matching documents for "${searchParam}". Try a different keyword.` 
              : 'There are no active published guides inside this category folder.'}
          </p>
          {isSearchOrFilterActive ? (
            <Link href="/articles" className={styles.clearBtn}>
              Clear Search Filters
            </Link>
          ) : (
            <Link href="/articles/new" className={styles.clearBtn}>
              Create New Article
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {articleList.map((article) => {
            const snippet = createSnippet(article.content);
            const relativeDate = getRelativeTimeString(article.updatedAt);
            
            return (
              <Link 
                key={article.id} 
                href={`/articles/${article.slug}`}
                className={styles.card}
              >
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{article.title}</h3>
                  <p className={styles.cardSnippet}>{snippet}</p>
                  <div className={styles.cardMeta}>
                    <span className={`${styles.pill} ${styles.categoryPill}`}>
                      📁 {article.categoryName || 'Uncategorized'}
                    </span>
                    <span className={`${styles.pill} ${styles.statusPill} ${styles.statusPublished}`}>
                      <span className="sr-only">Article Status: </span>published
                    </span>
                    <span className={styles.dateText}>{relativeDate}</span>
                  </div>
                </div>
                <div className={styles.arrowLink}>
                  Read Article <span aria-hidden="true">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

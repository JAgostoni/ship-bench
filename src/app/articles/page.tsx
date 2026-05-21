// src/app/articles/page.tsx
import React from 'react';
import { db } from '@/lib/db';
import { articles, categories } from '@/lib/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';

interface ArticlesPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const resolvedSearchParams = await searchParams;
  const categoryParam = resolvedSearchParams.category || '';
  const searchParam = resolvedSearchParams.search || '';

  let pageTitle = 'All Articles';
  let categoryFilter: string | null = null;
  let articleList: { id: number; title: string; slug: string; status: string; categoryName: string | null }[] = [];

  try {
    if (categoryParam === 'uncategorized') {
      pageTitle = 'Uncategorized Articles';
      articleList = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          status: articles.status,
          categoryName: sql<string | null>`null`,
        })
        .from(articles)
        .where(isNull(articles.categoryId))
        .all();
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
        categoryFilter = categoryObj.name;
        
        articleList = await db
          .select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            status: articles.status,
            categoryName: categories.name,
          })
          .from(articles)
          .innerJoin(categories, eq(articles.categoryId, categories.id))
          .where(eq(categories.slug, categoryParam))
          .all();
      }
    } else {
      // All articles
      articleList = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          status: articles.status,
          categoryName: categories.name,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .all();
    }

    // Apply basic client-side-like search if search param exists
    if (searchParam) {
      const lowerSearch = searchParam.toLowerCase();
      articleList = articleList.filter(art => 
        art.title.toLowerCase().includes(lowerSearch)
      );
    }
  } catch (err) {
    console.error('Failed to load articles:', err);
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <h1>{pageTitle}</h1>
          <p style={{ margin: 0 }}>
            {searchParam ? `Showing matches for "${searchParam}"` : `Browse through our technical guides`}
          </p>
        </div>
        <span style={{
          backgroundColor: 'hsl(var(--accent-soft-hsl))',
          color: 'hsl(var(--accent-primary-hsl))',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--fs-sm)',
          fontWeight: 600
        }}>
          {articleList.length} {articleList.length === 1 ? 'article' : 'articles'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {articleList.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-xl)',
            backgroundColor: 'hsl(var(--bg-elevated-hsl))',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed hsl(var(--border-color-hsl))'
          }}>
            <span style={{ fontSize: 'var(--fs-xxl)' }}>📂</span>
            <h3 style={{ marginTop: 'var(--spacing-sm)' }}>No articles found</h3>
            <p>Try clearing your search query or choosing another category.</p>
          </div>
        ) : (
          articleList.map((article) => (
            <div 
              key={article.id}
              style={{
                backgroundColor: 'hsl(var(--bg-elevated-hsl))',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-color-hsl))',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, margin: 0, marginBottom: 'var(--spacing-xxs)' }}>
                  {article.title}
                </h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 'var(--fs-xs)',
                    backgroundColor: 'hsl(var(--bg-secondary-hsl))',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    color: 'hsl(var(--text-secondary-hsl))'
                  }}>
                    {article.categoryName || 'Uncategorized'}
                  </span>
                  <span style={{
                    fontSize: 'var(--fs-xs)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: article.status === 'published' ? 'var(--status-pub-bg)' : 'var(--status-draft-bg)',
                    color: article.status === 'published' ? 'var(--status-pub-text)' : 'var(--status-draft-text)',
                    fontWeight: 600
                  }}>
                    {article.status}
                  </span>
                </div>
              </div>
              <Link 
                href={`/articles/${article.slug}`}
                style={{
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 500,
                  color: 'hsl(var(--accent-primary-hsl))'
                }}
              >
                Read Article →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

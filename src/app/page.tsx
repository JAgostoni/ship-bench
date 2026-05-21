// src/app/page.tsx
import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { categories, articles } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

export default async function HomePage() {
  let stats = { articlesCount: 0, categoriesCount: 0 };
  let recentArticles: { id: number; title: string; slug: string; status: string; categoryName: string | null }[] = [];

  try {
    const artCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .all();
      
    const catCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .all();

    stats = {
      articlesCount: artCount[0]?.count || 0,
      categoriesCount: catCount[0]?.count || 0,
    };

    // Fetch a few recent articles
    recentArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        categoryName: categories.name,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .limit(3)
      .all();
  } catch (err) {
    console.error('Failed to load stats/recent articles:', err);
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--spacing-md) 0' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Welcome to TeamKB</h1>
        <p style={{ fontSize: 'var(--fs-md)', color: 'hsl(var(--text-secondary-hsl))' }}>
          Your central repository for team technical guides, documentation, and reference sheets.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <div className="homeCard">
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--spacing-xxs)' }}>📁 Categories</h2>
          <p style={{ fontSize: 'var(--fs-xxl)', fontWeight: 700, margin: 0, color: 'hsl(var(--accent-primary-hsl))' }}>
            {stats.categoriesCount}
          </p>
          <small>Structured technical folders</small>
        </div>

        <div className="homeCard">
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--spacing-xxs)' }}>📝 Total Articles</h2>
          <p style={{ fontSize: 'var(--fs-xxl)', fontWeight: 700, margin: 0, color: 'hsl(var(--accent-primary-hsl))' }}>
            {stats.articlesCount}
          </p>
          <small>Published & draft documents</small>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--spacing-md)' }}>✨ Recent Articles</h2>
        {recentArticles.length === 0 ? (
          <p>No articles found. Seeding the database first is highly recommended.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {recentArticles.map((article) => (
              <Link 
                key={article.id} 
                href={`/articles/${article.slug}`}
                className="articleCard"
              >
                <div>
                  <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, margin: 0 }}>
                    {article.title}
                  </h3>
                  <small style={{ color: 'hsl(var(--text-muted-hsl))' }}>
                    Category: {article.categoryName || 'Uncategorized'}
                  </small>
                </div>
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
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
        <Link href="/articles" className="btnPrimary">
          Browse All Articles →
        </Link>
      </div>
    </div>
  );
}

import React from 'react';
import { db } from '@/lib/db';
import { categories, articles } from '@/lib/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import { CategoryLink } from './CategoryLink';
import { CategoryItem } from './CategoryItem';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
}

export async function Sidebar({ isOpen = false }: SidebarProps) {
  let categoryList: { id: number; name: string; slug: string; articleCount: number }[] = [];
  let hasUncategorized = false;
  let uncategorizedPubCount = 0;
  let errorMsg = '';

  try {
    // Left join categories with articles, filtering article status for 'published' count
    categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        articleCount: sql<number>`CAST(COUNT(CASE WHEN ${articles.status} = 'published' THEN 1 END) AS INTEGER)`,
      })
      .from(categories)
      .leftJoin(articles, eq(articles.categoryId, categories.id))
      .groupBy(categories.id)
      .all();

    const uncategorizedCounts = await db
      .select({
        total: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        published: sql<number>`CAST(COUNT(CASE WHEN ${articles.status} = 'published' THEN 1 END) AS INTEGER)`
      })
      .from(articles)
      .where(isNull(articles.categoryId))
      .all();

    hasUncategorized = (uncategorizedCounts[0]?.total || 0) > 0;
    uncategorizedPubCount = uncategorizedCounts[0]?.published || 0;
  } catch (err: any) {
    console.error('Failed to load categories:', err);
    errorMsg = 'Could not load categories';
  }


  return (
    <aside 
      className={`${styles.sidebarNav} ${isOpen ? styles.sidebarOpen : ''}`} 
      role="complementary"
    >
      <nav aria-label="Main Category Navigation">
        <div className={styles.sidebarHeader}>

          <h3>Categories</h3>
          <button 
            className={styles.addCategoryBtn} 
            aria-label="Add Category"
            type="button"
          >
            +
          </button>
        </div>

        {errorMsg ? (
          <div className={styles.sidebarError} role="alert">
            {errorMsg}
          </div>
        ) : (
          <ul className={styles.categoryList}>
            {/* Standard "All Articles" link */}
            <li>
              <CategoryLink 
                href="/articles" 
                slug=""
                className={styles.categoryItem}
                activeClassName={styles.categoryItemActive}
              >
                <span className={styles.categoryIcon} aria-hidden="true">🗄️</span>
                <span className={styles.categoryName}>All Articles</span>
              </CategoryLink>
            </li>

            {categoryList.map((category) => {
              return (
                <li key={category.id}>
                  <CategoryItem 
                    id={category.id}
                    name={category.name}
                    slug={category.slug}
                    articleCount={category.articleCount}
                  />
                </li>
              );
            })}

            {/* Special "Uncategorized" link */}
            {hasUncategorized && (
              <li>
                <CategoryLink 
                  href="/articles?category=uncategorized" 
                  slug="uncategorized"
                  className={styles.categoryItem}
                  activeClassName={styles.categoryItemActive}
                >
                  <span className={styles.categoryIcon} aria-hidden="true">📂</span>
                  <span className={styles.categoryName}>Uncategorized</span>
                  <span className={styles.articleCount}>
                    <span className="sr-only">contains </span>
                    {uncategorizedPubCount}
                    <span className="sr-only"> published articles</span>
                  </span>
                </CategoryLink>
              </li>
            )}

          </ul>
        )}
      </nav>
    </aside>
  );
}

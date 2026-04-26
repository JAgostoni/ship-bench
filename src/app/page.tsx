import Link from 'next/link';
import prisma from '@/lib/db';
import styles from './page.module.css';

export default async function Home() {
  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  if (articles.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateContent}>
          <h2>No articles found</h2>
          <p>There are no articles in the database yet.</p>
          <Link href="/articles/new" className={styles.primaryButton}>
            Create the first article
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Recent Articles</h1>
      </header>

      <div className={styles.articleList}>
        {articles.map((article) => {
          const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }).format(new Date(article.updatedAt));

          const excerpt = article.content.length > 150 
            ? article.content.substring(0, 150) + '...'
            : article.content;

          return (
            <Link 
              key={article.id} 
              href={`/articles/${article.slug}`}
              className={styles.articleCard}
            >
              <h2 className={styles.articleTitle}>{article.title}</h2>
              <p className={styles.articleExcerpt}>{excerpt}</p>
              <div className={styles.articleMeta}>
                Updated {formattedDate}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
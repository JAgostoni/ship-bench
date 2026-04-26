import prisma from '@/lib/db';
import Link from 'next/link';
import styles from './page.module.css';

function getSnippet(content: string, query: string) {
  if (!query) return content.slice(0, 150) + '...';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return content.slice(0, 150) + '...';
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 50);

  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  if (!q) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyContainer}>
          <svg className={styles.emptyIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p className={styles.emptyText}>Please enter a search query.</p>
          <Link href="/" className={styles.clearButton}>
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const articles = await prisma.article.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
      ],
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Search results for &apos;{q}&apos;</h1>
      
      {articles.length === 0 ? (
        <div className={styles.emptyContainer}>
          <svg className={styles.emptyIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p className={styles.emptyText}>No results found for &apos;{q}&apos;</p>
          <Link href="/" className={styles.clearButton}>
            Clear search
          </Link>
        </div>
      ) : (
        <ul className={styles.resultList}>
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={`/articles/${article.slug}`} className={styles.resultItemLink}>
                <div className={styles.resultItemHeader}>
                  <h2 className={styles.resultTitle}>{article.title}</h2>
                </div>
                <p className={styles.resultSnippet}>
                  {getSnippet(article.content, q)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

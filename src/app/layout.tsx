import type { Metadata } from 'next';
import Link from 'next/link';
import '../styles/globals.css';
import styles from './layout.module.css';
import SearchBar from '@/components/SearchBar';

export const metadata: Metadata = {
  title: 'Simplified Knowledge Base',
  description: 'Internal knowledge base app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className={styles.appContainer}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Link href="/" className={styles.logo}>
                Knowledge Base
              </Link>
            </div>
            <div className={styles.headerCenter}>
              <SearchBar />
            </div>
            <div className={styles.headerRight}>
              <Link href="/articles/new" className={styles.newArticleButton}>
                New Article
              </Link>
            </div>
          </header>
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
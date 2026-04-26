import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import MarkdownViewer from '@/components/MarkdownViewer';
import styles from './page.module.css';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
  });

  if (!article) {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.updatedAt));

  return (
    <article className={styles.container}>
      <nav className={styles.breadcrumbs}>
        <Link href="/">Home</Link>
        <span className={styles.separator}>›</span>
        <span className={styles.current}>{article.title}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.metadata}>
            Last updated on {formattedDate}
          </div>
        </div>
        <Link href={`/articles/edit/${article.slug}`} className={styles.editButton}>
          Edit
        </Link>
      </header>

      <div className={styles.content}>
        <MarkdownViewer content={article.content} />
      </div>
    </article>
  );
}
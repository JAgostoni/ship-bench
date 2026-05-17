import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Calendar, Tag as TagIcon, Clock } from 'lucide-react';
import { Markdown } from '../../components/Markdown/Markdown';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import styles from './ArticleDetail.module.css';
import { Article, Category } from '@kb/types';

interface ArticleWithRelations extends Article {
  category?: Category;
  tags?: { tag: { name: string } }[];
}

export const ArticleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: article, isLoading, error } = useQuery<ArticleWithRelations>({
    queryKey: ['article', slug],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:3001/api/articles/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton width="100px" height="20px" className={styles.backSkeleton} />
        <Skeleton width="60%" height="40px" className={styles.titleSkeleton} />
        <Skeleton width="40%" height="20px" className={styles.metaSkeleton} />
        <div className={styles.contentSkeleton}>
          <Skeleton height="20px" className={styles.lineSkeleton} />
          <Skeleton height="20px" className={styles.lineSkeleton} />
          <Skeleton height="20px" width="80%" className={styles.lineSkeleton} />
          <Skeleton height="200px" className={styles.boxSkeleton} />
          <Skeleton height="20px" className={styles.lineSkeleton} />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.error}>
        <h2>Article not found</h2>
        <p>The article you are looking for does not exist or has been moved.</p>
        <Link to="/" className={styles.backLink}>Go back home</Link>
      </div>
    );
  }

  const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      <header className={styles.header}>
        {article.category && (
          <span className={styles.category}>{article.category.name}</span>
        )}
        <h1 className={styles.title}>{article.title}</h1>
        
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Calendar size={16} />
            <span>{formattedDate}</span>
          </div>
          <div className={styles.metaItem}>
            <Clock size={16} />
            <span>{Math.ceil(article.content.split(' ').length / 200)} min read</span>
          </div>
          {article.status === 'DRAFT' && (
            <span className={styles.draftBadge}>Draft</span>
          )}
        </div>

        <div className={styles.tags}>
          {article.tags?.map(({ tag }) => (
            <span key={tag.name} className={styles.tag}>
              <TagIcon size={14} />
              {tag.name}
            </span>
          ))}
        </div>
      </header>

      <div className={styles.content}>
        <Markdown content={article.content} />
      </div>
    </article>
  );
};

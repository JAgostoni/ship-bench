import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag as TagIcon, ChevronRight } from 'lucide-react';
import styles from './ArticleCard.module.css';
import { Article, Category } from '@kb/types';

interface ArticleWithRelations extends Article {
  category?: Category;
  tags?: { tag: { name: string } }[];
}

interface ArticleCardProps {
  article: ArticleWithRelations;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link to={`/articles/${article.slug}`} className={styles.card}>
      <div className={styles.content}>
        <div className={styles.meta}>
          {article.category && (
            <span className={styles.category}>{article.category.name}</span>
          )}
          <span className={styles.date}>
            <Calendar size={14} />
            {formattedDate}
          </span>
        </div>
        
        <h2 className={styles.title}>{article.title}</h2>
        
        {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
        
        <div className={styles.tags}>
          {article.tags?.map(({ tag }) => (
            <span key={tag.name} className={styles.tag}>
              <TagIcon size={12} />
              {tag.name}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.arrow}>
        <ChevronRight size={20} />
      </div>
    </Link>
  );
};

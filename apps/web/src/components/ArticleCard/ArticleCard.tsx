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
  searchQuery?: string | null;
}

const Highlight: React.FC<{ text: string; query: string | null | undefined }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <>{text}</>;
  
  // Create a regex that matches any of the search words
  // Escape special regex characters in words
  const escapedWords = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(pattern);
  
  return (
    <>
      {parts.map((part, i) => 
        pattern.test(part) ? (
          <mark key={i} className={styles.highlight}>{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, searchQuery }) => {
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
        
        <h2 className={styles.title}>
          <Highlight text={article.title} query={searchQuery} />
        </h2>
        
        {article.excerpt && (
          <p className={styles.excerpt}>
            <Highlight text={article.excerpt} query={searchQuery} />
          </p>
        )}
        
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

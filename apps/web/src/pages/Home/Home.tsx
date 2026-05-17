import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArticleCard } from '../../components/ArticleCard/ArticleCard';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import styles from './Home.module.css';
import { Article, Category } from '@kb/types';

interface ArticleWithRelations extends Article {
  category?: Category;
  tags?: { tag: { name: string } }[];
}

interface ArticlesResponse {
  items: ArticleWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const searchQuery = searchParams.get('search');

  const { data, isLoading, error } = useQuery<ArticlesResponse>({
    queryKey: ['articles', categorySlug, searchQuery],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3001/api/articles', {
        params: {
          category: categorySlug,
          search: searchQuery,
        },
      });
      return response.data;
    },
  });

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error loading articles</h2>
        <p>Please try again later.</p>
      </div>
    );
  }

  const getTitle = () => {
    if (searchQuery) return `Search: "${searchQuery}"`;
    if (categorySlug) return `Category: ${categorySlug}`;
    return 'Latest Articles';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        <p className={styles.subtitle}>
          {data?.total || 0} articles found
        </p>
      </header>

      <div className={styles.list}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonWrapper}>
              <Skeleton height="120px" borderRadius="var(--radius-lg)" />
            </div>
          ))
        ) : data?.items.length === 0 ? (
          <div className={styles.empty}>
            {searchQuery ? (
              <>
                <p>No results found for "{searchQuery}".</p>
                <p className={styles.emptyHint}>Try different keywords or check your spelling.</p>
              </>
            ) : (
              <p>No articles found in this category.</p>
            )}
          </div>
        ) : (
          data?.items.map((article) => (
            <ArticleCard key={article.id} article={article} searchQuery={searchQuery} />
          ))
        )}
      </div>
    </div>
  );
};

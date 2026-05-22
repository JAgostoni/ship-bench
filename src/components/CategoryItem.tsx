// src/components/CategoryItem.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { CategoryLink } from './CategoryLink';
import { getCategoryArticleCountAction, deleteCategoryAction } from '@/lib/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Sidebar.module.css';

interface CategoryItemProps {
  id: number;
  name: string;
  slug: string;
  articleCount: number;
}

export function CategoryItem({ id, name, slug, articleCount }: CategoryItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalArticles, setTotalArticles] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load actual count from db (including drafts) when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setIsLoadingCount(true);
      setErrorMsg('');
      getCategoryArticleCountAction(id)
        .then((res) => {
          setTotalArticles(res.count);
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg('Failed to calculate database records.');
        })
        .finally(() => {
          setIsLoadingCount(false);
        });
    } else {
      setTotalArticles(null);
    }
  }, [isModalOpen, id]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    startDeleteTransition(async () => {
      try {
        const res = await deleteCategoryAction(id);
        if (res.success) {
          setIsModalOpen(false);
          // If we are currently viewing the deleted category, redirect to /articles
          const currentCategory = searchParams.get('category') || '';
          if (currentCategory === slug) {
            router.push('/articles');
          } else {
            router.refresh();
          }
        } else {
          setErrorMsg(res.error || 'Failed to delete category.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('An unexpected error occurred.');
      }
    });
  };

  return (
    <div className={styles.categoryItemContainer}>
      <CategoryLink
        href={`/articles?category=${slug}`}
        slug={slug}
        className={styles.categoryItem}
        activeClassName={styles.categoryItemActive}
      >
        <span className={styles.categoryIcon} aria-hidden="true">📁</span>
        <span className={styles.categoryName}>{name}</span>
        <span className={styles.articleCount}>
          <span className="sr-only">contains </span>
          {articleCount}
          <span className="sr-only"> published articles</span>
        </span>
      </CategoryLink>

      <button
        type="button"
        className={styles.deleteCategoryBtn}
        aria-label={`Delete category ${name}`}
        title={`Delete category ${name}`}
        onClick={handleDeleteClick}
      >
        🗑️
      </button>

      {isModalOpen && (
        <div 
          className={styles.modalOverlay} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          onClick={() => !isDeleting && setIsModalOpen(false)}
        >
          <div 
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title" className={styles.modalTitle}>
              Delete Category
            </h2>
            <div className={styles.modalBody}>
              {isLoadingCount ? (
                <div className={styles.modalLoading}>
                  <div className={styles.spinner} aria-hidden="true"></div>
                  <p>Calculating database safeguards...</p>
                </div>
              ) : errorMsg ? (
                <p className={styles.modalError} role="alert">{errorMsg}</p>
              ) : (
                <p className={styles.modalText}>
                  This category will be permanently removed. The{' '}
                  <strong>{totalArticles ?? 0}</strong> articles inside will not be
                  deleted; they will become <strong>Uncategorized</strong>.
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmDelete}
                disabled={isLoadingCount || isDeleting || totalArticles === null}
              >
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

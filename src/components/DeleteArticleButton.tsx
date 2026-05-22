// src/components/DeleteArticleButton.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { deleteArticleAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import styles from '@/app/articles/[slug]/page.module.css';
import sidebarStyles from './Sidebar.module.css';

interface DeleteArticleButtonProps {
  articleId: number;
  articleTitle: string;
}

export function DeleteArticleButton({ articleId, articleTitle }: DeleteArticleButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleDeleteClick = () => {
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleConfirmDelete = () => {
    startDeleteTransition(async () => {
      try {
        const res = await deleteArticleAction(articleId);
        if (res.success) {
          setIsModalOpen(false);
          router.push('/articles');
          router.refresh();
        } else {
          setErrorMsg(res.error || 'Failed to delete article.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('An unexpected error occurred.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={styles.deleteBtn}
        aria-label="Delete Article"
        title="Delete Article"
        onClick={handleDeleteClick}
      >
        🗑️
      </button>

      {isModalOpen && (
        <div 
          className={sidebarStyles.modalOverlay} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="delete-article-title"
          onClick={() => !isDeleting && setIsModalOpen(false)}
        >
          <div 
            className={sidebarStyles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-article-title" className={sidebarStyles.modalTitle}>
              Delete Article
            </h2>
            <div className={sidebarStyles.modalBody}>
              {errorMsg ? (
                <p className={sidebarStyles.modalError} role="alert">{errorMsg}</p>
              ) : (
                <p className={sidebarStyles.modalText}>
                  Are you sure you want to permanently delete{' '}
                  <strong>{articleTitle}</strong>? This action cannot be undone.
                </p>
              )}
            </div>
            <div className={sidebarStyles.modalActions}>
              <button
                type="button"
                className={sidebarStyles.modalCancelBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={sidebarStyles.modalConfirmBtn}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

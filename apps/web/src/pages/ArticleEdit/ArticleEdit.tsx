import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Save, X, Trash2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { MarkdownEditor } from '../../components/MarkdownEditor/MarkdownEditor';
import { Category, Article, CreateArticle, UpdateArticle } from '@kb/types';
import styles from './ArticleEdit.module.css';

const API_BASE = 'http://localhost:3001/api';

export const ArticleEdit: React.FC = () => {
  const { id, slug: editSlug } = useParams<{ id?: string; slug?: string }>();
  const isEdit = !!editSlug;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/categories`);
      return response.data;
    },
  });

  // Fetch article if editing
  const { data: article, isLoading: isArticleLoading } = useQuery<Article>({
    queryKey: ['article', editSlug],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/articles/${editSlug}`);
      return response.data;
    },
    enabled: isEdit,
  });

  // Sync form with article data
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setCategoryId(article.categoryId || '');
      setStatus(article.status);
    }
  }, [article]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const createMutation = useMutation({
    mutationFn: (newArticle: CreateArticle) => axios.post(`${API_BASE}/articles`, newArticle),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      showNotification('success', 'Article created successfully!');
      setTimeout(() => navigate(`/articles/${response.data.slug}`), 1000);
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.error || 'Failed to create article');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedArticle: UpdateArticle) => 
      axios.patch(`${API_BASE}/articles/${article?.id}`, updatedArticle),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', response.data.slug] });
      showNotification('success', 'Article updated successfully!');
      // Navigate to new slug if it changed
      if (response.data.slug !== editSlug) {
        setTimeout(() => navigate(`/articles/${response.data.slug}`), 1000);
      }
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.error || 'Failed to update article');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => axios.delete(`${API_BASE}/articles/${article?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      showNotification('success', 'Article deleted successfully!');
      setTimeout(() => navigate('/'), 1000);
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.error || 'Failed to delete article');
    },
  });

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      showNotification('error', 'Title is required');
      return;
    }

    const payload = {
      title,
      content,
      categoryId: categoryId || undefined,
      status,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as CreateArticle);
    }
  }, [title, content, categoryId, status, isEdit, article?.id, createMutation, updateMutation]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      deleteMutation.mutate();
    }
  };

  if (isEdit && isArticleLoading) {
    return <div className={styles.loading}>Loading article...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to={isEdit ? `/articles/${editSlug}` : '/'} className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>Cancel</span>
          </Link>
          <div className={styles.actions}>
            {isEdit && (
              <button 
                onClick={handleDelete} 
                className={`${styles.button} ${styles.deleteButton}`}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            )}
            <button 
              onClick={handleSave} 
              className={`${styles.button} ${styles.saveButton}`}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save size={18} />
              <span>{isEdit ? 'Save Changes' : 'Create Article'}</span>
            </button>
          </div>
        </div>
        <h1 className={styles.pageTitle}>{isEdit ? 'Edit Article' : 'New Article'}</h1>
      </header>

      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="title" className={styles.label}>Title</label>
            <input
              id="title"
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title"
              autoFocus
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="category" className={styles.label}>Category</label>
            <select
              id="category"
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No Category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="status" className={styles.label}>Status</label>
            <select
              id="status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div className={styles.editorWrapper}>
          <label className={styles.label}>Content (Markdown)</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
};

// src/components/MarkdownEditor.tsx
'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { createArticleAction, updateArticleAction } from '@/lib/actions';
import styles from './MarkdownEditor.module.css';

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

interface InitialArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  categoryId: number | null;
  status: 'draft' | 'published';
}

interface MarkdownEditorProps {
  categories: CategoryOption[];
  initialArticle?: InitialArticle;
}

export function MarkdownEditor({ categories, initialArticle }: MarkdownEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initial values setup for dirty state tracking
  const initialValues = {
    title: initialArticle?.title || '',
    slug: initialArticle?.slug || '',
    content: initialArticle?.content || '',
    categoryId: initialArticle?.categoryId ?? '',
    status: initialArticle?.status || 'draft',
  };

  // Form State
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [content, setContent] = useState(initialValues.content);
  const [categoryId, setCategoryId] = useState<number | string>(initialValues.categoryId);
  const [status, setStatus] = useState<'draft' | 'published'>(initialValues.status as 'draft' | 'published');
  
  // UX State
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [compiledHtml, setCompiledHtml] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  const isSlugTouched = useRef(!!initialArticle);
  const isSubmitRef = useRef(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Compute dirty state
  const isDirty = !isSubmitRef.current && (
    title !== initialValues.title ||
    slug !== initialValues.slug ||
    content !== initialValues.content ||
    String(categoryId) !== String(initialValues.categoryId) ||
    status !== initialValues.status
  );

  // Helper to slugify titles
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove non-word/non-space/non-hyphen characters
      .replace(/[\s_-]+/g, '-') // collapse spaces/underscores/hyphens to a single hyphen
      .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!initialArticle && !isSlugTouched.current) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isSlugTouched.current = true;
    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
  };

  // 75ms debounced markdown compilation
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const rawHtml = marked.parse(content) as string;
        const safeHtml = DOMPurify.sanitize(rawHtml);
        setCompiledHtml(safeHtml);
      } catch (err) {
        console.error('Failed to parse Markdown:', err);
      }
    }, 75);

    return () => clearTimeout(handler);
  }, [content]);

  // Proportional scroll synchronization and line numbers scrolling sync
  const handleScroll = () => {
    const editor = editorRef.current;
    const lineNumbers = lineNumbersRef.current;
    const preview = previewRef.current;
    if (!editor) return;

    // Sync line numbers column scroll
    if (lineNumbers) {
      lineNumbers.scrollTop = editor.scrollTop;
    }

    // Sync preview scroll proportionally
    if (preview) {
      const denominator = editor.scrollHeight - editor.clientHeight;
      if (denominator <= 0) return;
      const scrollRatio = editor.scrollTop / denominator;
      preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
    }
  };

  // Browser Exit Warnings (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave this page?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Client-side Navigation Guard (intercept internal clicks)
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        // Only warn for links within our own origin and not target blank
        if (url.origin === window.location.origin && !anchor.target) {
          const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, [isDirty]);

  // Handle touch events for horizontal swipe gestures on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const threshold = 80;
    const diff = touchStartX.current - touchEndX.current;

    if (diff > threshold && activeTab === 'write') {
      setActiveTab('preview');
    } else if (diff < -threshold && activeTab === 'preview') {
      setActiveTab('write');
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
      if (!confirmLeave) {
        e.preventDefault();
        return;
      }
    }
    isSubmitRef.current = true;
    router.push(initialArticle ? `/articles/${initialArticle.slug}` : '/articles');
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      content,
      categoryId: categoryId === '' ? null : Number(categoryId),
      status,
    };

    startTransition(async () => {
      const res = initialArticle
        ? await updateArticleAction(initialArticle.id, payload)
        : await createArticleAction(payload);

      if (res.success && res.slug) {
        isSubmitRef.current = true;
        router.push(`/articles/${res.slug}`);
      } else if (res.errors) {
        setErrors(res.errors);
      }
    });
  };

  // Generate an array of line numbers
  const totalLines = content.split('\n').length || 1;
  const lineNumbersArray = Array.from({ length: totalLines }, (_, idx) => idx + 1);

  return (
    <form className={styles.editorWorkspace} onSubmit={handleSaveSubmit}>
      {/* Control / Metadata Header Bar */}
      <div className={styles.metaRow}>
        <div className={styles.titleGroup}>
          <label htmlFor="editor-title" className="sr-only">Article Title</label>
          <input
            id="editor-title"
            type="text"
            className={`${styles.titleInputField} ${errors.title ? styles.inputError : ''}`}
            placeholder="Enter descriptive article title..."
            value={title}
            onChange={handleTitleChange}
            disabled={isPending}
            autoFocus
          />
          {errors.title && (
            <div className={styles.fieldErrorMsg} role="alert">
              ⚠️ {errors.title[0]}
            </div>
          )}
        </div>

        <div className={styles.controlSelectors}>
          {/* Category Dropdown */}
          <div className={styles.selectWrapper}>
            <select
              id="editor-category"
              className={styles.selector}
              aria-label="Select Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPending}
            >
              <option value="">📁 No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  📁 {cat.name}
                </option>
              ))}
            </select>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </div>

          {/* Status Dropdown */}
          <div className={styles.selectWrapper}>
            <select
              id="editor-status"
              className={styles.selector}
              aria-label="Select Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
              disabled={isPending}
            >
              <option value="draft">🟡 Draft</option>
              <option value="published">🟢 Published</option>
            </select>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </div>

          {/* Actions */}
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancelClick}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.4 31.4" opacity="0.25" />
                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5857 2.3688 15.0857 3.02324 16.423" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Slug Custom Field */}
      <div className={styles.slugRow}>
        <div className={styles.slugInputContainer}>
          <span className={styles.slugPrefix}>/articles/</span>
          <input
            type="text"
            className={`${styles.slugInputField} ${errors.slug ? styles.inputError : ''}`}
            placeholder="url-slug-format"
            value={slug}
            onChange={handleSlugChange}
            disabled={isPending}
            aria-label="Article URL slug"
          />
        </div>
        {errors.slug && (
          <div className={styles.fieldErrorMsg} role="alert">
            ⚠️ {errors.slug[0]}
          </div>
        )}
      </div>

      {errors.global && (
        <div className={styles.globalErrorBlock} role="alert">
          {errors.global[0]}
        </div>
      )}

      {/* Tablet/Mobile Tab Switches */}
      <div className={styles.tabHeader}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'write' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('write')}
        >
          ✍️ Write Markdown
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview Output
        </button>
      </div>

      {/* Editor & Preview Workspace Container */}
      <div
        className={styles.splitViewContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Pane: Code Editor */}
        <div className={`${styles.editorPane} ${activeTab === 'write' ? styles.tabActive : styles.tabHidden}`}>
          <div className={styles.editorFlex}>
            {/* Scroll-synced Line Numbers */}
            <div className={styles.lineNumbersColumn} ref={lineNumbersRef} aria-hidden="true">
              {lineNumbersArray.map((line) => (
                <div key={line} className={styles.lineNumber}>
                  {line}
                </div>
              ))}
            </div>

            {/* Markdown Text Area */}
            <div className={styles.textareaWrapper}>
              <label htmlFor="markdown-textarea" className="sr-only">Markdown Input</label>
              <textarea
                id="markdown-textarea"
                ref={editorRef}
                className={styles.markdownTextArea}
                placeholder="Start writing in Markdown... (Supports standard Markdown tags and GitHub-style alerts like > [!NOTE])"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleScroll}
                disabled={isPending}
                aria-label="Markdown Article Editor"
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Live HTML Preview */}
        <div
          ref={previewRef}
          className={`${styles.livePreviewPane} ${activeTab === 'preview' ? styles.tabActive : styles.tabHidden}`}
          aria-live="polite"
          aria-label="Live HTML Preview"
        >
          {compiledHtml ? (
            <div
              className={styles.markdownBody}
              dangerouslySetInnerHTML={{ __html: compiledHtml }}
            />
          ) : (
            <div className={styles.emptyPreviewState}>
              <div className={styles.previewIllustration} aria-hidden="true">✍️</div>
              <p>Your rendered Markdown preview will appear here in real-time.</p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

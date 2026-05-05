'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { renderMarkdown } from '@/src/lib/markdown';
import { sanitizeHtml } from '@/src/lib/sanitize';
import { MarkdownTextarea } from '@/components/article/MarkdownTextarea';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { createArticle, updateArticle } from '@/src/actions/articles';
import type { ActionError } from '@/src/actions/articles';

interface ArticleEditorProps {
  title?: string;
  content?: string;
  isEdit: boolean;
  articleId?: string;
}

interface FormErrors {
  title?: string;
  content?: string;
}

export function ArticleEditor({
  title: initialTitle = '',
  content: initialContent = '',
  isEdit,
  articleId,
}: ArticleEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [state, setState] = useState<'draft' | 'saving' | 'saved'>('draft');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const hasChanges = title !== initialTitle || content !== initialContent;

  // Warn on navigation when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Handle Cmd/Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [title, content, state]);

  // Focus title on mount (create mode)
  useEffect(() => {
    if (!isEdit && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEdit]);

  const handleSave = useCallback(async () => {
    // Clear previous errors
    setErrors({});

    // Client-side validation
    const newErrors: FormErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    }
    if (!content.trim()) {
      newErrors.content = 'Article content is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the errors before saving.');
      return;
    }

    setState('saving');

    const formData = new FormData();
    formData.set('title', title);
    formData.set('content', content);

    const result = isEdit && articleId
      ? await updateArticle(articleId, formData)
      : await createArticle(formData);

    if (result.success && result.article) {
      toast.success('Article saved.');
      setState('saved');

      if (isEdit && articleId) {
        router.push(`/articles/${articleId}`);
      } else if (result.article.id) {
        router.push(`/articles/${result.article.id}`);
      }
    } else if (result.errors) {
      setState('draft');

      const formErrors: FormErrors = {};
      for (const err of result.errors) {
        if (err.field === 'title') formErrors.title = err.message;
        if (err.field === 'content') formErrors.content = err.message;
        if (err.field === 'general') toast.error(err.message);
      }
      setErrors(formErrors);

      if (result.errors.some((e: ActionError) => e.field !== 'title' && e.field !== 'content')) {
        toast.error('Failed to save. Please try again.');
      }
    }
  }, [title, content, isEdit, articleId, router]);

  const handleDiscard = useCallback(() => {
    if (hasChanges) {
      setShowDiscardModal(true);
    } else {
      navigateAway();
    }
  }, [hasChanges, isEdit, articleId]);

  const navigateAway = useCallback(() => {
    if (isEdit && articleId) {
      router.push(`/articles/${articleId}`);
    } else {
      router.push('/');
    }
  }, [isEdit, articleId, router]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardModal(false);
    navigateAway();
  }, [navigateAway]);

  const renderedPreview = sanitizeHtml(renderMarkdown(content));

  return (
    <>
      <div className="min-h-[calc(100vh-3.5rem)] px-4 py-6">
        <div className="mx-auto max-w-7xl">
          {/* Mobile tab controls */}
          <div className="mb-4 flex border-b border-[var(--color-border)] lg:hidden">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'write'
                  ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              onClick={() => setActiveTab('write')}
            >
              ✏️ Write
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              👁️ Preview
            </button>
          </div>

          <div className="flex gap-6 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8">
            {/* Editor column */}
            <div className={`${activeTab !== 'write' ? 'hidden lg:block' : ''} lg:min-w-0`}>
              {/* Title input */}
              <div className="mb-4">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  placeholder="Article title"
                  aria-label="Article title"
                  aria-required="true"
                  className={`w-full text-2xl font-bold leading-tight text-[var(--color-text)] placeholder:text-[var(--color-border-strong)] focus:outline-none ${
                    errors.title
                      ? 'border-b-2 border-[var(--color-error)] bg-[var(--color-error-bg)]'
                      : 'border-b-2 border-transparent focus:border-[var(--color-border)]'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-[var(--color-error)]">{errors.title}</p>
                )}
              </div>

              {/* Editor textarea */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <MarkdownTextarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors({ ...errors, content: undefined });
                  }}
                  placeholder="Write your article content in Markdown..."
                  aria-label="Article content"
                  className={`w-full rounded bg-[var(--color-surface)] p-2 text-[var(--color-text)] placeholder:text-[var(--color-border-strong)] focus:outline-none ${
                    errors.content ? 'border border-[var(--color-error)]' : ''
                  }`}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-[var(--color-error)]">{errors.content}</p>
                )}
              </div>
            </div>

            {/* Preview column */}
            <div className={`${activeTab !== 'preview' ? 'hidden lg:block' : ''} lg:min-w-0`}>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                {content.trim() ? (
                  <div
                    className="kb-prose"
                    dangerouslySetInnerHTML={{ __html: renderedPreview }}
                  />
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Preview will appear as you write...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="sticky bottom-0 -mx-4 -mb-6 mt-6 bg-[var(--color-bg)] px-4 py-4 md:static md:mx-0 md:mb-0 md:mt-8">
            <div className="flex justify-end gap-3">
              <Button
                variant="tertiary"
                size="md"
                onClick={handleDiscard}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                loading={state === 'saving'}
              >
                {isEdit ? 'Save Changes' : 'Create Article'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showDiscardModal && (
        <ConfirmationModal
          title="You have unsaved changes"
          message="Discard or stay here?"
          confirmLabel="Discard"
          cancelLabel="Stay"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardModal(false)}
        />
      )}
    </>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface ArticleEditorProps {
  defaultValue?: string;
  name: string;
  error?: string;
}

export function ArticleEditor({ defaultValue = '', name, error }: ArticleEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const [isMobile, setIsMobile] = useState(false);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div>
      {/* Mobile tab bar */}
      {isMobile && (
        <div className="flex border-b mb-2" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setEditorMode('edit')}
            className="px-4 py-2 text-sm font-medium transition-colors duration-100"
            style={{
              color: editorMode === 'edit' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: editorMode === 'edit' ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('preview')}
            className="px-4 py-2 text-sm font-medium transition-colors duration-100"
            style={{
              color: editorMode === 'preview' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: editorMode === 'preview' ? '2px solid var(--color-accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            Preview
          </button>
        </div>
      )}

      <div
        style={error ? { border: '1px solid var(--color-error)', borderRadius: '6px' } : undefined}
      >
        {MDEditor === undefined ? (
          <div
            className="animate-pulse rounded"
            style={{
              minHeight: isMobile ? '300px' : '400px',
              backgroundColor: 'var(--color-border)',
            }}
          />
        ) : (
          <MDEditor
            value={value}
            onChange={(val) => setValue(val ?? '')}
            minHeight={isMobile ? 300 : 400}
            preview={isMobile ? editorMode : 'live'}
          />
        )}
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="sr-only"
        aria-hidden="true"
      />
      {error && (
        <p role="alert" className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';

interface MarkdownEditorProps {
  value: string;
  onChange: (content: string) => void;
  initialContent?: string;
  error?: string;
}

/** Custom link renderer: external links open in new tab */
function markdownComponents() {
  return {
    a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode }) => {
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      if (isExternal) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },
  };
}

export function MarkdownEditor({ value, onChange, error }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange],
  );

  const containerClasses = clsx(
    'border rounded-md overflow-hidden',
    error ? 'border-red-500' : 'border-neutral-300',
  );

  return (
    <div className={containerClasses}>
      {/* Mobile tab toggle */}
      {isMobile && (
        <div className="flex border-b border-neutral-200" role="tablist" aria-label="Editor mode">
          <button
            role="tab"
            aria-selected={activeTab === 'write'}
            className={clsx(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'write'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 border border-neutral-300',
            )}
            onClick={() => setActiveTab('write')}
          >
            Write
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'preview'}
            className={clsx(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === 'preview'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 border border-neutral-300',
            )}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
      )}

      {/* Editor content */}
      <div className={clsx(isMobile ? '' : 'flex', 'min-h-[400px]')}>
        {/* Left pane: textarea */}
        {(isMobile ? activeTab === 'write' : true) && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Markdown editor"
            className={clsx(
              'font-mono text-sm leading-relaxed p-4 bg-neutral-50 resize-y w-full min-h-[300px] md:min-h-0 outline-none',
              isMobile ? 'block' : 'w-1/2 border-r border-neutral-200',
            )}
            style={{ minHeight: isMobile ? '300px' : '400px' }}
          />
        )}

        {/* Right pane: live preview */}
        {(isMobile ? activeTab === 'preview' : true) && (
          <div
            className={clsx(
              'prose prose-neutral lg:prose-lg max-w-none p-4 bg-white overflow-y-auto',
              isMobile ? 'w-full min-h-[300px]' : 'w-1/2',
            )}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents()}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-neutral-400 italic text-sm">Nothing to preview</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownEditor;

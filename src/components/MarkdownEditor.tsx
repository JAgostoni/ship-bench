import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  return (
    <div>
      {/* Mobile tab bar */}
      <div className="flex border-b border-slate-200 md:hidden mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('write')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'write'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={activeTab === 'write'}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'preview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={activeTab === 'preview'}
        >
          Preview
        </button>
      </div>

      {/* Desktop split-pane / Mobile tabbed content */}
      <div className="flex flex-col md:flex-row md:h-[calc(100vh-280px)] md:min-h-[400px] rounded-lg border border-slate-200 overflow-hidden">
        {/* Write pane */}
        <div
          className={`flex-1 md:w-1/2 ${activeTab !== 'write' ? 'hidden md:block' : 'block'}`}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Article content"
            className="w-full h-full md:h-full min-h-[300px] md:min-h-0 p-5 font-mono text-sm resize-none border-none outline-none bg-white text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-200 shrink-0" />

        {/* Preview pane */}
        <div
          className={`flex-1 md:w-1/2 p-5 overflow-y-auto bg-white ${activeTab !== 'preview' ? 'hidden md:block' : 'block'}`}
        >
          {value.trim().length === 0 ? (
            <p className="text-sm text-text-tertiary italic">Nothing to preview</p>
          ) : (
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1({ children, ...props }) {
                  return <h2 {...props}>{children}</h2>;
                },
                h2({ children, ...props }) {
                  return <h3 {...props}>{children}</h3>;
                },
                h3({ children, ...props }) {
                  return <h4 {...props}>{children}</h4>;
                },
                h4({ children, ...props }) {
                  return <h5 {...props}>{children}</h5>;
                },
                code({ children, className, ...props }) {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-slate-100 rounded-sm px-1 font-mono text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-slate-50 border rounded-md p-4 overflow-auto">
                        <code className={`font-mono text-sm ${className ?? ''}`} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

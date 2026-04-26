'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSubmit: (formData: FormData) => Promise<{ success?: boolean; slug?: string; error?: any }>;
  submitLabel: string;
}

export default function MarkdownEditor({ 
  initialTitle = '', 
  initialContent = '', 
  onSubmit, 
  submitLabel 
}: MarkdownEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Simple window width check for tablet view
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);

    const result = await onSubmit(formData);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      // Redirect handled by parent
      window.location.href = `/articles/${result.slug}`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title"
            className={`w-full p-2 text-2xl font-semibold border rounded-md outline-none focus:ring-2 focus:ring-blue-600 ${
              error?.title ? 'border-red-600' : 'border-slate-200'
            }`}
          />
          {error?.title && (
            <p className="text-red-600 text-sm mt-1">{Array.isArray(error.title) ? error.title[0] : error.title}</p>
          )}
        </div>

        <div className={`flex-1 flex ${isTablet ? 'flex-col' : 'flex-row'} gap-4 overflow-hidden`}>
          {/* Editor Pane */}
          <div className={`flex-1 flex flex-col ${isTablet ? 'h-1/2' : 'h-full'}`}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your markdown here..."
              className={`w-full h-full p-4 border rounded-md resize-none outline-none focus:ring-2 focus:ring-blue-600 ${
                error?.content ? 'border-red-600' : 'border-slate-200'
              }`}
            />
            {error?.content && (
              <p className="text-red-600 text-sm mt-1">{Array.isArray(error.content) ? error.content[0] : error.content}</p>
            )}
          </div>

          {/* Preview Pane */}
          <div className={`flex-1 p-4 border rounded-md bg-white overflow-y-auto prose prose-slate max-w-none ${
            isTablet ? 'h-1/2' : 'h-full'
          } border-slate-200`}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button 
            type="button" 
            onClick={() => window.history.back()} 
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isSaving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

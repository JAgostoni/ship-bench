'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface ArticleEditorProps {
  defaultValue?: string;
  name: string;
  error?: string;
}

export function ArticleEditor({ defaultValue = '', name, error }: ArticleEditorProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <div
        style={error ? { border: '1px solid var(--color-error)', borderRadius: '6px' } : undefined}
      >
        {MDEditor === undefined ? (
          <div
            className="animate-pulse rounded"
            style={{
              minHeight: '400px',
              backgroundColor: 'var(--color-border)',
            }}
          />
        ) : (
          <MDEditor
            value={value}
            onChange={(val) => setValue(val ?? '')}
            minHeight={400}
          />
        )}
      </div>
      <textarea
        name={name}
        value={value}
        readOnly
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

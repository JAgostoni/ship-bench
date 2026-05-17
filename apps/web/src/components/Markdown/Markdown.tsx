import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { createHighlighter } from 'shiki';
import styles from './Markdown.module.css';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  const [highlighter, setHighlighter] = useState<any>(null);

  useEffect(() => {
    createHighlighter({
      themes: ['github-light'],
      langs: ['javascript', 'typescript', 'bash', 'json', 'python', 'sql', 'css', 'html'],
    }).then(setHighlighter);
  }, []);

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';

            if (!inline && lang && highlighter) {
              const html = highlighter.codeToHtml(String(children).replace(/\n$/, ''), {
                lang,
                theme: 'github-light',
              });
              return <div dangerouslySetInnerHTML={{ __html: html }} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

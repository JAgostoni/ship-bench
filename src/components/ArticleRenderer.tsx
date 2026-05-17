import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ArticleRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

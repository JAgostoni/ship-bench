import MarkdownEditor from '@/components/editor/MarkdownEditor';
import { createArticle } from '@/app/actions/articles';

export default function NewArticlePage() {
  return (
    <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-100px)]">
      <h1 className="text-3xl font-bold mb-6">Create New Article</h1>
      <MarkdownEditor 
        onSubmit={createArticle} 
        submitLabel="Save Article" 
      />
    </div>
  );
}

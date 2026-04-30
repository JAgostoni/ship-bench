import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

interface PlaceholderEditorProps {
  mode: 'new' | 'edit';
}

export default function PlaceholderEditor({ mode }: PlaceholderEditorProps) {
  const { slug } = useParams<{ slug: string }>();
  const title = mode === 'new' ? 'Create Article' : 'Edit Article';

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link
          to={slug ? `/articles/${slug}` : '/'}
          className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Construction className="w-12 h-12 text-slate-400 mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-600 max-w-sm">
          The full editor is coming in the next iteration. Check back soon!
        </p>
      </div>
    </div>
  );
}

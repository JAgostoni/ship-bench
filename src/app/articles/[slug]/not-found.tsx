import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function ArticleNotFound() {
  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8">
      <EmptyState
        icon={FileQuestion}
        title="Article not found"
        description="The article you're looking for doesn't exist or has been deleted."
        action={{
          label: 'Browse articles',
          href: '/',
        }}
      />
    </div>
  );
}

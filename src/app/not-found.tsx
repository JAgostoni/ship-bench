import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={{
          label: 'Browse articles',
          href: '/',
        }}
      />
    </div>
  );
}

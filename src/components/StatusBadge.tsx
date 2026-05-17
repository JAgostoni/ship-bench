import type { ArticleStatus } from '@/types';

export function StatusBadge({ status }: { status: ArticleStatus }) {
  if (status === 'PUBLISHED') return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border"
      style={{
        backgroundColor: 'var(--color-draft-bg)',
        color: 'var(--color-draft-text)',
        borderColor: 'var(--color-draft-border)',
      }}
    >
      <span className="sr-only">Status: </span>DRAFT
    </span>
  );
}

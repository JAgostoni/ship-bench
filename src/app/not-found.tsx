import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
        Article not found.
      </p>
      <Link
        href="/articles"
        className="text-sm hover:underline"
        style={{ color: 'var(--color-accent)' }}
      >
        ← Back to articles
      </Link>
    </div>
  );
}

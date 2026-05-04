import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <div className="mb-4 text-[var(--color-text-muted)]">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">This article no longer exists</h3>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]"></p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-base font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Back to articles
      </Link>
    </div>
  );
}

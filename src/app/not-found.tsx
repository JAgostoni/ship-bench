import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * Global not-found UI — design S6.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <FileQuestion
        className="mb-4 size-10 text-[var(--color-text-muted)]"
        strokeWidth={1.5}
        aria-hidden
      />
      <h1 className="text-lg font-semibold text-[var(--color-text)]">
        Article not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
        This article may have been deleted or the link is wrong.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        Back to articles
      </Link>
    </div>
  );
}

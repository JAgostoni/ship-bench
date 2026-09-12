import { History } from 'lucide-react';
import { absoluteTime, relativeTime } from '@/lib/format';
import type { RevisionSummary } from '@/types/domain';

/**
 * design-spec.md §3.4's `History` section: a `<details>` collapsed by default
 * (UX18), headed `History ({n} revisions)`, listing the 5 most recent revisions.
 *
 * **Iteration 4 scope.** The summary line, the collapsed default, and the revision
 * rows render from real repository data — that is what the iteration's detail-route
 * task asks for. The per-revision `View` dialog is deliberately deferred to
 * iteration 6, which is where the spec's `RevisionList` (dialog-backed) lands; the
 * data is identical, so nothing here is throwaway.
 */
export function RevisionList({ revisions }: { revisions: RevisionSummary[] }) {
  const count = revisions.length;

  return (
    <details className="rounded-card border-border mt-10 border">
      <summary className="text-ink flex cursor-pointer items-center gap-2 px-4 py-3 text-[14px] font-medium">
        <History className="text-ink-subtle h-4 w-4" aria-hidden="true" />
        History ({count} {count === 1 ? 'revision' : 'revisions'})
      </summary>
      {count === 0 ? (
        <p className="text-ink-muted px-4 pb-4 text-[13px]">No revisions yet.</p>
      ) : (
        <ul className="border-divider flex flex-col border-t">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="border-divider flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b px-4 py-2.5 text-[13px] last:border-b-0"
            >
              <span className="text-ink-muted tabular-nums">#{revision.revisionNumber}</span>
              <span aria-hidden="true" className="text-ink-subtle">
                ·
              </span>
              <span className="text-ink">{revision.editorName}</span>
              <span aria-hidden="true" className="text-ink-subtle">
                ·
              </span>
              <time
                className="text-ink-subtle"
                dateTime={revision.createdAt.toISOString()}
                title={absoluteTime(revision.createdAt)}
              >
                {relativeTime(revision.createdAt)}
              </time>
              {revision.changeNote ? (
                <>
                  <span aria-hidden="true" className="text-ink-subtle">
                    ·
                  </span>
                  <span className="text-ink-muted">“{revision.changeNote}”</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

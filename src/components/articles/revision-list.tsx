import { History } from 'lucide-react';
import { absoluteTime, relativeTime } from '@/lib/format';
import type { RevisionSummary } from '@/types/domain';
import { RevisionViewDialog } from './revision-view-dialog';

/**
 * design-spec.md §3.4's `History` section: a `<details>` collapsed by default
 * (UX18), headed `History ({n} revisions)`, listing the 5 most recent revisions with
 * a `View` dialog on each row.
 *
 * The list is a Server Component because it is pure data; only the dialog in
 * `revision-view-dialog.tsx` is a Client Component. That keeps the article route's
 * client bundle limited to what genuinely needs interactivity, which is
 * `architecture.md` §6.1's "each one is a leaf" rule.
 *
 * The repository already limits the set to 5, so the number in the summary is the
 * number of rows *shown* — which is what a reader assumes a count next to a list
 * means.
 */
export function RevisionList({
  revisions,
  articleTitle = '',
}: {
  revisions: RevisionSummary[];
  articleTitle?: string;
}) {
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
              className="border-divider flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5 text-[13px] last:border-b-0"
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
              <span className="ml-auto">
                <RevisionViewDialog revision={revision} articleTitle={articleTitle} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

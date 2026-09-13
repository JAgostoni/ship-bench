'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ArticleBody } from './article-body';
import type { RevisionSummary } from '@/types/domain';

/**
 * The per-revision `View` dialog (design-spec.md §3.4, `architecture.md` §9.4).
 *
 * **View-only — there is no restore.** `architecture.md` §16.2 puts revision
 * diffing and restore-from-revision explicitly out of v1; history is a record, not
 * a second editing surface. The dialog therefore renders the revision's Markdown
 * through the same sanitized `ArticleBody` pipeline as the article itself, so a
 * revision can never display anything the live article would not.
 *
 * This is the client half of `RevisionList`: the list shell is a Server Component
 * because it is pure data, and only the open/closed state of a dialog needs to be a
 * Client Component.
 */
export function RevisionViewDialog({
  revision,
  articleTitle,
}: {
  revision: RevisionSummary;
  articleTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        View
        {/* The accessible name has to say which revision, or a screen-reader user
            hears five identical "View" buttons. */}
        <span className="sr-only">
          revision {revision.revisionNumber} of {articleTitle}
        </span>
      </Button>

      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Revision #{revision.revisionNumber}</DialogTitle>
        <DialogDescription>
          {revision.title}
          {revision.changeNote ? ` — “${revision.changeNote}”` : ''}
        </DialogDescription>
        <div className="border-divider mt-4 border-t pt-4">
          {revision.bodyMd.trim() ? (
            <ArticleBody markdown={revision.bodyMd} />
          ) : (
            <p className="text-ink-muted text-[13px]">This revision has no body text.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

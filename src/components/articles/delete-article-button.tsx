'use client';

import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { archiveArticle, restoreArticle } from '@/app/actions/articles';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { Toast, ToastRegion } from '@/components/ui/toast';
import { TOAST_MESSAGES } from '@/lib/toast-messages';
import type { ActionState, ArticleDetail } from '@/types/domain';

/**
 * The overflow-menu archive action (design-spec.md §4.5, §5.6, §7.6, UX10/UX11).
 *
 * **The filename is `delete-article-button.tsx`; the component and every string say
 * Archive.** `design-spec.md` §10.1's naming note requires exactly that, and §10.6 rule 7
 * forbids the word "delete" in the UI. There is one file, not two.
 *
 * Three behaviours are structural rather than cosmetic:
 *
 * - **Archive is behind an overflow menu, not a filled button.** It is the only
 *   destructive action in the app, and UX10 is explicit that it must not compete with
 *   `Edit` for attention.
 * - **It is soft and states so.** The confirm dialog's body names the consequence *and*
 *   the recoverability, because a user who believes they are about to lose an article
 *   will not finish the flow.
 * - **The redirect carries both the toast intent and the article id**, which is what
 *   lets the `Undo` action (UX11) restore the exact article without this component
 *   outliving the navigation. The action redirects like every other mutation (§7.5), so
 *   there is no navigation effect here at all.
 *
 * The `Undo` toast therefore lives in `ArchiveUndoToast`, mounted by the destination.
 */

const initial: ActionState = { status: 'idle' };

export type ArchiveArticleButtonProps = {
  article: ArticleDetail;
};

export function ArchiveArticleButton({ article }: ArchiveArticleButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    archiveArticle,
    initial,
  );

  // A failed archive returns a state; the successful path never renders because the
  // action redirects. So this is only ever the error case.
  const error = state.status === 'error' ? state.message : null;

  return (
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="rounded-card border-border bg-surface shadow-overlay absolute top-full left-0 z-20 mt-1 min-w-[12rem] border p-1"
          >
            <DialogTrigger asChild>
              <button
                type="button"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="rounded-control text-danger hover:bg-danger-soft flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]"
              >
                Archive article
              </button>
            </DialogTrigger>
          </div>
        ) : null}
      </div>

      <DialogContent>
        <DialogTitle>Archive {`\u201C${article.title}\u201D`}?</DialogTitle>
        <DialogDescription>
          It will be hidden from browse and search. The article and its history are kept, and it
          stays reachable by direct link.
        </DialogDescription>

        <form action={formAction}>
          <input type="hidden" name="id" value={article.id} />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="md" loading={isPending}>
              Archive article
            </Button>
          </DialogFooter>
        </form>

        {error ? (
          <p role="alert" className="text-danger mt-3 text-[12px]">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The Undo window in ms (design-spec.md §7.6, UX11). */
export const UNDO_WINDOW_MS = 5000;

/**
 * The `Undo` confirmation on the archive destination (design-spec.md §7.6, UX11).
 *
 * It is a separate component from the button because the archive *redirects*: the
 * overflow menu is unmounted by the time the user could click Undo. The destination's
 * URL carries `archivedArticleId`, so the toast is rendered by the page that the user
 * actually lands on — which is also why its state can be derived from props rather than
 * from an effect that watches an action.
 */
export function ArchiveUndoToast({ articleId }: { articleId: number }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function undo() {
    const result = await restoreArticle(articleId);
    if (result.status === 'error') {
      // Never a silent failure: the user is told, and the article stays archived rather
      // than appearing restored.
      setError(result.message);
      return;
    }
    setDismissed(true);
    // The browse list the article was just removed from has to re-render with it back.
    // `router.refresh()` preserves the current scroll position and URL, which is what a
    // user who clicks Undo wants — this is a correction, not a navigation.
    router.refresh();
  }

  if (dismissed) return null;

  return (
    <ToastRegion>
      <Toast
        variant={error ? 'error' : 'success'}
        // An action-bearing toast still auto-dismisses after the UX11 window; the Undo
        // simply stops being offered afterwards.
        duration={error ? 8000 : UNDO_WINDOW_MS}
        onDismiss={() => setDismissed(true)}
        action={error ? undefined : { label: 'Undo', onClick: () => void undo() }}
      >
        {error ?? TOAST_MESSAGES.archived}
      </Toast>
    </ToastRegion>
  );
}

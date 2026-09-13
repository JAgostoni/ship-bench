'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArchiveUndoToast } from '@/components/articles/delete-article-button';
import { Toast, ToastRegion } from '@/components/ui/toast';
import { TOAST_MESSAGES, isRedirectToastEvent } from '@/lib/toast-messages';

/**
 * Renders the toast a Server Action asked for by putting `?toast=` in its redirect target
 * (`architecture.md` §7.5's `redirect()`; design-spec.md §7.6's success states).
 *
 * **Why the query string.** A mutation ends in `redirect()`, which unmounts the form that
 * would otherwise have owned the confirmation. Passing the intent through the URL keeps
 * the toast a server-rendered consequence of the write, so there is no global client store
 * (`architecture.md` §6.1 forbids one) and no `useEffect`-based data fetching.
 *
 * **The message is derived during render; the one piece of state only ever hides.**
 * Copying `searchParams` into state from an effect would cascade a render on mount and
 * would let a re-delivered search-param update (a soft navigation back to the same URL)
 * resurrect a toast the user had dismissed. `dismissed` cannot go back to `false`, so
 * neither can happen.
 *
 * The parameter is then removed with `router.replace(..., { scroll: false })` so a refresh
 * or a back-navigation does not replay a notice for a save that happened minutes ago, and a
 * bookmarked URL does not carry it.
 */
export function ToastFromQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const value = searchParams.get('toast');
  // `archived` is deliberately excluded: it is the one event that always carries its
  // article id and is owned by `ArchiveToastFromQuery`, which renders the 5-second
  // `Undo` (UX11). Rendering it here as well would stack two identical toasts.
  const event = isRedirectToastEvent(value) && value !== 'archived' ? value : null;

  useEffect(() => {
    if (!event) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('toast');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [event, searchParams, pathname, router]);

  if (!event || dismissed) return null;

  return (
    <ToastRegion>
      <Toast duration={4000} onDismiss={() => setDismissed(true)}>
        {TOAST_MESSAGES[event]}
      </Toast>
    </ToastRegion>
  );
}

/**
 * The archive destination's toast, which carries the 5-second `Undo` (UX11).
 *
 * Archive redirects to `/?toast=archived&archivedArticleId={id}` — the id is what lets
 * this component restore the exact article after the overflow menu that triggered the
 * archive has been unmounted by the navigation. This component owns the `archived` event
 * outright; `ToastFromQuery` deliberately skips it so exactly one toast renders.
 *
 * The condition reads only `searchParams`, and `ToastFromQuery` strips `toast` but not
 * `archivedArticleId`, so both survive the first render in the order they need.
 */
export function ArchiveToastFromQuery() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('archivedArticleId');
  const articleId = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

  if (searchParams.get('toast') !== 'archived' || articleId === null) return null;

  return <ArchiveUndoToast articleId={articleId} />;
}

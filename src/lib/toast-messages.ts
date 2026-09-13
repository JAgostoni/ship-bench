/**
 * The v1 toast catalogue (design-spec.md §5.8, §7.6).
 *
 * Only the six success toasts named by the spec exist, plus their error
 * counterparts. They live in a plain module — importable from both a Client
 * Component and a Server Action — so the producer and the consumer of a toast
 * cannot drift on the string, and no call site improvises copy.
 *
 * **Why a `?toast=` URL parameter is involved at all.** A mutation ends in
 * `redirect()` (`architecture.md` §7.5), which unmounts the form that would
 * otherwise have owned the toast. The action therefore puts the *intent* in the
 * destination URL (`?toast=created`) and `ToastFromQuery` renders it, then strips
 * the parameter so a reload does not replay it. That keeps the toast a pure
 * server-rendered consequence of the write rather than a global client store,
 * which the spec forbids (`architecture.md` §6.1: no global client state).
 */
export const TOAST_MESSAGES = {
  created: 'Article created.',
  saved: 'Article saved.',
  published: 'Article published.',
  archived: 'Article archived.',
  categoryCreated: 'Category created.',
  nameSaved: 'Display name saved.',
} as const;

export type ToastEvent = keyof typeof TOAST_MESSAGES;

/** The `Undo` label on the archive toast (design-spec.md §7.6). */
export const TOAST_UNDO_LABEL = 'Undo';

/** Close-button label, per design-spec.md §5.8. */
export const TOAST_DISMISS_LABEL = 'Dismiss';

/** The subset of events that arrive via a redirect's query string. */
export const REDIRECT_TOAST_EVENTS = ['created', 'saved', 'published', 'archived'] as const;

export type RedirectToastEvent = (typeof REDIRECT_TOAST_EVENTS)[number];

/** Type guard shared by the consumer of `?toast=`. */
export function isRedirectToastEvent(value: string | null): value is RedirectToastEvent {
  return value !== null && (REDIRECT_TOAST_EVENTS as readonly string[]).includes(value);
}

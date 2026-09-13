'use client';

import type { EditorPillStatus } from './editor-bridge';

/**
 * The document status strip that replaces the standard header on the editor routes
 * (design-spec.md §2.2, §3.5).
 *
 * Three things are deliberate:
 *
 * - **`← Cancel` on the left.** The exit path is the first thing in the strip, so a
 *   user who wants out is never hunting for it.
 * - **The primary `Save` is a `type="submit" form={formId}` button.** It is not a
 *   second submit implementation: pointing it at the form's id means it triggers the
 *   *same* submit path the form's own buttons use, so RHF validation, the action call,
 *   and the `intent` handling cannot diverge between the two placements.
 * - **No search input, no theme toggle, no wordmark.** §2.2 says the header search is
 *   replaced by this strip; a wordmark here would be chrome for its own sake.
 */
export function EditorStatusStrip({
  title,
  status,
  formId,
  pending,
  saveLabel,
  onCancel,
}: {
  title: string;
  status: EditorPillStatus;
  formId: string;
  /** True while a save is in flight, which disables both controls. */
  pending: boolean;
  saveLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto flex h-(--layout-header-h) items-center gap-3 px-4 md:px-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink disabled:text-disabled-ink flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-[13px]"
      >
        <span aria-hidden="true">←</span>
        Cancel
      </button>

      <p className="text-ink min-w-0 flex-1 truncate text-[14px] font-medium" title={title}>
        {title}
      </p>

      {/*
        E8: the pill is the live region, so the state change is announced rather than
        only being visible. It hides below `sm` because the header has room for the
        exit path and the primary action first; the form's own action bar carries the
        same status at every width.
      */}
      <span
        role="status"
        aria-live="polite"
        className={
          status === 'dirty'
            ? 'bg-warning-soft text-warning rounded-pill hidden shrink-0 items-center gap-1.5 px-2 py-0.5 text-[13px] font-medium sm:inline-flex'
            : status === 'failed'
              ? 'text-danger hidden shrink-0 text-[13px] font-medium sm:inline'
              : 'text-ink-subtle hidden shrink-0 text-[13px] sm:inline'
        }
      >
        {status === 'dirty' ? (
          <span aria-hidden="true" className="bg-warning h-1.5 w-1.5 rounded-full" />
        ) : null}
        {status === 'saving' ? (
          <>Saving…</>
        ) : status === 'failed' ? (
          <>Save failed</>
        ) : status === 'dirty' ? (
          <>Unsaved changes</>
        ) : (
          <>Saved</>
        )}
      </span>

      <button
        type="submit"
        form={formId}
        disabled={pending}
        className="rounded-control bg-accent text-accent-on hover:bg-accent-hover disabled:bg-disabled-bg disabled:text-disabled-ink shrink-0 px-4 py-2 text-[14px] font-medium"
      >
        {pending ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

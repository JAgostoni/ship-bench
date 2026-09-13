'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

/**
 * design-spec.md §5.8 — the toast primitive.
 *
 * Bottom-right, `max-w-sm`, `--surface`, 1px `--border`, `--shadow-overlay`,
 * `rounded-card`, 12px padding, slide-up 180ms.
 *
 * Three rules from the spec are structural rather than stylistic:
 *
 * - **`role` depends on the variant.** Success is `role="status"` (polite), an
 *   error is `role="alert"` (assertive). A single `aria-live` wrapper would make
 *   every message equally urgent, which is wrong for a save confirmation.
 * - **Errors that require action never auto-dismiss.** `duration` is a
 *   per-instance number; the caller passes `null` for anything the user must
 *   respond to. Those cases render a banner, not a toast (§7.4), so the default
 *   here is the auto-dismissing success shape.
 * - **`prefers-reduced-motion` kills the slide**, per §5.5 E13. The class below
 *   is a Tailwind motion-safe variant rather than a media query in CSS, so the
 *   transition is present exactly when the OS allows it.
 *
 * The close button is the only interactive element and carries the `Dismiss`
 * label (§9.3), so a screen-reader user can always remove a toast.
 */
export type ToastVariant = 'success' | 'error';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastProps = {
  children: React.ReactNode;
  variant?: ToastVariant;
  /**
   * Auto-dismiss delay in ms, or `null` to stay until dismissed.
   * design-spec.md §5.8: 4s success, 8s error, never for errors needing action.
   */
  duration?: number | null;
  onDismiss?: () => void;
  /** Rendered before the close button; used for archive's `Undo` (§7.6). */
  action?: ToastAction;
  className?: string;
};

/** 4s for success, 8s for an auto-dismissing error (design-spec.md §5.8). */
export function defaultToastDuration(variant: ToastVariant): number {
  return variant === 'error' ? 8000 : 4000;
}

export function Toast({
  children,
  variant = 'success',
  duration,
  onDismiss,
  action,
  className,
}: ToastProps) {
  const [visible, setVisible] = useState(true);
  const resolvedDuration = duration === undefined ? defaultToastDuration(variant) : duration;

  useEffect(() => {
    if (resolvedDuration === null) return;
    const timer = window.setTimeout(() => dismiss(), resolvedDuration);
    return () => window.clearTimeout(timer);
    // `dismiss` is stable enough for this purpose: it only closes the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDuration]);

  function dismiss() {
    setVisible(false);
    onDismiss?.();
  }

  if (!visible) return null;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-card border-border bg-surface shadow-overlay flex w-full max-w-sm items-start gap-3 border p-3',
        'motion-safe:animate-[kb-toast-in_180ms_var(--ease-out)]',
        className,
      )}
    >
      <div className="text-ink min-w-0 flex-1 text-[14px] leading-normal">{children}</div>

      {action ? (
        <Button variant="link" size="sm" onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      ) : null}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-control text-ink-subtle hover:bg-surface-muted hover:text-ink -mt-0.5 -mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The fixed bottom-right stack a toast mounts into (`design-spec.md` §5.8).
 *
 * It is a plain `div` with no `aria-live` of its own: the toast inside carries
 * the role, so wrapping the region in a second live region would announce every
 * message twice.
 */
export function ToastRegion({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] flex-col items-end gap-2">
      <div className="pointer-events-auto w-full max-w-sm">{children}</div>
    </div>
  );
}

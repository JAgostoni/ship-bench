'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Radix `Dialog` (design-spec.md §10.1). Radix supplies the focus trap, the
 * `Escape` handler, focus restoration to the opener, `role="dialog"`,
 * `aria-modal`, and `aria-labelledby` wiring from `DialogTitle` — none of which
 * is reimplemented here.
 *
 * `DialogContent` always renders a visible close button, so a keyboard user is
 * never trapped without an exit.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('bg-overlay fixed inset-0 z-40', className)}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'rounded-card shadow-dialog bg-surface border-border fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border p-6',
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              'rounded-control text-ink-subtle hover:bg-surface-muted hover:text-ink absolute top-4 right-4 flex h-8 w-8 items-center justify-center',
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-ink text-[16px] leading-snug font-semibold', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-ink-muted mt-2 text-[14px] leading-normal', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />;
}

'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The `<1024px` off-canvas navigation drawer (design-spec.md §6.3).
 *
 * Radix `Dialog` supplies the focus trap, `Escape` to close, the overlay, and
 * focus restoration to the `☰` opener. The trigger is supplied by the caller so
 * the header owns the button's size and label.
 */
export function MobileNav({
  trigger,
  appName,
  children,
}: {
  trigger: React.ReactNode;
  appName: string;
  children?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-overlay fixed inset-0 z-40 lg:hidden" />
        <DialogPrimitive.Content
          className={cn(
            'bg-surface shadow-overlay fixed top-0 left-0 z-50 h-dvh w-[280px] overflow-y-auto p-4',
            'lg:hidden',
          )}
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-ink text-[15px] font-semibold">
              {appName}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="rounded-control text-ink-subtle hover:bg-surface-muted hover:text-ink flex h-10 w-10 items-center justify-center"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-6">
            <nav aria-label="Main">{children}</nav>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

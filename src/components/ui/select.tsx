'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

/**
 * The trigger reuses the `Input` treatment so a select and a text input sit on
 * the same 36px baseline (design-spec.md §5.1's `Select` row).
 */
export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'rounded-control border-border-strong bg-surface text-ink flex h-9 w-full items-center justify-between gap-2 border px-3 text-[14px]',
        'hover:border-ink-muted',
        'focus-visible:border-accent focus-visible:outline-none',
        'disabled:bg-disabled-bg disabled:text-disabled-ink disabled:cursor-not-allowed',
        'aria-invalid:border-danger',
        '[&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="text-ink-subtle h-4 w-4 shrink-0" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'rounded-card shadow-overlay bg-surface border-border z-50 max-h-72 overflow-y-auto border p-1',
          position === 'popper' && 'w-(--radix-select-trigger-width)',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'rounded-control text-ink flex cursor-default items-center gap-2 py-1.5 pr-8 pl-2 text-[14px] outline-none select-none',
        'data-highlighted:bg-surface-muted data-highlighted:text-ink',
        'data-disabled:text-disabled-ink data-disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="text-accent-ink h-4 w-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        'text-ink-subtle px-2 py-1.5 text-[11px] tracking-[0.06em] uppercase',
        className,
      )}
      {...props}
    />
  );
}

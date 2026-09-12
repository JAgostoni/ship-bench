import { cn } from '@/lib/cn';

export type TextareaProps = React.ComponentPropsWithoutRef<'textarea'>;

/** Same treatment as `Input` (design-spec.md §5.1), resizable vertically only. */
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'rounded-control border-border-strong bg-surface text-ink w-full resize-y border px-3 py-2 text-[14px]',
        'placeholder:text-ink-subtle',
        'hover:border-ink-muted',
        'focus-visible:border-accent focus-visible:outline-none',
        'disabled:bg-disabled-bg disabled:text-disabled-ink disabled:cursor-not-allowed',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}

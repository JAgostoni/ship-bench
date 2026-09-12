import { cn } from '@/lib/cn';

export type InputProps = React.ComponentPropsWithoutRef<'input'>;

/**
 * design-spec.md §7.1's input states: default, hover, focus-visible, filled,
 * placeholder, error (`--danger` border + `aria-invalid`, set by `Field`), and
 * disabled. 36px tall so it lines up with `Button size="md"`.
 */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'rounded-control border-border-strong bg-surface text-ink h-9 w-full min-w-0 border px-3 text-[14px]',
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

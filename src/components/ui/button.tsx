import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * design-spec.md §5.1. The transition list and the "never `outline: none`"
 * rule are applied here once so no caller can drop them.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'rounded-control font-medium whitespace-nowrap',
    'transition-[background-color,color,border-color] duration-[120ms]',
    'disabled:pointer-events-none disabled:bg-disabled-bg disabled:text-disabled-ink',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-hover',
        secondary:
          'border-border-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-sunken border',
        ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-sunken',
        danger: 'bg-danger text-danger-on hover:bg-danger-hover active:bg-danger-hover',
        link: 'text-accent-ink no-underline hover:text-accent-ink-hover hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-[14px]',
        lg: 'h-10 px-5 text-[15px]',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Renders the caller's child element with the button's classes instead of a
     * `<button>`, so a link can look like a button without nesting interactive
     * elements.
     */
    asChild?: boolean;
    /** Shows a leading spinner and sets `aria-busy`. The label is never removed. */
    loading?: boolean;
  };

/**
 * One button, five variants (design-spec.md §5.1). The loading state keeps the
 * label and reserves the spinner's width, so the button never changes size and
 * never loses its accessible name.
 *
 * This is the only primitive that needs `forwardRef` in iteration 4. The rest
 * spread `ref` through their `ComponentPropsWithoutRef` props: React 19 treats
 * `ref` as an ordinary prop on function components, so threading it explicitly
 * would add no behaviour. (`@radix-ui/react-slot`'s `Slot` does read a `ref` prop,
 * which is why `asChild` works without a wrapper element.)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    disabled,
    children,
    type,
    ...props
  },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot className={classes} aria-busy={loading || undefined} {...props}>
        {children as ReactNode}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * design-spec.md §5.1 / §4.5: `draft` and `archived` only.
 *
 * There is deliberately **no `published` variant** (design-spec.md §10.6 rule 6)
 * — published is the default state and a badge on every row is noise. The full
 * word is always rendered; colour is never the only signal (§9.4).
 */
const badgeVariants = cva(
  'rounded-pill inline-flex items-center text-[12px] font-medium tracking-[0.02em] uppercase',
  {
    variants: {
      variant: {
        draft: 'bg-warning-soft text-warning px-2 py-0.5',
        archived: 'bg-surface-muted text-ink-muted px-2 py-0.5',
      },
    },
  },
);

export type BadgeProps = React.ComponentPropsWithoutRef<'span'> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

import { cn } from '@/lib/cn';

export type SkeletonProps = React.ComponentPropsWithoutRef<'div'>;

/**
 * design-spec.md §5.7: a `--surface-sunken` block with `rounded-control`, and
 * **no shimmer for the first 400 ms** so a fast render never flickers.
 *
 * Each block is `aria-hidden`. The `role="status" aria-label="Loading"` wrapper
 * belongs to `SkeletonRegion`, not to the individual blocks — otherwise a screen
 * reader announces dozens of meaningless nodes.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-surface-sunken rounded-control', className)}
      {...props}
    />
  );
}

/**
 * The `role="status"` container for a group of skeletons. `aria-busy` is not set
 * because the region is replaced wholesale when the data arrives.
 */
export function SkeletonRegion({
  label = 'Loading',
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { label?: string }) {
  return (
    <div role="status" aria-label={label} className={className} {...props}>
      {children}
    </div>
  );
}

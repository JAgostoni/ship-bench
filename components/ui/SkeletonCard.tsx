export function SkeletonCard() {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="skeleton mb-3 h-5 w-3/5 rounded" />
      <div className="skeleton mb-2 h-4 w-full rounded" />
      <div className="skeleton mb-4 h-4 w-4/5 rounded" />
      <div className="skeleton h-3 w-2/5 rounded" />
    </div>
  );
}

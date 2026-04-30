interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div
      className={`bg-slate-200 rounded ${reduced ? '' : 'animate-pulse'} ${className}`}
      aria-hidden="true"
    />
  );
}

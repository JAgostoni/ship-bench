import type { ReactNode } from "react";

/** Count chip (design §4.7) — v1 use: article count on S1/S3 page headers. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-1 text-sm text-text-secondary">
      {children}
    </span>
  );
}

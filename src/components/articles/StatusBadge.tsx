import type { ArticleStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type StatusBadgeProps = {
  status: ArticleStatus;
  /** When true, also render Published (default: Draft only). */
  showPublished?: boolean;
};

/**
 * Draft badge by default; Published only if showPublished.
 * design-spec §3.5 / §6.5.
 */
export function StatusBadge({
  status,
  showPublished = false,
}: StatusBadgeProps) {
  if (status === "DRAFT") {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-900">
        Draft
      </Badge>
    );
  }

  if (showPublished) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-900">
        Published
      </Badge>
    );
  }

  return null;
}

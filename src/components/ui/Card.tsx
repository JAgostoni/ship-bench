import Link from "next/link";
import { formatDateTime, formatRelativeTime } from "@/lib/time";

export type CardProps = {
  id: number;
  title: string;
  updatedAt: number;
};

/**
 * Link-wrapped article card (design §1.3/S1, states §4.5). The whole card is
 * a single link — never nest other interactive elements inside.
 */
export function Card({ id, title, updatedAt }: CardProps) {
  return (
    <Link
      href={`/articles/${id}`}
      className="group block rounded-md border border-border bg-surface p-4 hover:border-border-strong active:translate-y-px"
    >
      <span className="line-clamp-2 text-lg font-semibold text-text group-hover:text-accent">
        {title}
      </span>
      <span className="mt-1 block text-sm text-text-secondary">
        Updated{" "}
        <time
          dateTime={new Date(updatedAt).toISOString()}
          title={formatDateTime(updatedAt)}
        >
          {formatRelativeTime(updatedAt)}
        </time>
      </span>
    </Link>
  );
}

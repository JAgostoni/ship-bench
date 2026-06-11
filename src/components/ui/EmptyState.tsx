import type { ReactNode } from "react";

export type EmptyStateProps = {
  /** 32px icon, rendered in `--color-text-muted` (design §5). */
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  /**
   * Title element. Default h2 at 18px (§5); the 404 page passes "h1" since
   * the empty-state title is that page's only heading, at 22px (§1.3/S6).
   */
  titleAs?: "h1" | "h2";
};

export function EmptyState({
  icon,
  title,
  body,
  action,
  titleAs: TitleTag = "h2",
}: EmptyStateProps) {
  return (
    <div className="mx-auto mt-16 flex max-w-empty flex-col items-center gap-3 text-center">
      <span className="text-text-muted">{icon}</span>
      <TitleTag
        className={
          TitleTag === "h1" ? "text-xl font-semibold" : "text-lg font-semibold"
        }
      >
        {title}
      </TitleTag>
      <p className="text-base text-text-secondary">{body}</p>
      {action}
    </div>
  );
}

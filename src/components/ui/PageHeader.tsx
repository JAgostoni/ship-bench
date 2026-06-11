import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  /** Count badge or action buttons, aligned right (design §4.7). */
  rightSlot?: ReactNode;
  /** 28px page h1 by default; "xl" = 22px section h1 (search, editor pages). */
  titleSize?: "2xl" | "xl";
};

export function PageHeader({
  title,
  rightSlot,
  titleSize = "2xl",
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-4">
      <h1
        className={
          titleSize === "2xl" ? "text-2xl font-bold" : "text-xl font-semibold"
        }
      >
        {title}
      </h1>
      {rightSlot}
    </div>
  );
}

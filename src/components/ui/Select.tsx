import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

/**
 * Native select styling — design-spec §6.2.
 */
export function Select({
  className = "",
  error = false,
  disabled,
  children,
  ...rest
}: SelectProps) {
  return (
    <select
      disabled={disabled}
      aria-invalid={error || undefined}
      className={[
        "h-10 w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] px-3 text-sm text-[var(--color-text)]",
        "transition-colors hover:border-[var(--color-border-strong)]",
        "focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]/30",
        "disabled:cursor-not-allowed disabled:bg-[var(--color-bg-subtle)] disabled:text-[var(--color-text-muted)]",
        error
          ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20"
          : "border-[var(--color-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </select>
  );
}

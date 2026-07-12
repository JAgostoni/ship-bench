import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

/**
 * Textarea — design-spec §6.2 (ready for Iteration 3 form).
 */
export function Textarea({
  className = "",
  error = false,
  disabled,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      disabled={disabled}
      aria-invalid={error || undefined}
      className={[
        "min-h-[120px] w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)]",
        "placeholder:text-[var(--color-text-muted)]",
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
    />
  );
}

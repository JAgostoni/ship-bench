import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] border-transparent hover:bg-[var(--color-accent-hover)]",
  secondary:
    "bg-[var(--color-bg-elevated)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-subtle)]",
  danger:
    "bg-[var(--color-danger)] text-white border-transparent hover:bg-[var(--color-danger-hover)]",
  "danger-ghost":
    "bg-transparent text-[var(--color-danger)] border-transparent hover:bg-[var(--color-danger-muted)]",
};

/**
 * Shared button — design-spec §6.1.
 */
export function Button({
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-inherit",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

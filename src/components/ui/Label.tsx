import type { LabelHTMLAttributes, ReactNode } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  required?: boolean;
};

/**
 * Form label with optional required asterisk — design-spec §6.2.
 */
export function Label({
  children,
  required,
  className = "",
  ...rest
}: LabelProps) {
  return (
    <label
      className={[
        "mb-1 block text-sm font-medium text-[var(--color-text)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

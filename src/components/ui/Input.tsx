import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { AlertCircleIcon } from "./icons";

export type InputProps = {
  /** Always-visible label above the field (design §4.2); `labelHidden` keeps it SR-only (header search). */
  label: string;
  labelHidden?: boolean;
  /** Validation message; wires `aria-invalid` + `aria-describedby` (§4.2 error row). */
  error?: string;
  /** Optional 16px leading icon inside the field. */
  leadingIcon?: ReactNode;
  id: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function Input({
  label,
  labelHidden = false,
  error,
  leadingIcon,
  id,
  className,
  ...rest
}: InputProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cx(
          labelHidden ? "sr-only" : "mb-1.5 block text-base font-medium",
        )}
      >
        {label}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-text-muted">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(
            "h-10 w-full rounded-sm border bg-surface px-3 text-md",
            "placeholder:text-text-muted",
            leadingIcon ? "pl-9" : null,
            error
              ? "border-danger"
              : "border-border-strong hover:border-text-secondary",
          )}
          {...rest}
        />
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 flex items-center gap-1 text-sm text-danger-text"
        >
          <AlertCircleIcon size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

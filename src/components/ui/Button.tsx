import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cx } from "@/lib/cx";
import { SpinnerIcon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost-danger";

/*
 * Design §4.1. Height 40px at ≥lg, 44px below (touch targets, §3.3).
 * The two stacked grid cells lock the width across the loading swap so the
 * button never shifts layout (§4.1 loading row).
 */
const base =
  "inline-grid place-items-center h-11 lg:h-10 px-4 rounded-sm text-base " +
  "font-medium whitespace-nowrap cursor-pointer " +
  "active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed " +
  "disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-surface text-text border border-border-strong hover:bg-bg",
  danger: "bg-danger text-white hover:bg-danger-hover",
  "ghost-danger": "text-danger-text hover:bg-danger-bg",
};

type CommonProps = {
  variant?: ButtonVariant;
  /** Optional 16px leading icon (design §4.1), swapped for the spinner while loading. */
  icon?: ReactNode;
  children: ReactNode;
};

type ButtonAsLink = CommonProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >;

type ButtonAsButton = CommonProps & {
  href?: undefined;
  /** Real `disabled` + spinner + verb label; width stays locked (§4.1). */
  loading?: boolean;
  /** Verb label shown while loading, e.g. "Saving…". */
  loadingLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type ButtonProps = ButtonAsLink | ButtonAsButton;

function Label({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2">
      {icon}
      {children}
    </span>
  );
}

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant = "primary", icon, children, className, ...rest } = props;
    return (
      <Link className={cx(base, variants[variant], className)} {...rest}>
        <Label icon={icon}>{children}</Label>
      </Link>
    );
  }

  const {
    variant = "primary",
    icon,
    children,
    className,
    loading = false,
    loadingLabel,
    disabled,
    type = "button",
    ...rest
  } = props;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(base, variants[variant], className)}
      {...rest}
    >
      <span
        className={cx(
          "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
          loading && "invisible",
        )}
      >
        {icon}
        {children}
      </span>
      {loadingLabel !== undefined && (
        <span
          role="status"
          className={cx(
            "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
            !loading && "invisible",
          )}
          aria-hidden={loading ? undefined : true}
        >
          <SpinnerIcon />
          {loadingLabel}
        </span>
      )}
    </button>
  );
}

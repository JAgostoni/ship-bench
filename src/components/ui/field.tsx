import * as LabelPrimitive from '@radix-ui/react-label';
import { AlertCircle } from 'lucide-react';
import { cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/cn';

export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

/** 13px/500 `--ink`, per design-spec.md §8.3's field-label row. */
export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn('text-ink text-[13px] leading-[1.4] font-medium', className)}
      {...props}
    />
  );
}

export type FieldProps = {
  /** Rendered as the label text. */
  label: string;
  /** The control's `id`; also the prefix for `${id}-hint` and `${id}-error`. */
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Exactly one control element, e.g. `<Input id={…} />`. */
  children: React.ReactNode;
};

type FieldChildProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};

/**
 * The **only** way to render a labelled control, per design-spec.md §5.2.
 *
 * A bare `<Label>` + control pair would let every call site invent its own error
 * wiring. This component is what makes `aria-describedby` and `aria-invalid` the
 * default rather than an afterthought: the control receives the ids of whichever
 * of hint/error are present, joined in that order.
 *
 * The child is cloned rather than wrapped so the extra `aria-*` attributes land
 * on the control element itself — where assistive technology reads them — and
 * the caller keeps full control over the element it renders.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  let control = children;
  if (isValidElement<FieldChildProps>(children)) {
    const existing = children.props;
    const mergedDescribedBy = [existing['aria-describedby'], describedBy].filter(Boolean).join(' ');

    control = cloneElement(children, {
      'aria-describedby': mergedDescribedBy || undefined,
      'aria-invalid': error ? true : existing['aria-invalid'],
      required: required || existing.required ? true : undefined,
    });
  }

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger ml-0.5">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-ink-subtle text-[12px] leading-[1.4]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-danger flex items-start gap-1 text-[12px] leading-[1.4] font-medium"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

import { type InputHTMLAttributes, useId } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
        }
        className={clsx(
          'h-10 px-3 text-sm rounded-md border bg-white text-neutral-900 placeholder:text-neutral-400',
          'focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20',
          'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed',
          error ? 'border-red-500' : 'border-neutral-300',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}

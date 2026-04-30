import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    confirmRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  if (!isOpen) return null;

  const confirmStyle =
    confirmVariant === 'danger'
      ? 'bg-danger text-white hover:bg-red-700'
      : 'bg-accent text-white hover:bg-accent-hover';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative bg-white rounded-xl shadow-xl border border-border max-w-sm w-full mx-4 p-6"
      >
        <div className="flex items-start justify-between mb-2">
          <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${confirmStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

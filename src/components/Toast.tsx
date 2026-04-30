import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  variant: ToastVariant;
  message: string;
  duration?: number;
  onDismiss: () => void;
}

const icons: Record<ToastVariant, typeof Info> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles: Record<ToastVariant, string> = {
  success: 'bg-white border-success text-success',
  error: 'bg-white border-danger text-danger',
  info: 'bg-white border-accent text-accent',
};

export default function Toast({ variant, message, duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const Icon = icons[variant];

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(true);
    }

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, prefersReduced ? 0 : 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-transform duration-200 ${styles[variant]} ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium text-text-primary">{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 200);
        }}
        className="ml-2 p-1 rounded hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}

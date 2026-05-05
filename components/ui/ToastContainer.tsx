'use client';

import { Toaster } from 'sonner';

export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        className: 'text-[var(--text-sm)]',
        duration: 2000,
      }}
    />
  );
}

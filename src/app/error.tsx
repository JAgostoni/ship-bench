'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8 py-8">
      <div className="bg-white rounded-lg p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-neutral-500 mb-6">
          We couldn&apos;t complete your request. Please try again.
        </p>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

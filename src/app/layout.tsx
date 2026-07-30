"use client";
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Article App',
  description: 'MVP article browsing and editing',
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-gray-light)] min-h-screen">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}

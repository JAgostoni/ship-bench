// src/app/layout.tsx
import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { LayoutShell } from '@/components/LayoutShell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'TeamKB - Premium Knowledge Base Workspace',
  description: 'A lightning-fast, high-readability team knowledge base and technical markdown editor workspace.',
  icons: {
    icon: '📚',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render Sidebar Server Component directly in Server Layout
  const sidebarComponent = <Sidebar />;

  return (
    <html lang="en">
      <body id="team-kb-root">
        <Suspense fallback={<div style={{ padding: 'var(--spacing-xl)', color: 'hsl(var(--text-muted-hsl))' }}>Loading Workspace...</div>}>
          <LayoutShell sidebar={sidebarComponent}>
            {children}
          </LayoutShell>
        </Suspense>
      </body>
    </html>
  );
}

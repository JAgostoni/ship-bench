import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppHeader } from '@/components/layout/AppHeader';
import '@/app/global.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'Internal team knowledge base',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--z-toast)] focus:rounded focus:bg-[var(--color-surface)] focus:px-3 focus:py-2 focus:shadow-md"
        >
          Skip to content
        </a>
        <AppHeader />
        <main id="main-content" className="pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { SkipLink } from '@/components/layout/skip-link';
import { ThemeProvider } from '@/components/layout/theme-provider';
import './globals.css';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Team Knowledge Base';

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: 'A shared knowledge base for internal documentation.',
};

/**
 * Root layout: `ThemeProvider`, the skip link, and nothing else.
 *
 * The application shell lives in the `(shell)` route group rather than here,
 * because design-spec.md §2.2 requires the editor routes to render a *focused*
 * shell with no sidebar, no TOC, and no header search. A route group per shell
 * maps that requirement directly; putting the full shell at the root and then
 * unwinding it per route would fight the framework.
 *
 * `SkipLink` is the first focusable element in the DOM (design-spec.md §9.2's
 * focus order), which is why it precedes all layout chrome.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SkipLink />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

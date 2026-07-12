import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

/**
 * Content wrapper: max width, horizontal padding, main landmark.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="min-h-screen bg-surface text-text-primary flex flex-col">
      <Header onMenuToggle={toggleDrawer} />
      <div className="flex flex-1 pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 bg-slate-50 border-r border-border">
          <Sidebar onNavigate={closeDrawer} />
        </aside>

        {/* Tablet/mobile drawer */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={closeDrawer}
              aria-hidden="true"
            />
            <div
              className="fixed top-14 left-0 bottom-0 w-60 bg-slate-50 border-r border-border z-50 lg:hidden shadow-lg"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <Sidebar onNavigate={closeDrawer} />
            </div>
          </>
        )}

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

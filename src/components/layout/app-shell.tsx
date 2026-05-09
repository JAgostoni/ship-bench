'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { Footer } from './footer';

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  _count?: { articles: number };
}

interface AppShellProps {
  children: React.ReactNode;
  categories: CategoryData[];
}

export function AppShell({ children, categories }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Determine active category slug from the URL
  let activeSlug: string | undefined;
  if (pathname.startsWith('/categories/')) {
    activeSlug = pathname.split('/')[2];
  }

  return (
    <>
      <Header onMenuToggle={() => setMenuOpen(!menuOpen)} isMenuOpen={menuOpen} />
      <div className="flex flex-1">
        <Sidebar
          categories={categories}
          activeSlug={activeSlug}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <main id="main-content" className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}

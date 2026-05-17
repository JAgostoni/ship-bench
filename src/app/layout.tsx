import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Nav } from '@/components/Nav';
import { MobileNav } from '@/components/MobileNav';
import { listCategories } from '@/lib/categories';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'Internal knowledge base',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const categories = await listCategories();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans flex flex-col md:flex-row h-screen overflow-hidden`}
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Suspense>
          <MobileNav categories={categories} />
        </Suspense>
        <Nav categories={categories} />
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

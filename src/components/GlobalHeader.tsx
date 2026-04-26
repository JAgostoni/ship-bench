'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';

export default function GlobalHeader() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        router.push(`/articles?q=${encodeURIComponent(query)}`);
      } else {
        router.push('/');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, router]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <span className="font-bold">KB</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">KnowledgeBase</span>
        </Link>

        {/* Search Bar */}
        <div className="relative flex flex-1 max-w-md mx-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
            placeholder="Search knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search knowledge base"
          />
        </div>

        {/* Actions */}
        <Link 
          href="/articles/new" 
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Article</span>
        </Link>
      </div>
    </header>
  );
}

// src/components/CategoryLink.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface CategoryLinkProps {
  href: string;
  slug: string;
  className: string;
  activeClassName: string;
  children: React.ReactNode;
}

export function CategoryLink({ href, slug, className, activeClassName, children }: CategoryLinkProps) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || '';
  
  // "All Articles" is active when there's no category query param
  const isActive = slug === '' ? currentCategory === '' : currentCategory === slug;

  return (
    <Link 
      href={href} 
      className={`${className} ${isActive ? activeClassName : ''}`}
    >
      {children}
    </Link>
  );
}

// src/components/LayoutShell.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './LayoutShell.module.css';

interface LayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function LayoutShell({ sidebar, children }: LayoutShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync search input value with URL search param
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    setSearchValue(currentSearch);
  }, [searchParams]);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        
        // On mobile, trigger full-screen search view
        if (window.innerWidth < 768) {
          setIsMobileSearchActive(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchValue);
  };

  const executeSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }
    
    // Close mobile search on submit
    setIsMobileSearchActive(false);
    searchInputRef.current?.blur();
    
    router.push(`/articles?${params.toString()}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    // Note: Debounced search-as-you-type can be implemented in Iteration 3
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleMobileSearchFocus = () => {
    if (window.innerWidth < 768) {
      setIsMobileSearchActive(true);
    }
  };

  const handleMobileSearchClose = () => {
    setIsMobileSearchActive(false);
  };

  return (
    <div className={`${styles.shellContainer} ${isMobileSearchActive ? styles.mobileSearchActive : ''}`}>
      {/* Persistent Header */}
      <header className={styles.globalHeader} role="banner">
        <div className={styles.leftGroup}>
          <button 
            className={styles.menuToggleBtn}
            onClick={toggleSidebar}
            aria-expanded={isSidebarOpen}
            aria-label="Toggle Category Navigation"
            type="button"
          >
            <span className={styles.menuToggleIcon}>{isSidebarOpen ? '✕' : '☰'}</span>
          </button>

          <div className={styles.logoGroup}>
            <Link href="/" className={styles.logoLink} aria-label="Knowledge Base Home">
              <span className={styles.logoIcon}>📚</span>
              <span className={styles.logoText}>TeamKB</span>
            </Link>
          </div>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input 
            type="search" 
            ref={searchInputRef}
            id="global-search" 
            className={styles.searchInput}
            placeholder="Search articles... (Ctrl+K)" 
            aria-label="Search articles"
            value={searchValue}
            onChange={handleSearchChange}
            onFocus={handleMobileSearchFocus}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                searchInputRef.current?.blur();
                setIsMobileSearchActive(false);
              }
            }}
          />
          <span className={styles.kbdBadge} aria-hidden="true">Ctrl K</span>
          
          <button 
            type="button" 
            className={styles.mobileSearchCloseBtn}
            onClick={handleMobileSearchClose}
            aria-label="Close search"
          >
            ✕
          </button>
        </form>

        {/* Right Header Navigation Hooks */}
        <div className={styles.rightGroup}>
          <Link href="/articles/new" className={styles.newArticleBtn} aria-label="Create New Article">
            <span aria-hidden="true">＋</span>
            <span className={styles.newArticleText}>New Article</span>
          </Link>
        </div>
      </header>

      {/* Grid wrapper containing Sidebar and MainPane */}
      <div className={styles.layoutGrid}>
        {/* Scrim backdrop overlay for mobile/tablet drawer */}
        <div 
          className={`${styles.scrim} ${isSidebarOpen ? styles.scrimActive : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        {/* Client-side wrapper to pass dynamic toggle state to Server Sidebar */}
        {React.isValidElement(sidebar) 
          ? React.cloneElement(sidebar as React.ReactElement<any>, { isOpen: isSidebarOpen })
          : sidebar}

        {/* Content Pane */}
        <main id="main-content" className={styles.mainPane} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

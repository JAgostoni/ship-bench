import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Home, Folder, PlusCircle, Search as SearchIcon } from 'lucide-react';
import styles from './Layout.module.css';
import { Category } from '@kb/types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3001/api/categories');
      return response.data;
    },
  });

  // Update local state when search params change (e.g., back button)
  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounced search navigation
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchValue !== currentSearch) {
        if (searchValue) {
          navigate(`/?search=${encodeURIComponent(searchValue)}`);
        } else if (currentSearch) {
          navigate('/');
        }
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, navigate, searchParams]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Link to="/">KB<span>.</span></Link>
        </div>

        <div className={styles.searchContainer}>
          <SearchIcon className={styles.searchIcon} size={16} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search articles..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <div className={styles.searchShortcut}>
            {window.navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
          </div>
        </div>
        
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive && !searchParams.has('category') && !searchParams.has('search') ? `${styles.navLink} ${styles.active}` : styles.navLink}
          >
            <Home size={18} />
            <span>Home</span>
          </NavLink>
        </nav>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Categories</h3>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <ul className={styles.categoryList}>
              {categories?.map((category) => (
                <li key={category.id}>
                  <NavLink 
                    to={`/?category=${category.slug}`}
                    className={({ isActive }) => isActive ? `${styles.categoryLink} ${styles.active}` : styles.categoryLink}
                  >
                    <Folder size={16} />
                    <span>{category.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.footer}>
          <Link to="/articles/new" className={styles.createButton}>
            <PlusCircle size={18} />
            <span>New Article</span>
          </Link>
        </div>
      </aside>
      
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

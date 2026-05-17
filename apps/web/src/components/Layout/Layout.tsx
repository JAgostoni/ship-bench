import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Home, Folder, PlusCircle } from 'lucide-react';
import styles from './Layout.module.css';
import { Category } from '@kb/types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3001/api/categories');
      return response.data;
    },
  });

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Link to="/">KB<span>.</span></Link>
        </div>
        
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
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
          <Link to="/new" className={styles.createButton}>
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

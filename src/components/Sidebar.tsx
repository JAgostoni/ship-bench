import { NavLink } from 'react-router-dom';
import { LayoutGrid, FolderOpen } from 'lucide-react';

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const linkClass =
    'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors';

  return (
    <nav className="p-3 space-y-1" aria-label="Sidebar navigation">
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `${linkClass} ${isActive ? 'text-accent bg-accent-subtle' : 'text-text-secondary hover:bg-slate-100'}`
        }
      >
        <LayoutGrid className="w-4 h-4" />
        All Articles
      </NavLink>

      <button
        type="button"
        disabled
        className={`${linkClass} w-full text-left text-text-tertiary cursor-not-allowed opacity-60`}
        title="Coming soon"
      >
        <FolderOpen className="w-4 h-4" />
        Categories
      </button>
    </nav>
  );
}

import { Menu, Plus, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchInput from './SearchInput';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-50 flex items-center px-4 gap-3">
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-text-secondary" />
      </button>

      <Link
        to="/"
        className="flex items-center gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-accent rounded-md"
      >
        <PenLine className="w-5 h-5 text-accent" />
        <span className="font-semibold text-base hidden sm:inline">Knowledge Base</span>
      </Link>

      <div className="flex-1 flex justify-center max-w-[480px] mx-auto">
        <SearchInput />
      </div>

      <Link
        to="/articles/new"
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
      >
        <Plus className="w-4 h-4" />
        New Article
      </Link>

      <Link
        to="/articles/new"
        className="md:hidden p-2 rounded-md bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        aria-label="New article"
      >
        <Plus className="w-5 h-5" />
      </Link>
    </header>
  );
}

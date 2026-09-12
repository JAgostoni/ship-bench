'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

/**
 * `true` after hydration, `false` during it.
 *
 * `useSyncExternalStore` is the supported alternative to the `useEffect(() => setState(true), [])`
 * mount flag: calling `setState` inside an effect body triggers a cascading render
 * (and is an ESLint error in this repo's config), whereas the server snapshot here
 * makes React itself return `false` on the server and the client's `true` after
 * hydration, with no extra render pass.
 */
const subscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * `next-themes` trigger plus a small `role="menu"` popover
 * (design-spec.md §5.1's theme-toggle row and §9.3's labelling).
 *
 * A Radix `DropdownMenu` would be the obvious choice, but the dependency is not
 * in the pinned set (architecture.md §3.2), and the spec's requirements here are
 * exactly three items with `role="menuitemradio"` + `aria-checked` — small
 * enough to implement against the platform rather than add a package for.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useHydrated();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // The menu is inert until the client knows the resolved theme, so the first
  // paint matches the server's.

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const CurrentIcon = mounted ? (resolvedTheme === 'dark' ? Moon : Sun) : Sun;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink flex h-9 w-9 items-center justify-center"
      >
        <CurrentIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Change theme"
          className="rounded-card shadow-overlay bg-surface border-border absolute right-0 z-50 mt-1 w-40 border p-1"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const checked = current.value === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  'rounded-control flex w-full items-center gap-2 px-2 py-1.5 text-left text-[14px]',
                  'hover:bg-surface-muted',
                  checked ? 'text-accent-ink' : 'text-ink',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

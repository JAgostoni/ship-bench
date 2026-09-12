'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Scroll depth after which the control appears, per design-spec.md §3.4. */
const REVEAL_AT_PX = 2000;

/**
 * `Back to top` (design-spec.md §3.4's "Very long article" state).
 *
 * It is rendered only past ~2000px of scroll depth and is `position: fixed` in the
 * bottom-right. Announcement is not needed — the button's accessible name is its
 * label, and it appears only in response to the user's own scrolling.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY >= REVEAL_AT_PX);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="rounded-control border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink shadow-card fixed right-6 bottom-6 z-20 hidden items-center gap-1.5 border px-3 py-2 text-[13px] md:flex"
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
      Back to top
    </button>
  );
}

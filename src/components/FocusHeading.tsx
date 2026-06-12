"use client";

import { useEffect } from "react";

/** Set by the editor just before its post-save `router.push` (design §7.5). */
export const FOCUS_H1_FLAG = "kb-focus-h1";

/**
 * Rendered on the article detail page: after a client-side post-save
 * navigation it moves focus to the page h1 (`tabindex="-1"`), so landing on
 * the new/updated article is both announced and visually anchored (§7.5).
 * Regular visits (no flag) leave focus alone.
 */
export function FocusHeading() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FOCUS_H1_FLAG) === null) {
        return;
      }
      sessionStorage.removeItem(FOCUS_H1_FLAG);
    } catch {
      return;
    }
    document.querySelector<HTMLElement>("main h1")?.focus();
  }, []);
  return null;
}

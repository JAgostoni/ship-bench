import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names, with later Tailwind utilities winning over
 * earlier conflicting ones. Verbatim from design-spec.md §10.3.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Focus ring for standalone controls, from design-spec.md §10.3. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/** Focus ring for rows inside an `overflow: hidden` container, from §10.3. */
export const focusRingInset =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';

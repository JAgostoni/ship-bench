import { randomBytes } from 'node:crypto';
import slugifyBase from 'slugify';

/** Maximum slug length, matching architecture.md §8.7's defensive bound. */
export const MAX_SLUG_LENGTH = 80;

/** Number of `-n` attempts before falling back to a random suffix. */
export const MAX_UNIQUE_ATTEMPTS = 50;

/**
 * Lowercases, strips diacritics, collapses non-alphanumerics to single hyphens,
 * trims leading/trailing hyphens, and caps the result at 80 characters.
 * Returns `''` when nothing slug-worthy remains (e.g. `'!!!'`).
 */
export function slugify(input: string): string {
  const base = slugifyBase(input, { lower: true, strict: true, trim: true });
  return base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}

/**
 * Returns the first available slug derived from `base`.
 *
 * Candidates are `base`, `base-2`, `base-3`, … up to 50 attempts. If every
 * candidate is taken (pathological, but possible) the slug falls back to a
 * six-character random suffix. The deterministic path never uses randomness so
 * tests and callers can reason about it.
 */
export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  for (let attempt = 1; attempt <= MAX_UNIQUE_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    if (!exists(candidate)) {
      return candidate;
    }
  }
  return `${base}-${randomBytes(3).toString('hex')}`;
}

/**
 * The one place the `Editing as` default string is written down.
 *
 * It is a plain module rather than a field on `src/server/display-name.ts` because
 * that module is `server-only` — it reads `next/headers` — and the chip is a Client
 * Component that has to render the same string. `src/server/display-name.ts` imports
 * this constant rather than repeating it, and a unit test asserts the two agree, so
 * the fallback cannot drift between the cookie reader and the chip.
 */
export const DISPLAY_NAME_COOKIE = 'kb_display_name';

/** One year, in seconds (design-spec.md §4.6). */
export const DISPLAY_NAME_MAX_AGE = 31_536_000;

/** The label recorded when no display name has been set. */
export const ANONYMOUS_EDITOR = 'Anonymous editor';

import 'server-only';
import { cookies } from 'next/headers';
import {
  ANONYMOUS_EDITOR,
  DISPLAY_NAME_COOKIE,
  DISPLAY_NAME_MAX_AGE,
} from '@/lib/display-name-constants';

/**
 * The server half of the `Editing as` affordance (design-spec.md §4.6,
 * `docs/iterations/iteration-6.md` task 6.2).
 *
 * The string constants live in `src/lib/display-name-constants.ts` so the Client
 * Component chip can render the same fallback without importing a `server-only`
 * module. This file is the only place that touches the request's cookie jar.
 *
 * `httpOnly: false` is required rather than lax: the chip is a Client Component and
 * reads the value so it can render the current name without a round trip. The value
 * is a display label, not a credential — v1 has no authentication at all
 * (`architecture.md` §16.1 A1) — so client readability leaks nothing.
 */
export { ANONYMOUS_EDITOR, DISPLAY_NAME_COOKIE, DISPLAY_NAME_MAX_AGE };

/**
 * The raw `kb_display_name` cookie value, or `null` when the user has not set one.
 *
 * The chip needs this distinction: `readDisplayName()` resolves the fallback into the
 * string `'Anonymous editor'`, which is right for a revision row but wrong for the
 * sidebar — the chip has to know whether a name was *actually* set so it can render the
 * "you should set this" warning dot (design-spec.md §4.6). Collapsing the two would make
 * the nudge never appear.
 */
export async function readDisplayNameCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(DISPLAY_NAME_COOKIE)?.value.trim();
  return value ? value : null;
}

/**
 * The editor name recorded on a revision for the current request.
 *
 * A Server Action resolves this once per mutation and passes it down to the repository,
 * which is why `editorName` is a **required** field of every write payload
 * (`src/server/repositories/articles.ts`).
 */
export async function readDisplayName(): Promise<string> {
  return (await readDisplayNameCookie()) ?? ANONYMOUS_EDITOR;
}

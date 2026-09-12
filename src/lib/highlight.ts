import type { SearchSegment } from '@/types/domain';

/** START sentinel emitted by FTS5 `highlight()` / `snippet()` via `char(1)`. */
export const MATCH_START = '\u0001';
/** END sentinel emitted by FTS5 `highlight()` / `snippet()` via `char(2)`. */
export const MATCH_END = '\u0002';

/**
 * Splits FTS5 sentinel-delimited text into plain-text segments.
 *
 * Returning `{ text, match }[]` rather than HTML keeps the API
 * presentation-agnostic and lets the UI render each segment as a React text
 * node, so escaping is automatic and `dangerouslySetInnerHTML` is never needed
 * (architecture.md §6.7, §8.1; design-spec.md §10.6 rule 3).
 *
 * Adjacent match segments merge into one. Empty input and sentinel-only input
 * both yield `[]`.
 */
export function splitSegments(marked: string): SearchSegment[] {
  if (!marked) return [];

  const segments: SearchSegment[] = [];
  let cursor = 0;

  const push = (text: string, match: boolean) => {
    // Malformed input can leave a stray sentinel in the text (a duplicated or
    // unbalanced marker). FTS5 never emits that, but stripping any leftover
    // sentinel makes the function total: control characters can never reach the
    // rendered output.
    const clean = text.replaceAll(MATCH_START, '').replaceAll(MATCH_END, '');
    if (!clean) return;
    const previous = segments.at(-1);
    if (previous && previous.match === match) {
      previous.text += clean;
      return;
    }
    segments.push({ text: clean, match });
  };

  while (cursor < marked.length) {
    const start = marked.indexOf(MATCH_START, cursor);

    if (start === -1) {
      push(marked.slice(cursor), false);
      break;
    }

    push(marked.slice(cursor, start), false);

    const end = marked.indexOf(MATCH_END, start + MATCH_START.length);
    if (end === -1) {
      // An unterminated sentinel: treat the rest as matched text.
      push(marked.slice(start + MATCH_START.length), true);
      break;
    }

    push(marked.slice(start + MATCH_START.length, end), true);
    cursor = end + MATCH_END.length;
  }

  return segments;
}

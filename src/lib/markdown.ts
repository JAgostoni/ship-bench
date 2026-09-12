const FENCED_CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE = /`([^`]*)`/g;
const IMAGES = /!\[[^\]]*\]\([^)]*\)/g;
const LINKS = /\[([^\]]*)\]\([^)]*\)/g;
const HEADING = /^#{1,6}\s+/gm;
const BLOCKQUOTE = /^\s{0,3}>\s?/gm;
const TASK_LIST = /^\s*[-*+]\s+\[[ xX]\]\s+/gm;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/gm;
const TABLE_DELIMITER_ROW = /^\s*\|?[\s:|-]+\|[\s:|-]*$/gm;
const TABLE_PIPES = /\|/g;
const ANGLE_TOKENS = /<\/?[a-zA-Z][^>]*>/g;
const EMPHASIS = /(\*\*|__|\*|_|~~)/g;
const WHITESPACE = /\s+/g;

/**
 * Reduces Markdown to plain text for excerpts and reading-time estimates.
 *
 * Fenced and inline code, link destinations, headings, blockquotes, list
 * markers, table pipes and HTML-ish angle tokens are removed; link text is
 * kept. Whitespace is collapsed to single spaces and the result is trimmed.
 */
export function plainText(md: string): string {
  return md
    .replace(FENCED_CODE, ' ')
    .replace(INLINE_CODE, '$1')
    .replace(IMAGES, ' ')
    .replace(LINKS, '$1')
    .replace(HEADING, '')
    .replace(BLOCKQUOTE, '')
    .replace(TASK_LIST, '')
    .replace(TABLE_DELIMITER_ROW, ' ')
    .replace(LIST_MARKER, '')
    .replace(TABLE_PIPES, ' ')
    .replace(ANGLE_TOKENS, ' ')
    .replace(EMPHASIS, '')
    .replace(WHITESPACE, ' ')
    .trim();
}

/**
 * Plain-text preview of a body, truncated to `max` characters at a word
 * boundary with a trailing `…` when truncation occurred. Empty input yields
 * `''` rather than a lone ellipsis.
 */
export function excerpt(md: string, max = 160): string {
  const text = plainText(md);
  if (text.length <= max) return text;

  const clipped = text.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  const body = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s.,;:!?-]+$/, '');
  return `${body}…`;
}

/** Reading time in whole minutes at 200 wpm, floored at 1. */
export function readingTime(md: string): number {
  const text = plainText(md);
  if (!text) return 1;
  const words = text.split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

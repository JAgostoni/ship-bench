/**
 * Maximum length of the generated FTS5 query. Mirrors the `q` field's 200-char
 * cap, so an over-long input can never produce an over-long MATCH expression.
 */
export const MAX_QUERY_LENGTH = 200;

// FTS5 operator characters that separate terms in user input. Replacing them
// with a space keeps `(title:deploy)` readable as two terms.
const SEPARATOR_CHARS = /[():^-]/g;

// Operator characters that sit inside a term. Deleting them keeps `a*b` (an
// illegal FTS5 prefix of a prefix) as the single token `ab`.
const DELETE_CHARS = /["*]/g;

// FTS5 operator words. FTS5 only treats these as operators when uppercase, so a
// case-sensitive whole-word match is the correct (and conservative) strip.
const OPERATOR_WORDS = /\b(NEAR|AND|OR|NOT)\b/g;

/**
 * Converts raw user input into a safe FTS5 MATCH query.
 *
 * 1. Trim and collapse whitespace.
 * 2. Strip FTS5 operator characters and operator words. Left in user input they
 *    raise `SqliteError` on `MATCH` (architecture.md §3.5).
 * 3. Quote every token and append `*` to the final token for prefix matching:
 *    `deploy api` → `"deploy" "api"*`.
 * 4. Return `''` for empty input so the caller can short-circuit without
 *    touching the database.
 *
 * The result never exceeds `MAX_QUERY_LENGTH` characters, except in the
 * degenerate single-term case where one token is truncated to fit — the first
 * token is always kept so a search always has something to match on.
 */
export function toFtsQuery(raw: string): string {
  const cleaned = raw
    .replace(SEPARATOR_CHARS, ' ')
    .replace(OPERATOR_WORDS, ' ')
    .replace(DELETE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens: string[] = [];
  let length = 0;

  for (const token of cleaned.split(' ')) {
    if (!token) continue;
    const candidate = token.slice(0, MAX_QUERY_LENGTH);
    // Quotes around the token, a space before it, and the trailing `*`.
    const added = candidate.length + 3 + (tokens.length === 0 ? 0 : 1);
    if (tokens.length > 0 && length + added > MAX_QUERY_LENGTH) break;
    tokens.push(candidate);
    length += added;
  }

  if (tokens.length === 0) return '';

  return tokens
    .map((token, index) => (index === tokens.length - 1 ? `"${token}"*` : `"${token}"`))
    .join(' ');
}

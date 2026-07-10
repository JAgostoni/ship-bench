/**
 * Strip HTML tags and collapse whitespace to plain text.
 * Suitable for trusted/sanitized HTML (v1).
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a plain-text excerpt from HTML, capped at `max` characters.
 * Appends an ellipsis when truncated.
 */
export function makeExcerpt(html: string, max = 240): string {
  const plain = stripHtml(html);
  if (plain.length <= max) return plain;
  const sliced = plain.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trimEnd()}…`;
}

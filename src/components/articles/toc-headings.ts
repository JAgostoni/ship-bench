export type TocHeading = { id: string; text: string; level: 2 | 3 };

const HEADING = /^(#{2,3})\s+(.+?)\s*#*\s*$/gm;
const NON_ALPHANUMERIC = /[^a-z0-9\s-]/g;
const WHITESPACE = /\s+/g;

/**
 * Extracts the `h2`/`h3` outline from raw Markdown for the `TableOfContents`.
 *
 * Two jobs, both of which must agree with what `react-markdown` actually renders:
 *
 * 1. **The same id scheme** as `ArticleBody`'s `headingId` rehype plugin, so a
 *    TOC link lands on the heading with the right anchor.
 * 2. **The same set of headings** — fenced code blocks are stripped first, so a
 *    `## comment` inside a code fence is not mistaken for a heading. That is the
 *    one case where a naive line-by-line scan diverges from the renderer.
 *
 * Links are stripped from the heading text so `## Use \`npm\`` / `## See [docs]`
 * produce usable labels rather than raw markup.
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const withoutFences = markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  const headings: TocHeading[] = [];
  const used = new Map<string, number>();

  for (const match of withoutFences.matchAll(HEADING)) {
    const level = match[1].length === 2 ? 2 : 3;
    const text = toPlainLabel(match[2]);
    if (!text) continue;

    headings.push({ id: uniqueId(slugifyHeading(text), used), text, level });
  }

  return headings;
}

/** Strips inline Markdown so a heading label reads as the rendered text does. */
function toPlainLabel(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(ANGLE_TOKEN, '')
    .trim();
}

const ANGLE_TOKEN = /<\/?[a-zA-Z][^>]*>/g;

/**
 * The id scheme shared with `ArticleBody`. Not `lib/slug.ts`'s `slugify`: that
 * strips diacritics and caps at 80 chars because it produces URL path segments,
 * whereas a heading anchor only needs to be stable, unique on the page, and
 * lowercase.
 */
export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, '')
    .replace(WHITESPACE, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'section';
}

/** Appends `-2`, `-3`, … for repeat headings, matching the rehype plugin. */
export function uniqueId(base: string, used: Map<string, number>): string {
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

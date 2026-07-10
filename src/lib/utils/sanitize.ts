/**
 * Allowlist HTML sanitizer for article body content.
 * Tags/attrs per architecture §8.4.
 *
 * Prefer isomorphic-dompurify when available in a DOM-capable runtime;
 * fall back to a minimal regex/tag stripper for Node seed scripts.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "blockquote",
  "br",
]);

const VOID_TAGS = new Set(["br"]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return true;
  return /^(https?:|mailto:)/i.test(trimmed);
}

function sanitizeAttributes(tag: string, attrString: string): string {
  if (tag !== "a") return "";
  const hrefMatch = attrString.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!hrefMatch) return "";
  const href = hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? "";
  if (!isSafeHref(href)) return "";
  // Escape quotes in href for attribute safety
  const safe = href.replace(/"/g, "&quot;");
  return ` href="${safe}"`;
}

/**
 * Minimal allowlist sanitizer (no DOM required).
 * Strips disallowed tags; keeps text content.
 */
function sanitizeAllowlist(html: string): string {
  // Remove script/style blocks entirely
  let out = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  // Process tags
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    const isClosing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }
    if (isClosing) {
      if (VOID_TAGS.has(tag)) return "";
      return `</${tag}>`;
    }
    if (VOID_TAGS.has(tag)) {
      return `<${tag}>`;
    }
    const safeAttrs = sanitizeAttributes(tag, attrs ?? "");
    return `<${tag}${safeAttrs}>`;
  });

  return out;
}

/**
 * Sanitize article HTML to the v1 allowlist.
 * Uses isomorphic-dompurify when loadable; otherwise the pure allowlist.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  try {
    // Dynamic require keeps this module usable from Vitest/Node without forcing jsdom at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const createDOMPurify = require("isomorphic-dompurify") as
      | ((w?: unknown) => { sanitize: (dirty: string, cfg?: object) => string })
      | { sanitize: (dirty: string, cfg?: object) => string };

    const purify =
      typeof createDOMPurify === "function" ? createDOMPurify() : createDOMPurify;

    return purify.sanitize(html, {
      ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
      ALLOWED_ATTR: ["href"],
      ALLOW_DATA_ATTR: false,
    }) as string;
  } catch {
    return sanitizeAllowlist(html);
  }
}

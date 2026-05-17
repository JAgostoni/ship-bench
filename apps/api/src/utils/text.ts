/**
 * Converts a string into a URL-friendly slug.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
};

/**
 * Formats a search string for PostgreSQL Full-Text Search.
 * Example: "hello world" -> "hello | world"
 */
export const formatSearchQuery = (query: string): string => {
  return query.trim().split(/\s+/).join(' | ');
};

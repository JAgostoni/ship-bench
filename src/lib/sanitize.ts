import createDOMPurify from 'dompurify';

// Create a DOMPurify instance for Node/SSR context
// In the browser, use window.document; in SSR, use jsdom if needed
// For now, in Server Components we trust the markdown-it output (html: false prevents raw HTML)
// This sanitizer is used Client Components only.
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }
  const DOMPurify = createDOMPurify(window);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'del', 's', 'code', 'pre',
      'ul', 'ol', 'li',
      'blockquote',
      'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img',
      'mark',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'id'],
  });
}

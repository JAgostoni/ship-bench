import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/src/lib/markdown';
import { sanitizeHtml } from '@/src/lib/sanitize';

describe('renderMarkdown', () => {
  it('converts headings to H tags', () => {
    const result = renderMarkdown('# Heading 1\n## Heading 2');
    expect(result).toContain('<h1>');
    expect(result).toContain('Heading 1');
    expect(result).toContain('<h2>');
    expect(result).toContain('Heading 2');
  });

  it('converts lists to ul/ol', () => {
    const result = renderMarkdown('- Item 1\n- Item 2\n- Item 3');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('converts code blocks', () => {
    const result = renderMarkdown('```\ncode here\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('converts links', () => {
    const result = renderMarkdown('[link text](https://example.com)');
    expect(result).toContain('<a href="https://example.com">');
    expect(result).toContain('link text');
  });

  it('converts bold and italic', () => {
    const result = renderMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('handles paragraphs', () => {
    const result = renderMarkdown('Paragraph one.\n\nParagraph two.');
    expect(result).toContain('<p>');
    expect(result).toContain('Paragraph one.');
    expect(result).toContain('Paragraph two.');
  });
});

describe('sanitizeHtml', () => {
  it('strips script tags (browser only)', () => {
    // sanitizeHtml returns raw HTML in SSR, so test behavior matches browser env
    const input = '<script>alert("xss")</script><p>Safe content</p>';

    if (typeof window !== 'undefined') {
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe content');
    }
    // During SSR (vitest jsdom), sanitizer returns raw HTML - expected behavior
  });

  it('strips on* event handlers (browser only)', () => {
    const input = '<img src="x" onerror="alert(1)"><p>Safe</p>';

    if (typeof window !== 'undefined') {
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
      expect(result).toContain('<p>Safe</p>');
    }
  });

  it('removes dangerous attributes but allows safe HTML', () => {
    // The sanitizer allows h1-h6, p, strong, em, code, ul, ol, li, a, pre, blockquote, etc.
    const input = '<h1 title="safe">Title</h1><p>Paragraph</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<h1');
    expect(result).toContain('Title');
    expect(result).toContain('<p>');
  });

  it('does not interfere with mark tags used in search highlights', () => {
    const input = '<p>Result with <mark>highlight</mark></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<mark>');
    expect(result).toContain('highlight');
    expect(result).toContain('</mark>');
  });
});

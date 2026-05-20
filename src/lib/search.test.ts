import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

// Test search input sanitizer logic
function sanitizeSearchQuery(input: string): string {
  return input.replace(/[^\w\s]/g, '').trim();
}

describe('Search Query Sanitation', () => {
  it('should remove special characters that crash FTS5 engines', () => {
    const dangerousInput = 'setup node.js * AND MATCH "select';
    const clean = sanitizeSearchQuery(dangerousInput);
    expect(clean).toBe('setup nodejs  AND MATCH select');
  });

  it('should handle completely blank empty string states safely', () => {
    expect(sanitizeSearchQuery('!!!')).toBe('');
  });
});

describe('Markdown Processing & DOMPurify Sanitization', () => {
  it('should securely filter injected executable script inputs', () => {
    const rawMarkdown = '# Hello\n<script>alert("hack")</script>\n[Go](javascript:alert(1))';
    const parsedHtml = marked.parse(rawMarkdown) as string;
    const cleanHtml = DOMPurify.sanitize(parsedHtml);
    
    expect(cleanHtml).toContain('<h1>Hello</h1>');
    expect(cleanHtml).not.toContain('<script>');
    expect(cleanHtml).not.toContain('javascript:');
  });
});

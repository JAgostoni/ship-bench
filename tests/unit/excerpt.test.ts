import { describe, it, expect } from 'vitest';
import { extractExcerpt } from '@/lib/excerpt';

describe('extractExcerpt', () => {
  it('returns plain text under 200 chars as-is', () => {
    const text = 'Short text.';
    expect(extractExcerpt(text)).toBe('Short text.');
  });

  it('does not append ellipsis when text is exactly 200 chars', () => {
    const text = 'a'.repeat(200);
    const result = extractExcerpt(text);
    expect(result).toBe(text);
    expect(result.endsWith('…')).toBe(false);
  });

  it('truncates plain text over 200 chars at a word boundary and appends ellipsis', () => {
    const words = 'word '.repeat(50).trim(); // 249 chars, 50 words of 4 chars each
    const result = extractExcerpt(words);
    expect(result.endsWith('…')).toBe(true);
    // Strip the ellipsis and confirm the result ends with a complete word
    const withoutEllipsis = result.slice(0, -1).trimEnd();
    expect(withoutEllipsis.endsWith('word')).toBe(true);
  });

  it('does not cut mid-word — short example', () => {
    const text = 'Lorem ipsum dolor sit amet and more words to go past twenty characters here';
    const result = extractExcerpt(text);
    // For text < 200 chars, returned as-is
    expect(result).toBe(text);
  });

  it('strips markdown heading #', () => {
    const md = '# Title\n\nBody text here.';
    const result = extractExcerpt(md);
    expect(result).not.toContain('#');
    expect(result).toContain('Title');
    expect(result).toContain('Body text here.');
  });

  it('strips markdown bold **word**', () => {
    const md = '**bold** text';
    const result = extractExcerpt(md);
    expect(result).toBe('bold text');
  });

  it('strips markdown links [text](url) — keeps text, drops URL', () => {
    const md = '[click here](https://example.com)';
    const result = extractExcerpt(md);
    expect(result).toBe('click here');
    expect(result).not.toContain('https://');
  });

  it('strips markdown inline code `code`', () => {
    const md = 'Run `npm install` to install.';
    const result = extractExcerpt(md);
    expect(result).toBe('Run npm install to install.');
  });

  it('returns empty string for empty input', () => {
    expect(extractExcerpt('')).toBe('');
  });

  it('returns empty string for markdown-only input with no text', () => {
    // Only markdown syntax, no content — after stripping, result is ''
    const md = '# ';
    const result = extractExcerpt(md);
    expect(result).toBe('');
  });

  it('truncation does not cut mid-word', () => {
    // Build a string where the 200-char boundary falls mid-word
    const prefix = 'a'.repeat(195);
    const text = `${prefix} longword trailing`;
    const result = extractExcerpt(text);
    expect(result.endsWith('…')).toBe(true);
    // The word "longword" starts at 196 so the truncation should stop before it
    expect(result).not.toContain('longword');
    expect(result).toContain(prefix.slice(0, 195));
  });
});

import { describe, expect, it } from 'vitest';
import { excerpt, plainText, readingTime } from './markdown';

const COMPLEX_BODY = [
  '## Prerequisites',
  '',
  'Run the **deploy** script with the production flag.',
  '',
  '```bash',
  'npm run deploy -- --production',
  '```',
  '',
  '| Step | Owner |',
  '| --- | --- |',
  '| Roll out | Platform |',
  '',
  '- [ ] Verify the health endpoint',
  '- [x] Notify the on-call channel',
  '',
  'See [the runbook](https://example.com/runbook) for rollback.',
  '> Quoted note about downtime.',
].join('\n');

describe('plainText', () => {
  it('strips code blocks, tables, task lists and heading markers', () => {
    const text = plainText(COMPLEX_BODY);
    expect(text).not.toContain('```');
    expect(text).not.toContain('|');
    expect(text).not.toContain('- [ ]');
    expect(text).not.toContain('##');
    expect(text).not.toContain('**');
    expect(text).not.toContain('>');
  });

  it('keeps the visible prose and link text', () => {
    const text = plainText(COMPLEX_BODY);
    expect(text).toContain('Prerequisites');
    expect(text).toContain('Run the deploy script with the production flag.');
    expect(text).toContain('Verify the health endpoint');
    expect(text).toContain('the runbook');
    expect(text).not.toContain('https://example.com/runbook');
  });

  it('collapses whitespace to single spaces', () => {
    expect(plainText('a\n\n\n   b  \t c')).toBe('a b c');
  });

  it('removes inline code backticks but keeps the content', () => {
    expect(plainText('Use `toFtsQuery()` here')).toBe('Use toFtsQuery() here');
  });

  it('removes HTML-ish angle tokens', () => {
    expect(plainText('a <script>alert(1)</script> b')).toBe('a alert(1) b');
  });

  it('returns an empty string for an empty body', () => {
    expect(plainText('')).toBe('');
  });
});

describe('excerpt', () => {
  it('never exceeds max characters including the ellipsis', () => {
    const long = 'word '.repeat(80);
    for (const max of [40, 80, 160]) {
      expect(excerpt(long, max).length).toBeLessThanOrEqual(max);
    }
  });

  it('truncates at a word boundary with a trailing ellipsis', () => {
    const text = excerpt('alpha bravo charlie delta echo foxtrot', 20);
    expect(text).toBe('alpha bravo…');
    expect(text.length).toBeLessThanOrEqual(20);
  });

  it('returns short text unchanged with no ellipsis', () => {
    expect(excerpt('short body', 160)).toBe('short body');
  });

  it('returns an empty string for an empty body, not an ellipsis', () => {
    expect(excerpt('')).toBe('');
    expect(excerpt('   ')).toBe('');
  });

  it('handles a single long word without exceeding max', () => {
    const text = excerpt('x'.repeat(300), 50);
    expect(text.length).toBeLessThanOrEqual(50);
  });

  it('strips trailing punctuation before the ellipsis', () => {
    const text = excerpt('alpha bravo, charlie delta echo foxtrot golf', 14);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toMatch(/[,\s]…$/);
  });
});

describe('readingTime', () => {
  it('returns 1 for an empty body, never 0', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('   ')).toBe(1);
  });

  it('returns 1 for a short body', () => {
    expect(readingTime('a few words only')).toBe(1);
  });

  it('returns 2 for a 400-word body', () => {
    expect(readingTime('word '.repeat(400))).toBe(2);
  });

  it('counts only prose words, not code blocks', () => {
    const body = ['word '.repeat(400), '```', 'ignored '.repeat(400), '```'].join('\n');
    expect(readingTime(body)).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { MATCH_END, MATCH_START, splitSegments } from './highlight';

describe('splitSegments', () => {
  it('parses a marked-up snippet into text segments', () => {
    expect(splitSegments(`${MATCH_START}deploy${MATCH_END} the api`)).toEqual([
      { text: 'deploy', match: true },
      { text: ' the api', match: false },
    ]);
  });

  it('returns markup-looking text as a plain segment without escaping or interpreting it', () => {
    const html = '<script>alert(1)</script>';
    const segments = splitSegments(html);
    expect(segments).toEqual([{ text: html, match: false }]);
    const [segment] = segments;
    expect(segment.text).toBe(html);
    // No HTML strings are produced anywhere in the output.
    expect(JSON.stringify(segments)).not.toMatch(/<(mark|span)\b/i);
  });

  it('returns [] for empty input and for sentinel-only input', () => {
    expect(splitSegments('')).toEqual([]);
    expect(splitSegments(`${MATCH_START}${MATCH_END}`)).toEqual([]);
    expect(splitSegments(`${MATCH_START}${MATCH_START}${MATCH_END}${MATCH_END}`)).toEqual([]);
  });

  it('merges adjacent match segments into one', () => {
    expect(splitSegments(`${MATCH_START}de${MATCH_END}${MATCH_START}ploy${MATCH_END}`)).toEqual([
      { text: 'deploy', match: true },
    ]);
  });

  it('preserves a trailing unmatched segment', () => {
    expect(splitSegments(`${MATCH_START}deploy${MATCH_END} the api`)).toEqual([
      { text: 'deploy', match: true },
      { text: ' the api', match: false },
    ]);
  });

  it('handles a leading unmatched segment', () => {
    expect(splitSegments(`Run the ${MATCH_START}deploy${MATCH_END} script`)).toEqual([
      { text: 'Run the ', match: false },
      { text: 'deploy', match: true },
      { text: ' script', match: false },
    ]);
  });

  it('treats an unterminated sentinel as matched text to the end', () => {
    expect(splitSegments(`Run ${MATCH_START}deploy`)).toEqual([
      { text: 'Run ', match: false },
      { text: 'deploy', match: true },
    ]);
  });

  it('never returns HTML strings', () => {
    const segments = splitSegments(`${MATCH_START}a<b>${MATCH_END} c`);
    for (const segment of segments) {
      expect(typeof segment.text).toBe('string');
      expect(Object.keys(segment).sort()).toEqual(['match', 'text']);
    }
  });
});

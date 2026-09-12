import { describe, expect, it } from 'vitest';
import { cn, focusRing, focusRingInset } from './cn';

describe('cn', () => {
  it('resolves conflicting Tailwind utilities in favour of the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('keeps non-conflicting utilities', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm');
  });

  it('drops falsy inputs', () => {
    expect(cn('p-2', false, undefined, null, '', 'p-4')).toBe('p-4');
  });

  it('supports conditional object syntax', () => {
    expect(cn({ 'text-ink': true, 'text-muted': false })).toBe('text-ink');
  });

  it('resolves conflicts inside later inputs', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('returns an empty string when nothing is provided', () => {
    expect(cn()).toBe('');
  });

  it('exposes the focus-ring recipes from the design spec', () => {
    expect(focusRing).toContain('focus-visible:ring-2');
    expect(focusRingInset).toContain('focus-visible:ring-inset');
  });
});

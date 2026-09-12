import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok, type Result } from './result';

describe('result', () => {
  it('ok() wraps a value', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });

  it('err() wraps an error', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('isOk narrows an Ok value', () => {
    const result: Result<number, string> = ok(1);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(1);
    }
  });

  it('isErr narrows an Err value', () => {
    const result: Result<number, string> = err('nope');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('nope');
    }
  });

  it('isOk and isErr are mutually exclusive', () => {
    expect(isOk(ok(null))).toBe(true);
    expect(isErr(ok(null))).toBe(false);
    expect(isOk(err(null))).toBe(false);
    expect(isErr(err(null))).toBe(true);
  });
});

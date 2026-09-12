// `getDb()`'s failure branch is the contract that makes a misconfigured server
// fail loudly instead of quietly reading nothing, and it is not reachable while a
// test handle is installed. These cases pin it explicitly.
//
// The handle lives on `globalThis` (see `current.ts` for why Next.js requires
// that), so the tests save and restore it rather than assuming a clean process.
import { afterEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { getDb } from './current';

type TestDb = ReturnType<typeof createTestDb>;

const globalForDb = globalThis as unknown as { __kbDbHandle?: unknown };
const original = globalForDb.__kbDbHandle;
const open: TestDb[] = [];

afterEach(() => {
  if (original === undefined) {
    delete globalForDb.__kbDbHandle;
  } else {
    globalForDb.__kbDbHandle = original;
  }
  while (open.length > 0) open.pop()?.close();
});

describe('getDb / setDb', () => {
  it('throws a descriptive error when no handle has been installed', () => {
    delete globalForDb.__kbDbHandle;

    expect(() => getDb()).toThrowError(/Database not initialized/);
  });

  it('returns the handle installed by createTestDb', () => {
    const handle = createTestDb();
    open.push(handle);

    expect(getDb()).toBe(handle.db);
  });

  it('returns the most recently installed handle', () => {
    const first = createTestDb();
    open.push(first);
    const second = createTestDb();
    open.push(second);

    expect(first.db).not.toBe(second.db);
    expect(getDb()).toBe(second.db);
  });
});

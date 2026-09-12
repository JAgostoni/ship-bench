// Task 3.1's harness installs the temp handle via `setDb()`, and D25 requires
// every repository to be a factory taking that handle. `lazyRepository` is the
// only bridge between the two: it defers `getDb()` to first property access so a
// repository singleton is importable under Vitest. These tests pin that
// behaviour, because a silent failure here would make every route in iterations
// 4-6 resolve the wrong database.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from '@/test/db';
import { lazyRepository } from './runtime';

type TestDb = ReturnType<typeof createTestDb>;

const open: TestDb[] = [];

afterEach(() => {
  while (open.length > 0) open.pop()?.close();
});

function track(handle: TestDb): TestDb {
  open.push(handle);
  return handle;
}

describe('lazyRepository', () => {
  it('does not call the factory at construction time', () => {
    const create = vi.fn(() => ({ ping: () => 'pong' }));

    lazyRepository(create);

    expect(create).not.toHaveBeenCalled();
  });

  it('resolves the handle on first access and caches the instance', () => {
    const handle = track(createTestDb());
    const create = vi.fn((db: unknown) => ({ db }));

    const repo = lazyRepository<{ db: unknown }>(create);

    expect(create).not.toHaveBeenCalled();
    expect(repo.db).toBe(handle.db);
    expect(create).toHaveBeenCalledTimes(1);

    expect(repo.db).toBe(handle.db);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('binds methods to the instance so `this` is preserved', () => {
    track(createTestDb());
    const repo = lazyRepository((db: unknown) => ({
      db,
      describe() {
        return this.db === db;
      },
    }));

    const describeMethod = repo.describe;
    expect(describeMethod()).toBe(true);
  });

  it('rebuilds when the installed handle changes', () => {
    const first = track(createTestDb());
    const second = track(createTestDb());
    const create = vi.fn((db: unknown) => ({ db }));

    const repo = lazyRepository<{ db: unknown }>(create);

    // `createTestDb()` calls `setDb()`, so the second call has already swapped
    // the seam. A repository resolved against the first handle must not be
    // reused against the second — that is the stale-handle bug this guards.
    expect(repo.db).toBe(second.db);
    expect(create).toHaveBeenCalledWith(second.db);
    expect(first.db).not.toBe(second.db);
  });
});

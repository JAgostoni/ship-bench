import 'server-only';
import type { Database } from '@/server/db/create';
import { getDb } from '@/server/db/current';

/**
 * Turns a repository factory into the module-level runtime singleton.
 *
 * `architecture.md` §8.1 writes that singleton as
 * `export const xRepository = createXRepository(getDb())`, which resolves
 * `getDb()` at import time. That throws under Vitest (no database exists until a
 * test calls `createTestDb()`) and is also fragile in Next.js, where
 * `src/instrumentation.ts` is what calls `setDb()` — nothing guarantees it runs
 * before a route module is evaluated.
 *
 * Resolving the handle on first access keeps the call shape
 * (`xRepository.list()`) and D25's "which database did this hit?" answer, and
 * removes the import-order dependency. The resolved instance is cached per
 * handle, so a test that swaps handles between cases (or Next.js HMR, which
 * replaces the handle on reload) never receives a stale repository.
 */
export function lazyRepository<T extends object>(create: (db: Database) => T): T {
  let instance: T | undefined;
  let boundTo: Database | undefined;

  return new Proxy({} as T, {
    get(_target, property) {
      const db = getDb();
      if (instance === undefined || boundTo !== db) {
        instance = create(db);
        boundTo = db;
      }
      const value = Reflect.get(instance as object, property, instance);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

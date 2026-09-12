import type { Database } from './create';

/**
 * `getDb()`/`setDb()` — the seam every repository resolves its handle through
 * (`architecture.md` §8.1, D25).
 *
 * The handle is stored on `globalThis` rather than in a module-scope `let`.
 * That is load-bearing in Next.js 16, not defensive: `src/instrumentation.ts`
 * installs the handle, and Next.js evaluates instrumentation and route rendering
 * in **separate module graphs** within the same process. A module-scope variable
 * therefore leaves the instrumentation copy of `current.ts` holding a handle
 * while the route copy still sees `undefined`, and every RSC read fails at runtime
 * with "Database not initialized" — which is exactly what happened before this
 * change.
 *
 * `client.ts` already uses the same `globalThis` technique for its HMR guard, so
 * this is the codebase's established pattern for "exactly one handle per process".
 *
 * The contract is unchanged: `setDb()` once (by `client.ts`, or by
 * `createTestDb()` in a test), then `getDb()` anywhere.
 */
const globalForDb = globalThis as unknown as { __kbDbHandle?: Database };

/** Runtime accessor. Next.js callers use this. */
export function getDb(): Database {
  if (!globalForDb.__kbDbHandle) {
    throw new Error('Database not initialized. Call setDb() from client.ts or a test setup.');
  }
  return globalForDb.__kbDbHandle;
}

/** Test/runtime seam. Called once by client.ts, or by each test file. */
export function setDb(db: Database): void {
  globalForDb.__kbDbHandle = db;
}

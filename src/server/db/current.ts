import type { Database } from './create';

let current: Database | undefined;

/** Runtime accessor. Next.js callers use this. */
export function getDb(): Database {
  if (!current)
    throw new Error('Database not initialized. Call setDb() from client.ts or a test setup.');
  return current;
}

/** Test/runtime seam. Called once by client.ts, or by each test file. */
export function setDb(db: Database): void {
  current = db;
}

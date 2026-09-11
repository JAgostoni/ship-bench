// The ONLY `server-only` module in src/server/db/. Importing this from a Client
// Component fails the build instead of leaking the driver into the browser bundle.
import 'server-only';
import { env } from '@/lib/env';
import { createDatabase } from './create';
import { setDb } from './current';

// Next.js dev HMR re-evaluates modules; keep exactly one handle process-wide.
const globalForDb = globalThis as unknown as { __kbDb?: ReturnType<typeof createDatabase> };

const connection = (globalForDb.__kbDb ??= createDatabase(env.DATABASE_FILE));

export const { sqlite, db } = connection;
setDb(connection.db);

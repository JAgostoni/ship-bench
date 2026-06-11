import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const DEFAULT_DB_PATH = path.join("data", "kb.sqlite");

let db: Db | null = null;
let sqlite: Database.Database | null = null;

function open(): Db {
  const dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const connection = new Database(dbPath);
  connection.pragma("journal_mode = WAL");
  connection.pragma("busy_timeout = 5000");
  const instance = drizzle(connection, { schema });
  // Idempotent: Drizzle tracks applied migrations in __drizzle_migrations.
  migrate(instance, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  sqlite = connection;
  return instance;
}

export function getDb(): Db {
  if (!db) {
    db = open();
  }
  return db;
}

/** Raw better-sqlite3 handle, for pragmas and introspection (tests, tooling). */
export function getSqlite(): Database.Database {
  getDb();
  if (!sqlite) {
    throw new Error("SQLite connection was not initialized");
  }
  return sqlite;
}

/** Close and reset the singleton so the next getDb() reopens (used by tests and scripts). */
export function closeDb(): void {
  sqlite?.close();
  sqlite = null;
  db = null;
}

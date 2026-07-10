import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pragmasApplied?: boolean;
};

/**
 * Resolve SQLite file path from DATABASE_URL.
 * Supports `file:./prisma/dev.db` (relative to project root) and absolute paths.
 */
function resolveSqliteUrl(databaseUrl: string): string {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file::memory:")) {
    return ":memory:";
  }
  const withoutScheme = databaseUrl.replace(/^file:/, "");
  if (path.isAbsolute(withoutScheme)) {
    return withoutScheme;
  }
  return path.join(process.cwd(), withoutScheme);
}

function createClient() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = resolveSqliteUrl(rawUrl);
  const adapter = new PrismaBetterSqlite3({ url: filePath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Enable WAL and foreign keys once per process (best-effort). */
export async function applySqlitePragmas(): Promise<void> {
  if (globalForPrisma.pragmasApplied) return;
  try {
    await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
    globalForPrisma.pragmasApplied = true;
  } catch (err) {
    console.error("[db] Failed to apply SQLite pragmas:", err);
    throw err;
  }
}

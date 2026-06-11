// Standalone migration entry: `npm run db:migrate`.
// Opening the client runs all pending Drizzle migrations (see client.ts).
import { closeDb, getDb } from "./client";

try {
  getDb();
  closeDb();
  console.log(
    `Migrations applied to ${process.env.DATABASE_PATH || "data/kb.sqlite"}`,
  );
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}

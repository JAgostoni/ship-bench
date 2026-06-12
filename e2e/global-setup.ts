// Deterministic E2E setup (architecture §8.2): every run starts from the same
// 12 seed articles in data/kb-e2e.sqlite. The app's own migration runner
// creates the file and applies migrations (idempotent), then the fixture
// resets row contents — works whether or not the web server is already up.
import { execSync } from "node:child_process";
import { E2E_DATABASE_PATH, resetToSeed } from "./fixtures";

export default function globalSetup(): void {
  execSync("npx tsx src/lib/db/migrate.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_PATH: E2E_DATABASE_PATH },
  });
  resetToSeed();
}

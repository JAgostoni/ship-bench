import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
/**
 * Empties the **E2E** database so the spec can reach the "no articles exist at all"
 * empty state.
 *
 * **Why this bypasses the API.** There is no endpoint that removes articles —
 * `DELETE /api/articles/:idOrSlug` is a soft archive by design (`architecture.md`
 * §7.3: hard delete is not exposed in v1), and archiving leaves the rows in place,
 * so it can produce an empty *category* but never "no articles yet". The alternative
 * would be a new destructive test endpoint, which is application surface the brief
 * does not ask for; driving the database directly is the same class of decision as
 * the fixture itself.
 *
 * **Why a `tsx` script rather than an import.** The repository's ESLint config
 * forbids importing `better-sqlite3` outside `src/server/**`, `scripts/**`, and
 * `src/test/**` (architecture.md §4 item 1: the driver never leaves the server
 * boundary). That rule is worth keeping rather than widening for a test helper, so
 * this shells out to `scripts/empty-e2e-db.ts` under `tsx` — the same
 * `scripts/**`-owns-SQL arrangement every existing `db:*` script uses.
 *
 * **The caller must pass the sentinel.** The target file is hard-coded to
 * `data/kb.e2e.db` and is never taken from the environment, and `e2eTestMode` must
 * be the `E2E_TEST_MODE` constant — so a stray call from anywhere else fails loudly
 * instead of deleting rows from a real database.
 */
const E2E_DATABASE_FILE = resolve(process.cwd(), 'data', 'kb.e2e.db');
const EMPTIER_SCRIPT = resolve(process.cwd(), 'scripts', 'empty-e2e-db.ts');

/**
 * The value `playwright.config.ts` sets for the E2E server's `E2E_TEST_MODE`.
 *
 * Restated here rather than read from `process.env` because Playwright does **not**
 * propagate `webServer.env` into the test workers. Passing this sentinel is the
 * explicit opt-in: it is greppable, and it makes an accidental call fail loudly.
 */
export const E2E_TEST_MODE = '1' as const;

export type EmptyDbOptions = {
  /** Also delete every category. Defaults to false (only articles are removed). */
  categories?: boolean;
  /** Must be the `E2E_TEST_MODE` sentinel. Required so no call site can reach this by accident. */
  e2eTestMode: string | undefined;
};

export function emptyE2eDatabase({ categories = false, e2eTestMode }: EmptyDbOptions): void {
  if (e2eTestMode !== E2E_TEST_MODE) {
    throw new Error(
      `emptyE2eDatabase() requires e2eTestMode='${E2E_TEST_MODE}'. It deletes rows and must never ` +
        'be pointed at a real database (see playwright.config.ts webServer env).',
    );
  }

  if (!existsSync(E2E_DATABASE_FILE)) {
    throw new Error(`Expected the E2E database at ${E2E_DATABASE_FILE}, but it does not exist.`);
  }

  const result = spawnSync(
    process.execPath,
    [
      resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      EMPTIER_SCRIPT,
      ...(categories ? ['--categories'] : []),
    ],
    { encoding: 'utf8', env: { ...process.env, DATABASE_FILE: './data/kb.e2e.db' } },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to empty the E2E database (exit ${result.status}).\n${result.stderr || result.stdout}`,
    );
  }
}

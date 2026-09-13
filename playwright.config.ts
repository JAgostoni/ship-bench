import { defineConfig, devices } from '@playwright/test';

/**
 * The E2E configuration from `architecture.md` §11.4.
 *
 * **E2E never touches `kb.db`.** The `webServer` env points the dev server at
 * `./data/kb.e2e.db` and enables the guarded reset endpoint, and a process
 * environment variable wins over `.env.local`, so the developer's own database is
 * out of reach for the whole run (§9.7).
 *
 * Two projects, not a matrix: `desktop-chromium` at 1280×800 and `tablet-webkit`
 * at the iPad (gen 7) landscape viewport. Phone widths are deliberately absent —
 * `design-spec.md` U2 and `architecture.md` §16.2 support them but do not optimize
 * for them, and `backlog.md` B11 assigns the remaining widths to iteration 8's
 * manual sweep.
 *
 * **`workers: 1`, deviating from §11.4's `process.env.CI ? 1 : 2` (decision I7-1).**
 * §9.7's per-spec reset is what makes the suite deterministic, but a reset is
 * *destructive* rather than merely contended: it truncates the one shared
 * `kb.e2e.db`, so with two workers a sibling spec's `beforeEach` deletes the row
 * another spec is midway through asserting on. An `edit.spec.ts` test that saves and
 * then reloads is the clearest casualty — it observed "We couldn't find that
 * article." A per-worker database file would buy parallelism at the cost of a much
 * larger fixture; serializing costs a few seconds and removes the entire class of
 * failure, which is the same trade §9.7 itself makes for CI.
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'tablet-webkit', use: { ...devices['iPad (gen 7) landscape'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_FILE: './data/kb.e2e.db',
      E2E_TEST_MODE: '1',
      LOG_LEVEL: 'warn',
    },
  },
});

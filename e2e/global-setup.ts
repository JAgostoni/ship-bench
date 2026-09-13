import { request } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** How long to wait for `/api/health` before giving up, in milliseconds. */
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 250;

/**
 * Waits for `/api/health`, then resets the E2E database exactly once
 * (`architecture.md` §9.7).
 *
 * **Why the wait is still here even though Playwright starts the `webServer`
 * first.** The `webServer` plugin is made available before global setup runs, but
 * "the port accepts connections" and "the first request can be served" are not the
 * same instant on a cold Turbopack compile — and with `reuseExistingServer` a
 * developer's already-running server may be a different process entirely. A retry
 * loop on the readiness URL is the only probe that answers the question that
 * matters: can this server answer a request?
 *
 * The reset is called **once**, here, rather than per spec: a `beforeEach` reset in
 * every spec would serialize the whole suite behind SQLite writes for no gain, and
 * specs that mutate already reset themselves (that is what `helpers/reset-db.ts` is
 * for). This call exists so the run starts from the fixture even when the
 * `kb.e2e.db` file left behind by a previous run is dirty.
 */
export default async function globalSetup(): Promise<void> {
  const context = await request.newContext({ baseURL: BASE_URL });

  try {
    await waitForHealth(context);
    await reset(context);
  } finally {
    await context.dispose();
  }
}

/**
 * Polls `/api/health` until it answers `200`. A non-200 (the documented
 * `503 degraded`) is retried rather than accepted, because a degraded database is
 * exactly the state the reset that follows is meant to fix.
 */
async function waitForHealth(context: Awaited<ReturnType<typeof request.newContext>>) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastFailure = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await context.get('/api/health');
      if (response.ok()) return;
      lastFailure = `status ${response.status()}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }

  throw new Error(
    `Timed out after ${HEALTH_TIMEOUT_MS}ms waiting for ${BASE_URL}/api/health (${lastFailure}). ` +
      'Is the Playwright webServer able to start?',
  );
}

/**
 * Calls the guarded reset endpoint and fails loudly if it is not enabled — a `404`
 * here means `E2E_TEST_MODE` did not reach the server, and every spec that asserts
 * on fixture titles would fail with a much less useful message.
 */
async function reset(context: Awaited<ReturnType<typeof request.newContext>>) {
  const response = await context.post('/api/test/reset', {
    headers: { 'Content-Type': 'application/json' },
    data: {},
  });

  if (!response.ok()) {
    throw new Error(
      `POST /api/test/reset failed with status ${response.status()}. ` +
        'The webServer must run with E2E_TEST_MODE=1 (see playwright.config.ts).',
    );
  }

  const body = (await response.json()) as { reset?: boolean; articles?: number };
  if (body.reset !== true) {
    throw new Error(`POST /api/test/reset returned an unexpected body: ${JSON.stringify(body)}`);
  }
}

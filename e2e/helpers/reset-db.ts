import { type Page } from '@playwright/test';

export type ResetResult = {
  reset: boolean;
  articles: number;
  categories: number;
};

/**
 * Calls `POST /api/test/reset` and returns the parsed body
 * (`architecture.md` §9.7). This is the per-spec isolation seam: every spec that
 * mutates state calls it in `test.beforeEach`, so a spec can never assert against
 * another spec's leftovers.
 *
 * The request goes through `page.request`, so it shares the browser context's
 * connection and the E2E server the assertions will use. The body is returned
 * unvalidated — a spec that depends on the reset asserts on the counts, which
 * produces a clearer failure than an exception raised inside a helper.
 */
export async function resetDb(page: Page): Promise<ResetResult> {
  const response = await page.request.post('/api/test/reset', {
    headers: { 'Content-Type': 'application/json' },
    data: {},
  });
  return (await response.json()) as ResetResult;
}

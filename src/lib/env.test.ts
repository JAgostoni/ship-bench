import { describe, expect, it } from 'vitest';
import { env } from './env';

// Placeholder suite for iteration 1. Iteration 2 replaces this with the real
// src/lib/** test coverage; it exists so the `verify` gate is meaningful now.
describe('env', () => {
  it('exposes the environment through defaults', () => {
    expect(env.DATABASE_FILE).toBeTypeOf('string');
    expect(env.LOG_LEVEL).toMatch(/^(debug|info|warn|error)$/);
    expect(env.E2E_TEST_MODE).toBeGreaterThanOrEqual(0);
  });
});

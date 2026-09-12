import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = ['DATABASE_FILE', 'LOG_LEVEL', 'E2E_TEST_MODE', 'NODE_ENV'] as const;

// `process.env.NODE_ENV` is typed as read-only, so mutate through a writable view.
const mutableEnv = process.env as Record<string, string | undefined>;

/**
 * `env.ts` parses `process.env` once at import time, so each case has to present
 * a clean environment and re-import the module. `vi.resetModules()` drops the
 * cached instance so the top-level `parse` runs again.
 *
 * Keys not passed in `overrides` are deleted rather than blanked: a Zod
 * `.default()` only applies when a key is *absent*, so `FOO=''` exercises the
 * "invalid value" branch while `delete process.env.FOO` exercises the default.
 */
async function loadEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  const saved = ENV_KEYS.map((key) => [key, mutableEnv[key]] as const);
  for (const key of ENV_KEYS) {
    const value = overrides[key];
    if (value === undefined) delete mutableEnv[key];
    else mutableEnv[key] = value;
  }

  try {
    vi.resetModules();
    return await import('./env');
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete mutableEnv[key];
      else mutableEnv[key] = value;
    }
  }
}

afterEach(() => {
  vi.resetModules();
});

describe('env', () => {
  it('falls back to documented defaults when every key is absent', async () => {
    const { env } = await loadEnv();

    expect(env.DATABASE_FILE).toBe('./data/kb.db');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.E2E_TEST_MODE).toBe(0);
    expect(env.NODE_ENV).toBe('development');
  });

  it('reads provided values through', async () => {
    const { env } = await loadEnv({
      DATABASE_FILE: './data/custom.db',
      LOG_LEVEL: 'debug',
      NODE_ENV: 'production',
    });

    expect(env.DATABASE_FILE).toBe('./data/custom.db');
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.NODE_ENV).toBe('production');
  });

  it('coerces E2E_TEST_MODE from its string form', async () => {
    const { env } = await loadEnv({ E2E_TEST_MODE: '1' });
    expect(env.E2E_TEST_MODE).toBe(1);
  });

  it('rejects an empty DATABASE_FILE rather than booting with an unusable path', async () => {
    await expect(loadEnv({ DATABASE_FILE: '' })).rejects.toThrow();
  });

  it('rejects an out-of-range E2E_TEST_MODE instead of accepting it silently', async () => {
    await expect(loadEnv({ E2E_TEST_MODE: '2' })).rejects.toThrow();
  });

  it('rejects an unknown log level', async () => {
    await expect(loadEnv({ LOG_LEVEL: 'verbose' })).rejects.toThrow();
  });
});

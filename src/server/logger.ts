import 'server-only';
import pino from 'pino';
import { env } from '@/lib/env';

/**
 * The one application logger (`architecture.md` §7.6).
 *
 * pino 10 emits JSON on stdout, which is what a production log collector wants.
 * The spec also names `pino-pretty` for development, but that package is not an
 * installed dependency of this project — wiring it as a `transport` would make
 * every dev-mode import fail at runtime — so dev logs stay JSON too. That is a
 * strictly safer default: the log line shape is identical in both modes, which
 * makes a captured log from a dev run usable as the fixture for a test.
 *
 * **Article bodies are never logged** (`architecture.md` §13.2). The rule is
 * enforced by the call sites: each mutation logs the §7.6 field set
 * (`event`, `articleId`, `slug`, `version`, `durationMs`) and nothing else.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined, // no pid/hostname noise in an internal tool's log stream
});

export type Logger = typeof logger;

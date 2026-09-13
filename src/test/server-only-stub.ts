/**
 * The empty stand-in for the `server-only` package under Vitest
 * (`architecture.md` §11.2 point 1).
 *
 * `server-only` resolves to a module that *throws* unless it is loaded under the
 * `react-server` export condition, which Vite does not set. Two things follow:
 *
 * - Simply mocking the package with `vi.mock('server-only', () => ({}))` is not enough,
 *   because the mock only applies to modules Vite could already *resolve* — a module
 *   graph that reaches `import 'server-only'` through a path the mock factory never
 *   covers fails at transform time with "Failed to resolve import".
 * - An `resolve.alias` in `vitest.config.ts` replaces the specifier globally, so every
 *   project (node and jsdom) and every import depth sees this file instead.
 *
 * The `server/**` boundary is still enforced where it matters: the production build
 * (Next.js applies the real `react-server` condition) and ESLint's restricted-import
 * rule. See `docs/architecture.md` §11.2, which names this exact approach.
 */
export {};

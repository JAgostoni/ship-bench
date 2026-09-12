import { vi } from 'vitest';

/**
 * Mutable navigation state for component tests.
 *
 * `vi.mock('next/navigation', …)` is hoisted above the test file's own imports, so
 * the factory cannot close over test-file locals (temporal dead zone). It *can*
 * read a module-scope object from an imported module, because the factory is only
 * invoked when the mocked module is first imported — by which point this module has
 * been evaluated. Tests therefore mutate `navigation` and re-import.
 */
export const navigation = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
  searchParams: new URLSearchParams(),
};

/** Puts the mocked router and URL back to a known state before each case. */
export function resetNavigation({ href, pathname }: { href?: string; pathname?: string } = {}) {
  navigation.replace.mockReset();
  navigation.push.mockReset();
  navigation.refresh.mockReset();
  navigation.back.mockReset();
  navigation.forward.mockReset();
  navigation.prefetch.mockReset();

  if (href !== undefined) {
    const url = new URL(href, 'http://localhost');
    navigation.pathname = url.pathname;
    navigation.searchParams = url.searchParams;
  } else {
    navigation.pathname = pathname ?? '/';
    navigation.searchParams = new URLSearchParams();
  }
}

/** The `next/navigation` module shape every mocked test file needs. */
export function navigationModuleMock() {
  return {
    useRouter: () => ({
      replace: navigation.replace,
      push: navigation.push,
      refresh: navigation.refresh,
      back: navigation.back,
      forward: navigation.forward,
      prefetch: navigation.prefetch,
    }),
    usePathname: () => navigation.pathname,
    useSearchParams: () => navigation.searchParams,
  };
}

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

vi.mock('next/navigation', () => navigationModuleMock());

const { FocusOnNavigate } = await import('./focus-on-navigate');

/**
 * design-spec.md §9.2's focus-management rule, which is a **conditional**:
 * focus moves on client-side navigation, and explicitly does not on a filter or
 * pagination change. Both halves are asserted here because only the pair is correct.
 */
describe('FocusOnNavigate', () => {
  beforeEach(() => {
    resetNavigation({ pathname: '/' });
    document.body.innerHTML = '';
  });

  function harness() {
    return (
      <main id="main" tabIndex={-1}>
        <h1 tabIndex={-1}>Articles</h1>
        <FocusOnNavigate />
      </main>
    );
  }

  it('does not move focus on the initial mount', () => {
    render(harness());
    const heading = screen.getByRole('heading', { level: 1 });

    expect(heading).not.toHaveFocus();
  });

  it('moves focus to the h1 when the pathname changes', () => {
    const { rerender } = render(harness());
    navigation.pathname = '/search';
    rerender(harness());
    rerender(harness());

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('does not move focus when only searchParams change', () => {
    const { rerender } = render(harness());

    // Same pathname, new query string: a refinement, not a navigation.
    navigation.searchParams = new URLSearchParams('status=draft&page=2');
    rerender(harness());
    rerender(harness());

    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('falls back to main when a page has no h1', () => {
    const { rerender } = render(
      <main id="main" tabIndex={-1}>
        <FocusOnNavigate />
      </main>,
    );
    navigation.pathname = '/other';
    rerender(
      <main id="main" tabIndex={-1}>
        <FocusOnNavigate />
      </main>,
    );

    const main = document.getElementById('main');
    expect(main).toHaveFocus();
  });
});

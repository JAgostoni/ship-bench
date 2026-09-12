import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// The pending flag is driven by the shell-wide transition, which no jsdom test can
// actually suspend. Mocking the hook is the honest way to assert both states:
// `design-spec.md` §7.5 requires the 60% dim *while* pending and no dim otherwise,
// and only the pair proves the dim is bound to the transition rather than applied
// unconditionally.
const state = { pending: false };
vi.mock('@/components/layout/progress-bar', () => ({
  useNavigationTransition: () => ({ pending: state.pending, run: (fn: () => void) => fn() }),
}));

const { RefiningSurface } = await import('./refining-surface');

describe('RefiningSurface', () => {
  it('renders children at full opacity when no transition is pending', () => {
    state.pending = false;
    render(<RefiningSurface>rows</RefiningSurface>);

    const region = screen.getByText('rows');
    expect(region).not.toHaveClass('opacity-60');
    expect(region).not.toHaveAttribute('aria-busy');
  });

  it('dims to 60% and sets aria-busy while a refinement is pending', () => {
    state.pending = true;
    render(<RefiningSurface>rows</RefiningSurface>);

    const region = screen.getByText('rows');
    expect(region).toHaveClass('opacity-60');
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('never renders a skeleton, per design-spec.md §7.5', () => {
    state.pending = true;
    const { container } = render(<RefiningSurface>rows</RefiningSurface>);

    expect(container.querySelector('[role="status"][aria-label="Loading"]')).toBeNull();
    expect(container.textContent).toBe('rows');
  });
});

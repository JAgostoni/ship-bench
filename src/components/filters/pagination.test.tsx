import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

vi.mock('next/navigation', () => navigationModuleMock());

const { Pagination } = await import('./pagination');

/**
 * Task 5.3's five cases. The disabled-control and unknown-total cases are the two
 * the design spec singles out (§5.9 and §4.1 respectively), so they are asserted on
 * the DOM shape rather than on copy alone.
 */
describe('Pagination', () => {
  beforeEach(() => {
    resetNavigation({ href: '/' });
  });

  function renderPager(props: Partial<Parameters<typeof Pagination>[0]> = {}) {
    return render(
      <Pagination page={1} totalPages={null} hasNext={false} basePath="/" {...props} />,
    );
  }

  it('renders a disabled Previous as a span with aria-disabled and no href on page 1', () => {
    renderPager({ page: 1, totalPages: 3, hasNext: true });

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    const disabled = within(nav).getByText('Previous').closest('[aria-disabled="true"]');

    expect(disabled).not.toBeNull();
    expect(disabled?.tagName).toBe('SPAN');
    expect(disabled).not.toHaveAttribute('href');
    expect(within(nav).queryByRole('link', { name: /Previous/ })).not.toBeInTheDocument();
  });

  it('renders a disabled Next as a span with aria-disabled and no href on the last page', () => {
    renderPager({ page: 3, totalPages: 3, hasNext: false });

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    const disabled = within(nav).getByText('Next').closest('[aria-disabled="true"]');

    expect(disabled?.tagName).toBe('SPAN');
    expect(disabled).not.toHaveAttribute('href');
    expect(within(nav).queryByRole('link', { name: /Next/ })).not.toBeInTheDocument();
  });

  it('renders no numbered links for a single-page result', () => {
    renderPager({ page: 1, totalPages: 1, hasNext: false });

    // A single page has no pager at all, so the landmark is absent.
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('marks the current page with aria-current="page"', () => {
    renderPager({ page: 2, totalPages: 5, hasNext: true });

    const current = screen.getByText('2', { selector: '[aria-current="page"]' });
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders no fabricated total when total is null and hasNext is true', () => {
    renderPager({ page: 1, totalPages: null, hasNext: true });

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    const text = nav.textContent ?? '';

    expect(text).toContain('Page 1');
    // Never "Page 1 of N" — the server did not compute N.
    expect(text).not.toMatch(/of\s*\d/);
  });

  it('renders "Page 1 of 3" only when the total is known', () => {
    renderPager({ page: 1, totalPages: 3, hasNext: true });

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('caps the numbered window at ±3 around the current page', () => {
    renderPager({ page: 6, totalPages: 20, hasNext: true });

    const numbers = screen.getByRole('list', { name: 'Page numbers' });
    const values = within(numbers)
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(values).toEqual(['3', '4', '5', '6', '7', '8', '9']);
  });

  it('navigates to the next page through the router, dropping page=1', async () => {
    const user = userEvent.setup();
    renderPager({ page: 1, totalPages: 3, hasNext: true });

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(navigation.push).toHaveBeenCalledWith('/?page=2');
  });

  it('drops the page param when returning to page 1', async () => {
    const user = userEvent.setup();
    renderPager({ page: 3, totalPages: 3, hasNext: false });

    await user.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(navigation.push).toHaveBeenCalledWith('/?page=2');
  });

  it('preserves the other query params when changing page', async () => {
    const user = userEvent.setup();
    resetNavigation({ href: '/?status=draft&sort=title' });
    renderPager({ page: 1, totalPages: 3, hasNext: true });

    await user.click(screen.getByRole('button', { name: 'Page 2' }));

    const target = navigation.push.mock.calls[0]?.[0] as string;
    const params = new URLSearchParams(target.split('?')[1]);
    expect(params.get('status')).toBe('draft');
    expect(params.get('sort')).toBe('title');
    expect(params.get('page')).toBe('2');
  });
});

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

vi.mock('next/navigation', () => navigationModuleMock());

const { FilterBar } = await import('./filter-bar');

const CATEGORIES = [
  { name: 'Engineering', slug: 'engineering', articleCount: 3 },
  { name: 'Product', slug: 'product', articleCount: 2 },
];

/**
 * design-spec.md §3.3 rule 1 and §10.6 rule 5 are the load-bearing assertions here:
 * **search mode renders no sort control at all**, and status remains available. The
 * `router.replace` + `scroll: false` behaviour is what keeps a refinement from
 * jumping the viewport (§5.9).
 */
describe('FilterBar', () => {
  beforeEach(() => {
    resetNavigation({ href: '/?status=published&sort=updated' });
  });

  function renderBar(props: Partial<Parameters<typeof FilterBar>[0]> = {}) {
    return render(<FilterBar categories={CATEGORIES} basePath="/" {...props} />);
  }

  it('renders the status select and the sort select in browse mode', () => {
    renderBar();

    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort articles')).toBeInTheDocument();
  });

  it('renders no sort select in search mode', () => {
    renderBar({ searchMode: true, basePath: '/search' });

    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sort articles')).not.toBeInTheDocument();
  });

  it('renders a chip for All plus one per category', () => {
    renderBar();

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Engineering/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Product/ })).toBeInTheDocument();
  });

  it('marks the active category chip as current', () => {
    renderBar({ activeCategory: 'engineering' });

    expect(screen.getByRole('button', { name: /Engineering/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveAttribute('aria-current');
  });

  it('exposes each chip count as an sr-only "articles" phrase', () => {
    renderBar();

    // design-spec.md §9.3: "Engineering, 3 articles", not "Engineering 3".
    expect(screen.getByText('3 articles')).toBeInTheDocument();
  });

  it('replaces the URL without scroll when the status changes', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(await screen.findByRole('option', { name: 'Drafts' }));

    expect(navigation.replace).toHaveBeenCalled();
    const [href, options] = navigation.replace.mock.calls[0] as [string, { scroll: boolean }];
    expect(href).toContain('status=draft');
    expect(href).toContain('sort=updated');
    expect(options).toEqual({ scroll: false });
  });

  it('drops the page param when a filter changes', async () => {
    const user = userEvent.setup();
    resetNavigation({ href: '/?status=published&sort=updated&page=3' });
    renderBar();

    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(await screen.findByRole('option', { name: 'All' }));

    const [href] = navigation.replace.mock.calls[0] as [string];
    expect(href).not.toContain('page=');
  });

  it('renders the right-aligned count label when supplied', () => {
    renderBar({ countLabel: '7 published' });

    expect(screen.getByText('7 published')).toBeInTheDocument();
  });

  it('carries an active q across a category chip navigation', async () => {
    const user = userEvent.setup();
    resetNavigation({ href: '/search?q=deploy' });
    renderBar({ searchMode: true, basePath: '/search' });

    await user.click(screen.getByRole('button', { name: /Product/ }));

    expect(navigation.push).toHaveBeenCalledWith('/categories/product?q=deploy', { scroll: false });
  });
});

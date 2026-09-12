import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { navigationModuleMock, resetNavigation } from '@/test/next-navigation';
import type { SearchHit } from '@/types/domain';

vi.mock('next/navigation', () => navigationModuleMock());

const { SearchResults } = await import('./search-results');

/**
 * Task 5.2's four cases. The count-line copy is asserted literally because
 * design-spec.md §10.5 gives the singular and plural as exact strings, and the
 * "no sort control" case is the §3.3 rule 1 / §10.6 rule 5 guard.
 */
describe('SearchResults', () => {
  beforeEach(() => {
    resetNavigation({ href: '/search?q=deploy' });
  });

  function hit(id: number): SearchHit {
    return {
      id,
      slug: `hit-${id}`,
      title: `Deploying service ${id}`,
      status: 'published',
      category: { id: 3, name: 'Engineering', slug: 'engineering' },
      updatedAt: new Date('2026-09-08T12:00:00.000Z'),
      rank: -1 * id,
      titleSegments: [{ text: `Deploying service ${id}`, match: false }],
      snippetSegments: [{ text: `Run the deploy for service ${id}.`, match: false }],
    };
  }

  function renderResults(hits: SearchHit[], overrides: Record<string, unknown> = {}) {
    return render(
      <SearchResults
        query="deploy"
        hits={hits}
        total={hits.length}
        page={1}
        totalPages={null}
        hasNext={false}
        categories={[{ name: 'Engineering', slug: 'engineering', articleCount: 3 }]}
        {...overrides}
      />,
    );
  }

  it('renders "1 result for “deploy”" in the singular', () => {
    renderResults([hit(1)]);

    expect(screen.getByText('1 result for “deploy”')).toBeInTheDocument();
  });

  it('renders "3 results for “deploy”" in the plural', () => {
    renderResults([hit(1), hit(2), hit(3)]);

    expect(screen.getByText('3 results for “deploy”')).toBeInTheDocument();
  });

  it('renders the zero-results empty state, with the exact copy', () => {
    renderResults([], { total: 0 });

    const empty = screen.getByRole('heading', { name: 'No results for “deploy”' }).parentElement;
    expect(empty).not.toBeNull();
    expect(screen.getByText('Try a different term, or browse all articles.')).toBeInTheDocument();

    // design-spec.md §10.5 renders "Clear search" twice by design — once in the
    // results toolbar (§3.3's wireflow) and once as empty state 2's CTA — so the
    // empty state's own link is asserted within its container.
    const cta = within(empty as HTMLElement).getByRole('link', { name: 'Clear search' });
    expect(cta).toHaveAttribute('href', '/');
  });

  it('renders the count in a role="status" live region', () => {
    renderResults([hit(1)]);

    const live = screen.getByRole('status');
    expect(live).toHaveTextContent('1 result for “deploy”');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('renders no sort control anywhere in the toolbar', () => {
    renderResults([hit(1)]);

    expect(screen.queryByLabelText('Sort articles')).not.toBeInTheDocument();
    // "Updated" / "Created" / "Title A–Z" are the only sort labels; none may appear.
    expect(screen.queryByText('Title A–Z')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });

  it('still renders the status filter, which search mode keeps', () => {
    renderResults([hit(1)]);

    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('highlights matches in both the title and the snippet', () => {
    renderResults([
      {
        ...hit(1),
        titleSegments: [
          { text: 'Deploying the ', match: false },
          { text: 'API', match: true },
        ],
        snippetSegments: [
          { text: 'Run the ', match: false },
          { text: 'deploy', match: true },
          { text: ' script.', match: false },
        ],
      },
    ]);

    const marks = screen.getAllByText(/API|deploy/, { selector: 'mark' });
    expect(marks.map((mark) => mark.textContent).sort()).toEqual(['API', 'deploy']);
  });

  it('renders the visually-hidden h1 as "Search results"', () => {
    renderResults([hit(1)]);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Search results');
  });

  it('links every result row to the article detail route', () => {
    renderResults([hit(1), hit(2)]);

    const links = screen.getAllByRole('link', { name: /Deploying service/ });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/articles/hit-1');
  });
});

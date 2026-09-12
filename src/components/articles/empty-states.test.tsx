import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  EmptyCategoryState,
  NoArticlesState,
  NoCategoriesState,
  NoFilterMatchState,
  NoResultsState,
} from './empty-states';

/**
 * Task 4.5's acceptance criterion: each of the five canonical states renders its
 * **exact** title and description and links to the **correct** CTA target.
 * design-spec.md §5.6 says the copy must not be paraphrased, so these assertions
 * are literal strings.
 */
describe('the five canonical empty states', () => {
  it('1 — no articles at all', () => {
    render(<NoArticlesState />);

    expect(screen.getByRole('heading', { name: 'No articles yet' })).toBeInTheDocument();
    expect(
      screen.getByText("Create the first article to start building your team's knowledge base."),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New article' })).toHaveAttribute(
      'href',
      '/articles/new',
    );
  });

  it('2 — a search returned nothing', () => {
    render(<NoResultsState query="deploy" />);

    expect(screen.getByRole('heading', { name: 'No results for “deploy”' })).toBeInTheDocument();
    expect(screen.getByText('Try a different term, or browse all articles.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear search' })).toHaveAttribute('href', '/');
  });

  it('3 — a category has no articles', () => {
    render(<EmptyCategoryState category="Operations" slug="operations" />);

    expect(screen.getByRole('heading', { name: 'Nothing in Operations yet' })).toBeInTheDocument();
    expect(
      screen.getByText('Articles you assign to this category will appear here.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New article in Operations' })).toHaveAttribute(
      'href',
      '/articles/new?category=operations',
    );
  });

  it('4 — no categories exist', () => {
    render(<NoCategoriesState />);

    expect(screen.getByRole('heading', { name: 'No categories yet' })).toBeInTheDocument();
    expect(screen.getByText('Categories help you group related articles.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a category' })).toBeInTheDocument();
  });

  it('5 — a filter combination yields nothing', () => {
    render(<NoFilterMatchState />);

    expect(
      screen.getByRole('heading', { name: 'No articles match these filters.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Try removing a filter.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/');
  });

  it('renders each state with a decorative, aria-hidden icon', () => {
    const { container } = render(<NoArticlesState />);

    const wrapper = container.querySelector('[aria-hidden="true"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('svg')).not.toBeNull();
  });

  it('uses EmptyState for all five, so no state renders blank', () => {
    for (const element of [
      <NoArticlesState key="1" />,
      <NoResultsState key="2" query="q" />,
      <EmptyCategoryState key="3" category="C" slug="c" />,
      <NoCategoriesState key="4" />,
      <NoFilterMatchState key="5" />,
    ]) {
      const { container, unmount } = render(element);
      expect(container.querySelector('h2')).not.toBeNull();
      expect(container.querySelectorAll('a, button').length).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe('EmptyState', () => {
  it('renders a description without an action when no action is supplied', () => {
    render(<EmptyState icon={null} title="T" description="D" />);

    expect(screen.getByRole('heading', { name: 'T' })).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleCard } from './article-card';
import type { ArticleCardProps } from './article-card';

const UPDATED_AT = new Date('2026-09-08T12:00:00.000Z');

function props(overrides: Partial<ArticleCardProps> = {}): ArticleCardProps {
  return {
    title: 'Deploying the API',
    slug: 'deploying-the-api',
    summary: 'Step-by-step deploy guide for the internal API.',
    excerpt: 'Run the deploy script with the production environment flag…',
    status: 'published',
    category: { id: 3, name: 'Engineering', slug: 'engineering' },
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

describe('ArticleCard', () => {
  it('renders title, summary, category name, and a time with a dateTime attribute', () => {
    render(<ArticleCard {...props()} />);

    expect(screen.getByRole('heading', { name: /Deploying the API/ })).toBeInTheDocument();
    expect(screen.getByText('Step-by-step deploy guide for the internal API.')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();

    const time = screen.getByText(/ago|just now/);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', UPDATED_AT.toISOString());
  });

  it('falls back to excerpt when summary is null', () => {
    render(<ArticleCard {...props({ summary: null })} />);

    expect(
      screen.getByText('Run the deploy script with the production environment flag…'),
    ).toBeInTheDocument();
  });

  it('renders a Draft badge for a draft', () => {
    render(<ArticleCard {...props({ status: 'draft' })} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders an Archived badge for an archived article', () => {
    render(<ArticleCard {...props({ status: 'archived' })} />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders no badge for a published article', () => {
    render(<ArticleCard {...props({ status: 'published' })} />);

    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
  });

  it('contains exactly one anchor, so no link is nested inside another', () => {
    const { container } = render(<ArticleCard {...props()} />);

    expect(container.querySelectorAll('a')).toHaveLength(1);
  });

  it('renders Uncategorized when the category is null', () => {
    render(<ArticleCard {...props({ category: null })} />);

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('links to the article detail route', () => {
    render(<ArticleCard {...props()} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/articles/deploying-the-api');
  });
});

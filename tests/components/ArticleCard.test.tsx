import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleCard } from '@/components/article/ArticleCard';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...rest }: any) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

// Mock date-fns to return a stable value
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

describe('ArticleCard', () => {
  const mockArticle = {
    id: 'test-1',
    title: 'Test Article Title',
    content: 'This is the markdown content of the test article. It should be shown in preview.',
    updatedAt: '2024-01-15T00:00:00Z',
    categoryName: 'Engineering',
  };

  it('renders title, preview, and meta row', () => {
    render(<ArticleCard article={mockArticle} />);

    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText(/This is the markdown content/)).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<ArticleCard article={mockArticle} />);
    const link = container.querySelector('a');
    expect(link).toHaveClass('border-[var(--color-border)]');
    expect(link).not.toHaveClass('border-[var(--color-accent)]');
  });

  it('applies selected variant classes', () => {
    const { container } = render(<ArticleCard article={mockArticle} variant="selected" />);
    const link = container.querySelector('a');
    expect(link?.className).toContain('border-[var(--color-accent)]');
    expect(link?.className).toContain('bg-[var(--color-accent-subtle)]');
  });

  it('is wrapped in a link to the article detail page', () => {
    render(<ArticleCard article={mockArticle} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/articles/test-1');
  });
});

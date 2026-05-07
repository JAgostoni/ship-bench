import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

// Mock Button (just render a button for test purposes)
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="No articles found"
        description="Try a different search term."
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('No articles found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
  });

  it('shows action button when actionLabel and onAction provided', () => {
    render(
      <EmptyState
        icon={<svg />}
        title="No articles"
        description="Create your first article."
        actionLabel="Create Article"
        onAction={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: 'Create Article' });
    expect(button).toBeInTheDocument();
  });

  it('hides action button when no actionLabel provided', () => {
    render(
      <EmptyState
        icon={<svg />}
        title="No articles"
        description="Nothing to see here."
      />
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={<svg />}
        title="No articles"
        description="Get started."
        actionLabel="Create"
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger', 'link'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);

      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
    },
  );

  it.each(['sm', 'md', 'lg', 'icon'] as const)('renders the %s size', (size) => {
    render(
      <Button size={size} aria-label={size}>
        {size === 'icon' ? null : size}
      </Button>,
    );

    expect(screen.getByRole('button', { name: size })).toBeInTheDocument();
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={(node) => void (ref.current = node)}>Save</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Save');
  });

  it('defaults to type="button" so it never submits a surrounding form by accident', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('keeps the accessible name and width while loading', () => {
    render(<Button loading>Save article</Button>);

    const button = screen.getByRole('button', { name: 'Save article' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders an icon-only button with its required accessible name', () => {
    render(
      <Button size="icon" aria-label="More actions">
        <span aria-hidden="true">⋯</span>
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
  });

  it('calls onClick and does nothing when disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);

    screen.getByRole('button', { name: 'Go' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    screen.getByRole('button', { name: 'Go' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the child element itself when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/custom-target">New article</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'New article' });
    expect(link).toHaveAttribute('href', '/custom-target');
    expect(link.className).toContain('bg-accent');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ArticleEditor } from '@/components/article/ArticleEditor';

// Mock server actions
vi.mock('@/src/actions/articles', () => ({
  createArticle: vi.fn(async () => ({ success: true, article: { id: 'new-id' } })),
  updateArticle: vi.fn(async () => ({ success: true, article: { id: 'existing-id' } })),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ArticleEditor', () => {
  it('renders title input and content textarea in draft mode', () => {
    render(<ArticleEditor isEdit={false} />);

    expect(screen.getByRole('textbox', { name: 'Article title' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Article content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Article/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('renders with pre-filled values in edit mode', () => {
    render(
      <ArticleEditor
        title="Existing Title"
        content="Existing content."
        isEdit={true}
        articleId="existing-id"
      />
    );

    expect(screen.getByRole('textbox', { name: 'Article title' })).toHaveValue('Existing Title');
    expect(screen.getByRole('textbox', { name: 'Article content' })).toHaveValue('Existing content.');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('shows validation errors when both fields empty', () => {
    render(<ArticleEditor isEdit={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Article' }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/article content is required/i)).toBeInTheDocument();
  });

  it('shows validation error for empty title only', () => {
    render(<ArticleEditor isEdit={false} />);

    const contentTextarea = screen.getByRole('textbox', { name: 'Article content' });
    fireEvent.change(contentTextarea, { target: { value: 'Some content' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Article' }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/article content is required/i)).not.toBeInTheDocument();
  });

  it('clears validation error on input change', () => {
    render(<ArticleEditor isEdit={false} />);

    // First trigger validation error
    fireEvent.click(screen.getByRole('button', { name: 'Create Article' }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();

    // Then clear it by typing
    const titleInput = screen.getByRole('textbox', { name: 'Article title' });
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchInput } from '@/components/search/SearchInput';

// Mock fetch globally
const originalFetch = global.fetch;

afterAll(() => {
  vi.restoreAllMocks();
});

describe('SearchInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders search input with correct attributes', () => {
    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search articles' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search articles…');
  });

  it('calls fetch API when typing with debounce delay', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: '1', title: '<mark>Test</mark> Article', status: 'published', categoryName: null, contentSnippet: '<mark>Test</mark> snippet', rank: 0 },
        ],
      }),
    });

    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search articles' });

    fireEvent.change(input, { target: { value: 'Test' } });

    // Wait for debounce (250ms) + fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('shows "No results" when API returns empty results', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search articles' });

    fireEvent.change(input, { target: { value: 'zzzz' } });

    // Wait for debounce (250ms) + fetch + render
    await waitFor(() => {
      expect(screen.getByText(/No results for/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

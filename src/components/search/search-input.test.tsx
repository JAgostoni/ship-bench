import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

vi.mock('next/navigation', () => navigationModuleMock());

// The component tree is imported after the mock so `next/navigation` resolves to
// the stub above.
const { SearchInput } = await import('./search-input');

/**
 * Task 5.1's "done when": the debounce is asserted with fake timers, and the field
 * is proven to stay locally controlled — typing must never be blocked waiting for a
 * navigation.
 */
describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetNavigation({ href: '/search' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderInput(props: Partial<Parameters<typeof SearchInput>[0]> = {}) {
    return render(<SearchInput initialQuery={navigation.searchParams.get('q') ?? ''} {...props} />);
  }

  /** Seeds the field from the URL, which is the only way the value is set. */
  function seedQuery(q: string) {
    resetNavigation({ href: `/search?q=${encodeURIComponent(q)}` });
  }

  it('renders an aria-label rather than relying on the placeholder', () => {
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    expect(input).toHaveAttribute('placeholder', 'Search articles…');
    expect(input).toHaveAttribute('maxlength', '200');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  it('wraps the field in a role="search" form landmark', () => {
    renderInput();

    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('updates the input value immediately, before the debounce elapses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.clear(input);
    await user.type(input, 'roll');

    expect(input).toHaveValue('roll');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('calls router.replace once with /search?q=… after the debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.clear(input);
    await user.type(input, 'deploy');

    expect(navigation.replace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith('/search?q=deploy', { scroll: false });
  });

  it('does not navigate once per keystroke', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.clear(input);
    await user.type(input, 'search');

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it('renders the clear button only when the input is non-empty, and clears on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.type(input, 'x');

    const clear = screen.getByRole('button', { name: 'Clear search' });
    expect(clear).toBeInTheDocument();

    await user.click(clear);

    expect(input).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(navigation.replace).toHaveBeenCalledWith('/search', { scroll: false });
  });

  it('clears a non-empty input on Escape', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    seedQuery('deploy');
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    expect(input).toHaveValue('deploy');

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
  });

  it('blurs an already-empty input on Escape', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.click(input);
    expect(input).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(input).not.toHaveFocus();
  });

  it('focuses the field when / is pressed outside a text entry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInput();

    await user.keyboard('/');

    expect(screen.getByRole('searchbox', { name: 'Search articles' })).toHaveFocus();
  });

  it('does not steal / from a focused text field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <div>
        <textarea data-testid="other" />
        <SearchInput initialQuery="" />
      </div>,
    );

    const other = screen.getByTestId('other');
    await user.click(other);
    await user.keyboard('/');

    expect(screen.getByRole('searchbox', { name: 'Search articles' })).not.toHaveFocus();
  });

  it('opens the palette from the ⌘K shortcut and from the key-cap button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenPalette = vi.fn();
    renderInput({ onOpenPalette });

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.click(input);
    await user.keyboard('{Control>}k{/Control}');

    expect(onOpenPalette).toHaveBeenCalled();

    onOpenPalette.mockReset();
    await user.click(screen.getByRole('button', { name: 'Open command palette' }));

    expect(onOpenPalette).toHaveBeenCalledTimes(1);
  });

  it('does not submit the form natively on Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderInput();

    const form = container.querySelector('form');
    const submit = vi.fn((event: Event) => event.preventDefault());
    form?.addEventListener('submit', submit);

    const input = screen.getByRole('searchbox', { name: 'Search articles' });
    await user.click(input);
    await user.keyboard('{Enter}');

    // The form's submit handler prevented the default, so no navigation entry was
    // pushed by a native GET.
    expect(navigation.push).not.toHaveBeenCalled();
  });
});

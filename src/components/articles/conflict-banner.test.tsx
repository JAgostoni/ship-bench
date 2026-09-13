import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

/**
 * The conflict banner (iteration 6.4) — design-spec.md §5.5.
 *
 * The four cases the iteration file names, asserted through `ConflictBanner` plus a
 * small harness that reproduces the form's own wiring (the clipboard write and the
 * reload confirmation). The harness exists because the banner is deliberately
 * presentational: it takes `onCopy`/`onReloadRequest` rather than owning the clipboard
 * or the dialog, which is what lets `ArticleForm` place it above the form's first field
 * without giving the banner knowledge of the form.
 *
 * `ArticleForm`'s action is mocked at the module boundary, so the simulated 409 is a
 * real `useActionState` result flowing into a real banner — not a prop stub.
 */

const updateArticle = vi.fn();

vi.mock('next/navigation', () => navigationModuleMock());
vi.mock('@/app/actions/articles', () => ({
  createArticle: vi.fn(),
  updateArticle: (...args: unknown[]) => updateArticle(...args),
}));

// The editor is a `ssr: false` dynamic import of a ~120 KB package; a textarea keeps
// these tests about the banner rather than about the editor's bundle.
vi.mock('./markdown-editor', () => ({
  default: ({
    value,
    onChange,
    describedBy,
  }: {
    value: string;
    onChange: (next: string) => void;
    describedBy?: string;
  }) => (
    <textarea
      id="bodyMd"
      name="bodyMd"
      aria-label="Article body"
      aria-describedby={describedBy}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const { ConflictBanner, ArticleForm } = await import('./article-form');

const ARTICLE = {
  id: 7,
  title: 'Deploying the API',
  slug: 'deploying-the-api',
  summary: 'A deploy guide.',
  excerpt: '',
  status: 'published' as const,
  category: null,
  version: 4,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  bodyMd: '## Prerequisites\n\nNode 24 LTS.',
};

/** The exact string the banner's Copy button must produce (design-spec.md §5.5). */
const EXPECTED_CLIPBOARD_TEXT = `${ARTICLE.title}\n\n${ARTICLE.summary}\n\n${ARTICLE.bodyMd}`;

describe('ConflictBanner', () => {
  it('renders with focus applied when it appears', async () => {
    render(<ConflictBanner onCopy={vi.fn()} copied={false} onReloadRequest={vi.fn()} />);

    const banner = screen.getByRole('alert');
    await waitFor(() => expect(banner).toHaveFocus());
    expect(banner).toHaveAttribute('tabindex', '-1');
    expect(banner).toHaveTextContent('This article was updated by someone else.');
    expect(banner).toHaveTextContent(
      'Reload the latest version to see their changes, or copy your text first so nothing is lost.',
    );
  });

  it('places Copy my text before the destructive reload path', () => {
    render(<ConflictBanner onCopy={vi.fn()} copied={false} onReloadRequest={vi.fn()} />);

    const labels = screen.getAllByRole('button').map((button) => button.textContent?.trim());
    expect(labels[0]).toBe('Reload latest version');
    expect(labels[1]).toMatch(/Copy my text/);
  });

  it('reports Copied for 2 seconds and then reverts', async () => {
    updateArticle.mockResolvedValue({ status: 'error', message: 'conflict', conflict: true });
    render(<ArticleForm mode="edit" categories={[]} article={ARTICLE} />);

    // The banner only exists once the action has reported a conflict, so the copy
    // button is reached the way a user reaches it: by saving and being told no.
    await act(async () => {
      screen.getByRole('button', { name: 'Save changes' }).click();
    });
    const copy = await screen.findByRole('button', { name: /Copy my text/ });

    vi.useFakeTimers();
    try {
      await act(async () => {
        copy.click();
      });

      expect(screen.getByRole('button', { name: /Copied/ })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByRole('button', { name: /Copy my text/ })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ArticleForm conflict handling', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    updateArticle.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    resetNavigation({ pathname: '/articles/deploying-the-api/edit' });
  });

  /** Replaces `navigator.clipboard` after `userEvent.setup()`, which installs its own. */
  function stubClipboard() {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  }

  it('renders the banner with focus when the action reports a conflict', async () => {
    updateArticle.mockResolvedValue({
      status: 'error',
      message: 'This article was updated by someone else. Your changes were not saved.',
      conflict: true,
    });

    const user = userEvent.setup();
    render(<ArticleForm mode="edit" categories={[]} article={ARTICLE} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const banner = await screen.findByRole('alert');
    await waitFor(() => expect(banner).toHaveFocus());
    expect(banner).toHaveTextContent('This article was updated by someone else.');
  });

  it('writes the concatenated title, summary, and body to the clipboard', async () => {
    updateArticle.mockResolvedValue({ status: 'error', message: 'conflict', conflict: true });

    const user = userEvent.setup();
    // jsdom implements `navigator.clipboard` as an accessor with no setter, and
    // `userEvent.setup()` installs its own stub — so this runs after setup, and only the
    // banner's single write is asserted.
    stubClipboard();
    render(<ArticleForm mode="edit" categories={[]} article={ARTICLE} />);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: /Copy my text/ }));

    expect(writeText).toHaveBeenCalledWith(EXPECTED_CLIPBOARD_TEXT);
  });

  it('opens a confirm dialog for Reload latest version rather than discarding immediately', async () => {
    updateArticle.mockResolvedValue({ status: 'error', message: 'conflict', conflict: true });

    const user = userEvent.setup();
    render(<ArticleForm mode="edit" categories={[]} article={ARTICLE} />);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Reload latest version' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Discard your unsaved edits?');
    expect(dialog).toHaveTextContent('Copy them first if you want to keep them.');
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard and reload' })).toBeInTheDocument();
  });

  it('submits the stale version as a hidden field so the server can detect the conflict', async () => {
    updateArticle.mockResolvedValue({ status: 'error', message: 'conflict', conflict: true });

    const user = userEvent.setup();
    render(<ArticleForm mode="edit" categories={[]} article={ARTICLE} />);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateArticle).toHaveBeenCalledTimes(1));
    const [, formData] = updateArticle.mock.calls[0] as [unknown, FormData];
    expect(formData.get('version')).toBe('4');
    expect(formData.get('id')).toBe('7');
    expect(formData.get('previousStatus')).toBe('published');
  });
});

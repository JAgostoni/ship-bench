import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation, navigationModuleMock, resetNavigation } from '@/test/next-navigation';

/**
 * `ArticleForm` (iteration 6.3).
 *
 * The three cases the architecture spec §11.3 names, plus the four additions the
 * iteration file lists. The action is mocked because the form's job is to *call* it with
 * the right payload — the action's own behaviour is covered against a real database in
 * `src/app/actions/articles.test.ts`, so mocking here keeps the two concerns separate
 * rather than testing the same thing twice at different layers.
 */

const createArticle = vi.fn();
const updateArticle = vi.fn();

vi.mock('next/navigation', () => navigationModuleMock());
vi.mock('@/app/actions/articles', () => ({
  createArticle: (...args: unknown[]) => createArticle(...args),
  updateArticle: (...args: unknown[]) => updateArticle(...args),
}));

// The editor is `next/dynamic(..., { ssr: false })` and pulls in ~120 KB of a
// third-party package; replacing it with a plain textarea keeps these tests about the
// form's contract. The real editor's own behaviour is exercised in the browser by the
// iteration-6 smoke script.
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
      // The real editor labels its textarea this way; mirroring it keeps the queries
      // below identical to what a user's assistive tech would see.
      aria-label="Article body"
      aria-describedby={describedBy}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const { ArticleForm, ConflictBanner } = await import('./article-form');

const CATEGORIES = [{ id: 3, name: 'Engineering', slug: 'engineering' }];

/**
 * The mock action is a plain async function, so `useActionState` sees a resolved
 * `ActionState` rather than Next.js's serialization. Returning `idle` keeps the form in
 * its neutral state, which is what the payload assertions care about.
 */
function idleAction() {
  return Promise.resolve({ status: 'idle' as const });
}

describe('ArticleForm', () => {
  beforeEach(() => {
    createArticle.mockReset();
    updateArticle.mockReset();
    createArticle.mockImplementation(idleAction);
    updateArticle.mockImplementation(idleAction);
    resetNavigation({ pathname: '/articles/new' });
  });

  function renderCreate() {
    return render(<ArticleForm mode="create" categories={CATEGORIES} />);
  }

  it('renders the title error on an empty submit and moves focus to the title input', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Save article' }));

    expect(await screen.findByText('Title must be at least 3 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveFocus();
    // The client blocked the submit, so the action was never reached.
    expect(createArticle).not.toHaveBeenCalled();
  });

  it('renders the summary error for a 301-character summary', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText(/Title/), 'Deploying the API');
    // `userEvent.type` on 301 characters is slow; setting the value directly still
    // triggers React's onChange, which is all the resolver needs.
    const summary = screen.getByLabelText(/Summary/);
    await user.clear(summary);
    await user.click(summary);
    await user.paste('x'.repeat(301));

    await user.click(screen.getByRole('button', { name: 'Save article' }));

    expect(await screen.findByText('Summary must be 300 characters or fewer.')).toBeInTheDocument();
  });

  it('calls the action once with the expected FormData on a valid submit', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText(/Title/), 'Deploying the API');
    await user.type(screen.getByLabelText('Article body'), '## Prerequisites');

    await user.click(screen.getByRole('button', { name: 'Save article' }));

    await waitFor(() => expect(createArticle).toHaveBeenCalledTimes(1));

    const [, formData] = createArticle.mock.calls[0] as [unknown, FormData];
    expect(formData.get('title')).toBe('Deploying the API');
    expect(formData.get('bodyMd')).toBe('## Prerequisites');
    // The schema's output: `status` defaults to `draft`, and a `null` category is
    // omitted rather than sent empty (an empty string would coerce to 0 and fail).
    expect(formData.get('status')).toBe('draft');
    expect(formData.get('categoryId')).toBeNull();
    expect(formData.get('intent')).toBe('save');
  });

  it('does not offer Archived in the status select', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('combobox', { name: 'Status' }));

    expect(await screen.findByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Published' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Archived' })).not.toBeInTheDocument();
  });

  it('omits the change-note field on create and includes it on edit', async () => {
    const { unmount } = renderCreate();
    expect(screen.queryByLabelText(/Change note/)).not.toBeInTheDocument();
    unmount();

    render(
      <ArticleForm
        mode="edit"
        categories={CATEGORIES}
        article={{
          id: 7,
          title: 'Deploying the API',
          slug: 'deploying-the-api',
          summary: null,
          excerpt: '',
          status: 'published',
          category: null,
          version: 4,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          publishedAt: new Date('2026-01-01T00:00:00Z'),
          bodyMd: '## Prerequisites',
        }}
      />,
    );

    expect(await screen.findByLabelText(/Change note/)).toBeInTheDocument();
  });

  it('shows the body character counter once the body reaches 190,000 characters', async () => {
    render(
      <ArticleForm
        mode="edit"
        categories={CATEGORIES}
        article={{
          id: 7,
          title: 'Deploying the API',
          slug: 'deploying-the-api',
          summary: null,
          excerpt: '',
          status: 'draft',
          category: null,
          version: 1,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          publishedAt: null,
          bodyMd: 'x'.repeat(190_000),
        }}
      />,
    );

    expect(await screen.findByText(/190,000 \/ 200,000 characters/)).toBeInTheDocument();
  });

  it('starts the create form empty: no pre-filled body and Draft status', async () => {
    renderCreate();

    expect(screen.getByLabelText(/Title/)).toHaveValue('');
    expect(screen.getByLabelText('Article body')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Draft');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Uncategorized');
  });

  it('includes the change note in the FormData on the edit route', async () => {
    updateArticle.mockResolvedValue({ status: 'error', message: 'conflict', conflict: true });

    const user = userEvent.setup();
    render(
      <ArticleForm
        mode="edit"
        categories={CATEGORIES}
        article={{
          id: 7,
          title: 'Deploying the API',
          slug: 'deploying-the-api',
          summary: null,
          excerpt: '',
          status: 'published',
          category: null,
          version: 4,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          publishedAt: new Date('2026-01-01T00:00:00Z'),
          bodyMd: '## Prerequisites',
        }}
      />,
    );

    await user.type(await screen.findByLabelText(/Change note/), 'Clarified the steps');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateArticle).toHaveBeenCalledTimes(1));
    const [, formData] = updateArticle.mock.calls[0] as [unknown, FormData];
    // The regression this pins: `zodResolver` replaces the values with the schema's
    // output, so a schema without `changeNote` drops it and the revision is written with
    // a null note even though the author typed one.
    expect(formData.get('changeNote')).toBe('Clarified the steps');
  });
});

describe('ConflictBanner', () => {
  it('receives focus when it appears', async () => {
    render(<ConflictBanner onCopy={vi.fn()} copied={false} onReloadRequest={vi.fn()} />);

    const banner = screen.getByRole('alert');
    await waitFor(() => expect(banner).toHaveFocus());
    expect(banner).toHaveTextContent('This article was updated by someone else.');
  });

  it('offers Copy my text before the destructive reload path', () => {
    render(<ConflictBanner onCopy={vi.fn()} copied={false} onReloadRequest={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName('Reload latest version');
    // The escape hatch is present and not hidden — UX14's whole justification.
    expect(buttons[1]).toHaveAccessibleName(/Copy my text/);
  });

  it('swaps the label to Copied when the copy succeeds', () => {
    render(<ConflictBanner onCopy={vi.fn()} copied onReloadRequest={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Copied/ })).toBeInTheDocument();
  });
});

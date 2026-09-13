import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleBody } from './article-body';
import { extractHeadings } from './toc-headings';

describe('ArticleBody', () => {
  it('renders a real h2 from "## Prerequisites" rather than literal hashes', () => {
    render(<ArticleBody markdown={'## Prerequisites\n\n- Node 24 LTS'} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Prerequisites' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('##');
  });

  it('renders a real table from GFM syntax', () => {
    const markdown = ['| Environment | Region |', '| --- | --- |', '| Staging | us-east-1 |'].join(
      '\n',
    );

    render(<ArticleBody markdown={markdown} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Environment' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'us-east-1' })).toBeInTheDocument();
  });

  it('renders a task-list checkbox', () => {
    render(<ArticleBody markdown={'- [x] Confirm CI is green\n- [ ] Announce the window'} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('gives a task-list checkbox an accessible name, since a disabled input has none', () => {
    render(<ArticleBody markdown={'- [x] Confirm CI is green\n- [ ] Announce the window'} />);

    // GFM renders these as `<input type="checkbox" disabled>`. Without a label axe
    // reports `label` (critical), because a disabled control is still in the
    // accessibility tree and announces as an unnamed checkbox.
    expect(screen.getByRole('checkbox', { name: 'Completed task' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Incomplete task' })).not.toBeChecked();
  });

  it('makes a fenced code block focusable, so its horizontal scroll is keyboard-reachable', () => {
    const { container } = render(<ArticleBody markdown={'```bash\nnpm run verify\n```'} />);

    // A wide `pre` overflows and scrolls; axe's `scrollable-region-focusable` (serious)
    // requires that region to be keyboard operable.
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre).toHaveAttribute('tabindex', '0');
  });

  it('does not parse raw HTML, so an embedded script never reaches the DOM', () => {
    const { container } = render(
      <ArticleBody markdown={'Before\n\n<script>alert(1)</script>\n\nAfter'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('alert(1)');
  });

  it('sanitizes an embedded img with an onerror handler', () => {
    const { container } = render(<ArticleBody markdown={'<img src="x" onerror="alert(1)" />'} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });

  it('gives headings ids that match the TOC extractor', () => {
    const markdown = '## Prerequisites\n\n## Step 1 — Build\n\n## Prerequisites\n';

    render(<ArticleBody markdown={markdown} />);

    const expected = extractHeadings(markdown).map((heading) => heading.id);
    expect(expected).toEqual(['prerequisites', 'step-1-build', 'prerequisites-2']);

    for (const id of expected) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('ignores a heading-looking line inside a fenced code block', () => {
    const markdown = ['```bash', '## not a heading', '```', '', '## Real heading'].join('\n');

    render(<ArticleBody markdown={markdown} />);

    expect(extractHeadings(markdown).map((heading) => heading.text)).toEqual(['Real heading']);
    expect(screen.getByRole('heading', { level: 2, name: 'Real heading' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'not a heading' })).not.toBeInTheDocument();
  });
});

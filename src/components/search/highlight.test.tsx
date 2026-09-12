import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Highlight } from './highlight';

/**
 * Task 5.2's three cases, the second of which is the security assertion: segment
 * text must render as text, never as markup.
 */
describe('Highlight', () => {
  it('wraps exactly the matching segment in one <mark>', () => {
    const { container } = render(
      <Highlight
        segments={[
          { text: 'Deploying the ', match: false },
          { text: 'API', match: true },
        ]}
      />,
    );

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('API');
    expect(container.textContent).toBe('Deploying the API');
  });

  it('renders a script tag as text, with no <script> element in the DOM', () => {
    const { container } = render(
      <Highlight segments={[{ text: '<script>alert(1)</script>', match: true }]} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('mark')?.textContent).toBe('<script>alert(1)</script>');
  });

  it('renders nothing for an empty segment array', () => {
    const { container } = render(<Highlight segments={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders several matches as several marks, preserving order', () => {
    const { container } = render(
      <Highlight
        segments={[
          { text: 'Run the ', match: false },
          { text: 'deploy', match: true },
          { text: ' script, then ', match: false },
          { text: 'deploy', match: true },
          { text: ' again.', match: false },
        ]}
      />,
    );

    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(container.textContent).toBe('Run the deploy script, then deploy again.');
  });

  it('does not treat non-matching text as markup', () => {
    const { container } = render(<Highlight segments={[{ text: '<b>bold</b>', match: false }]} />);

    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>bold</b>');
  });
});

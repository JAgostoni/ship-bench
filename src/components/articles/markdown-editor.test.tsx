import { describe, expect, it } from 'vitest';
import { toolbarAccessibility, TOOLBAR_COMMANDS } from './markdown-editor';

/**
 * The editor toolbar's accessibility contract (design-spec.md E4,
 * `architecture.md` §13.5).
 *
 * These two properties were **bug fixes surfaced by the iteration-7 Playwright axe
 * smoke check**, not decoration: the library renders its icons as
 * `<svg role="img">` with no accessible name, which axe reports as `svg-img-alt`
 * (serious), and it does not label the buttons itself. Asserting both here keeps the
 * regression unit-visible rather than only E2E-visible.
 */
describe('the editor toolbar', () => {
  it('exposes exactly the ten E4 commands, in order', () => {
    expect(TOOLBAR_COMMANDS.map((command) => toolbarAccessibility([command])[0].label)).toEqual([
      'Bold',
      'Italic',
      'Heading 2',
      'Heading 3',
      'Link',
      'Bulleted list',
      'Numbered list',
      'Inline code',
      'Code block',
      'Quote',
    ]);
  });

  it('labels every button and hides every icon from the accessibility tree', () => {
    const entries = toolbarAccessibility(TOOLBAR_COMMANDS);

    expect(entries).toHaveLength(TOOLBAR_COMMANDS.length);
    for (const entry of entries) {
      expect(entry.label).toBeTruthy();
      // The button carries the name, so the `role="img"` icon must be decorative or
      // axe reports svg-img-alt.
      expect(entry.iconHidden).toBe(true);
    }
  });
});

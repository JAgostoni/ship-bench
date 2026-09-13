'use client';

import MDEditor from '@uiw/react-md-editor/nohighlight';
import type { ICommand } from '@uiw/react-md-editor/commands';
import {
  bold,
  code,
  codeBlock,
  heading2,
  heading3,
  italic,
  link,
  orderedListCommand,
  quote,
  unorderedListCommand,
} from '@uiw/react-md-editor/commands';
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import { ArticleBody } from './article-body';
import '@uiw/react-md-editor/nohighlight';

/**
 * The Markdown editor (design-spec.md §3.5's editor rules, `architecture.md` §9.3).
 *
 * **This module is loaded with `next/dynamic(..., { ssr: false })`** from
 * `article-form.tsx`, so its ~120 KB never enters the browse route's first-load JS
 * (§9.3). Nothing may import it statically.
 *
 * Four decisions carry the weight:
 *
 * - **The `/nohighlight` entry point.** The default export bundles Prism syntax
 *   highlighting *and* renders its preview through `rehype-raw`, which parses raw
 *   HTML. `architecture.md` §6.7 and design-spec.md §10.6 rule 3 forbid embedded
 *   HTML reaching the DOM, so the highlighter build is the wrong dependency
 *   regardless of size.
 * - **The preview is this app's own renderer.** `components.preview` swaps in
 *   `ArticleBody`, so the author previews through the *identical*
 *   `react-markdown` + `remark-gfm` + `rehype-sanitize` pipeline and `prose` classes
 *   that render the published article (E5). Parity is structural rather than a claim
 *   about two similar configurations, and it is what keeps `rehype-raw` out of the
 *   preview for good.
 * - **The pane height is measured, not hard-coded.** `MDEditor` gives the
 *   textarea/preview row whatever height is left after its toolbar, and its own
 *   textarea is `height: 100%`. Feeding the measured toolbar height in makes the
 *   content row land on the design spec's 300px minimum with both panes side by side,
 *   and keeps that true when the toolbar wraps.
 * - **⌘/Ctrl+Enter is bound here, not by the library.** `requestSubmit()` keeps the
 *   form's own submit path — including RHF validation — in charge, so the shortcut
 *   saves exactly what the Save button saves.
 *
 * The toolbar's ten buttons, their sizing, the sticky/scrolling behaviour, and the
 * token mapping for the library's own CSS variables live in `globals.css` under
 * `.kb-editor`. The library's markup is kept intact so its command execution still
 * works; only its GitHub-flavoured chrome is replaced.
 */

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /** `id` of the form's submit control, so ⌘+Enter triggers the same path. */
  submitButtonId?: string;
  /** `id` of the body field's hint, forwarded to the textarea. */
  describedBy?: string;
  invalid?: boolean;
};

/** Initial toolbar height, replaced by the first measurement. */
const TOOLBAR_FALLBACK_PX = 38;
/** The content row's height, per design-spec.md §3.5's layout note. */
const PANE_HEIGHT_PX = 300;
/** The toolbar's single-row height; anything above it is a wrapped second row. */
const TOOLBAR_SINGLE_ROW_PX = 38;

/** Overrides the library's labels, which advertise its own default shortcuts. */
function labelled(command: ICommand, label: string, hint?: string): ICommand {
  return {
    ...command,
    // `kb-touch` gives the 32×32 button a 44px hit area on coarse pointers (§6.4).
    buttonProps: { 'aria-label': label, title: hint ?? label, className: 'kb-touch' },
    /*
     * The library's icons are `<svg role="img">` with **no accessible name**, which
     * axe reports as `svg-img-alt` (serious) on the editor routes. The button already
     * carries the name via `aria-label`, so the icon is purely decorative and must be
     * hidden from the accessibility tree rather than given a duplicate label.
     * `cloneElement` is how the override reaches the library's own element — the
     * surrounding markup is intentionally left intact so command execution still works.
     *
     * The cast is required because `ICommand['icon']` is typed as a bare
     * `React.ReactElement` (props `unknown`), so the clone's attributes cannot be
     * checked against it.
     */
    icon: isValidElement(command.icon)
      ? (cloneElement(command.icon as React.ReactElement<{ 'aria-hidden'?: string }>, {
          'aria-hidden': 'true',
        }) as ICommand['icon'])
      : command.icon,
  };
}

/**
 * The accessibility contract the editor toolbar's buttons must satisfy
 * (design-spec.md E4, `architecture.md` §13.5). Every command is labelled by its
 * button, and its icon is decorative.
 */
export function toolbarAccessibility(commands: ICommand[]): {
  label: string | undefined;
  iconHidden: boolean;
}[] {
  return commands.map((command) => ({
    label: command.buttonProps?.['aria-label'] as string | undefined,
    iconHidden:
      isValidElement(command.icon) &&
      (command.icon.props as { 'aria-hidden'?: string })['aria-hidden'] === 'true',
  }));
}

/**
 * Exactly the ten buttons design-spec.md E4 names, in its order.
 *
 * The library supplies two lists: `commands` (the formatting set) and `extraCommands`
 * (its preview/fullscreen toggles). Overriding `commands` alone leaves four extra buttons
 * on screen — `Edit code`, `Live code`, `Preview code`, and `Toggle fullscreen` — which
 * are not in §3.5's list, and the two preview toggles actively fight the `preview="live"`
 * layout the spec fixes. `extraCommands` is therefore set to `[]` in the component.
 */
export const TOOLBAR_COMMANDS: ICommand[] = [
  labelled(bold, 'Bold', 'Bold (Ctrl/⌘+B)'),
  labelled(italic, 'Italic', 'Italic (Ctrl/⌘+I)'),
  labelled(heading2, 'Heading 2'),
  labelled(heading3, 'Heading 3'),
  labelled(link, 'Link', 'Link (Ctrl/⌘+K)'),
  labelled(unorderedListCommand, 'Bulleted list'),
  labelled(orderedListCommand, 'Numbered list'),
  labelled(code, 'Inline code'),
  labelled(codeBlock, 'Code block'),
  labelled(quote, 'Quote'),
];

export default function MarkdownEditor({
  value,
  onChange,
  submitButtonId,
  describedBy,
  invalid,
}: MarkdownEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(TOOLBAR_FALLBACK_PX);

  /**
   * The toolbar wraps once the viewport is narrow enough that ten buttons no longer
   * fit on one row, so its height is measured rather than assumed. A
   * `ResizeObserver` on the toolbar covers both the wrap and a width-driven
   * re-layout on rotate/resize.
   */
  useEffect(() => {
    const shell = shellRef.current;
    const toolbar = shell?.querySelector('.w-md-editor-toolbar');
    if (!toolbar) return;

    const measure = () => {
      const { height } = toolbar.getBoundingClientRect();
      if (height > 0) setToolbarHeight(height);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return;
      event.preventDefault();
      const form = shell?.closest('form');
      if (!(form instanceof HTMLFormElement)) return;
      const button = submitButtonId ? document.getElementById(submitButtonId) : null;
      form.requestSubmit(button instanceof HTMLButtonElement ? button : undefined);
    }

    shell.addEventListener('keydown', onKeyDown);
    return () => shell.removeEventListener('keydown', onKeyDown);
  }, [submitButtonId]);

  return (
    <div ref={shellRef} data-testid="markdown-editor" className="kb-editor">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? '')}
        preview="live"
        visibleDragbar={false}
        height={PANE_HEIGHT_PX + Math.max(0, toolbarHeight - TOOLBAR_SINGLE_ROW_PX)}
        commands={TOOLBAR_COMMANDS}
        // The library's `extraCommands` are its preview/fullscreen toggles. E4 lists ten
        // buttons and no more, and `preview="live"` is fixed by §3.5, so the extra set is
        // empty rather than merely empty-looking.
        extraCommands={[]}
        components={{ preview: (source) => <ArticleBody markdown={source || ''} /> }}
        textareaProps={{
          id: 'bodyMd',
          'aria-label': 'Article body',
          'aria-invalid': invalid || undefined,
          'aria-describedby': describedBy,
        }}
      />
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { uniqueId, slugifyHeading } from './toc-headings';

export type ArticleBodyProps = {
  markdown: string;
  className?: string;
};

/**
 * design-spec.md §6.7 / `architecture.md` §6.7, verbatim in behaviour.
 *
 * **[DECISION] `rehype-raw` is deliberately NOT used.** Without it, `react-markdown`
 * ignores embedded HTML entirely, and `rehype-sanitize` with its default schema is
 * a second line of defense. That removes the entire stored-XSS class from an
 * application with no authentication — the spec calls it the single highest-value
 * security decision, and `article-body.test.tsx` has a case that exists purely to
 * catch a regression here.
 *
 * The one addition to the spec's snippet is the `headingId` plugin below: the TOC
 * needs stable anchors, and Markdown headings have no `id` of their own. A second
 * addition makes each fenced code block focusable, because a wide block scrolls
 * horizontally and a scrollable region with no focusable content is flagged by axe
 * (`scrollable-region-focusable`) — see `globals.css`'s `.prose pre` rule for the
 * matching overflow style.
 *
 * **Plugin order matters.** `rehypeSanitize` runs **first**, then `headingId`.
 * Running the id assignment first would have it silently undone: the sanitizer's
 * default schema lists `id` in `clobber` with `clobberPrefix: 'user-content-'`, so
 * `id="prerequisites"` would become `user-content-prerequisites` and every TOC
 * link would miss. Assigning ids *after* sanitization is safe here precisely
 * because `rehype-raw` is absent — the only nodes present come from Markdown
 * syntax, never from author-supplied HTML.
 */
export function ArticleBody({ markdown, className }: ArticleBodyProps) {
  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize, headingIdPlugin]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * Assigns the same ids `extractHeadings()` computes, so a TOC link lands on the
 * heading it names. Duplicate headings get `-2`, `-3`, … from the shared
 * `uniqueId` helper in `toc-headings.ts`, which the TOC extractor uses too.
 *
 * It also makes each fenced code block focusable. A `pre` that overflows
 * horizontally is a scrollable region, and WCAG 2.1.1 / axe require it to be
 * keyboard-operable; `tabIndex={0}` is the standard remedy. The `overflow-x` that
 * creates the scroll is applied in `globals.css`, not here, so this plugin only
 * adds the tab stop.
 *
 * A plain function rather than a `unified` plugin factory: `rehypePlugins` accepts
 * a transformer directly, and this keeps the whole thing testable without pulling
 * in the plugin machinery.
 */
function headingIdPlugin() {
  return (tree: HastNode) => {
    const used = new Map<string, number>();

    visit(tree);
    return tree;

    function visit(node: HastNode) {
      if (node.type === 'element' && (node.tagName === 'h2' || node.tagName === 'h3')) {
        const text = toText(node).trim();
        if (text) {
          node.properties = node.properties ?? {};
          node.properties.id = uniqueId(slugifyHeading(text), used);
        }
      }

      if (node.type === 'element' && node.tagName === 'pre') {
        node.properties = { ...node.properties, tabIndex: 0 };
      }

      /*
       * GFM task-list items render as `<input type="checkbox" disabled>`, and a
       * disabled checkbox with no accessible name is flagged by axe's `label` rule
       * (critical) — a screen reader announces an unnamed, dimmed checkbox. The
       * item's own text sits beside it but is not programmatically associated, so
       * each box gets an `aria-label` describing the state it shows.
       */
      if (node.type === 'element' && node.tagName === 'input') {
        node.properties = {
          ...node.properties,
          'aria-label': node.properties?.checked ? 'Completed task' : 'Incomplete task',
        };
      }

      node.children?.forEach(visit);
    }
  };
}

/** Concatenates the text descendants of a node, matching what a reader sees. */
function toText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return node.children?.map(toText).join('') ?? '';
}

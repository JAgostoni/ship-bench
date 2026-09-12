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
 * needs stable anchors, and Markdown headings have no `id` of their own.
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
      node.children?.forEach(visit);
    }
  };
}

/** Concatenates the text descendants of a node, matching what a reader sees. */
function toText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return node.children?.map(toText).join('') ?? '';
}

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * GFM tables get a scroll wrapper so wide tables never break the reading
 * column (design §6.3); all other prose styling lives in globals.css
 * under `.article-body`.
 */
const components: Components = {
  table({ node, ...props }) {
    void node;
    return (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    );
  },
};

export type ArticleBodyProps = {
  /** Markdown source. Raw HTML stays escaped — no rehype-raw (architecture §5.2). */
  content: string;
};

/**
 * Shared Markdown renderer: the article detail page and the iteration-5
 * editor preview both render through this exact component (preview parity is
 * a hard requirement, design §2.3). Pure presentation — no data access.
 */
export function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div className="article-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

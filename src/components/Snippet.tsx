import { Fragment } from "react";

/**
 * Whitelist renderer for FTS snippet strings (architecture §5.1, design §8.4):
 * the repo injects exactly `<mark>`/`</mark>` around matched terms, so the
 * string is split on those known tokens and rendered as text nodes + real
 * `<mark>` elements — never `dangerouslySetInnerHTML`. Any other markup in the
 * string (e.g. HTML typed into article content) stays literal text.
 */

export type SnippetSegment = { text: string; marked: boolean };

const MARK_PAIR = /(<mark>[\s\S]*?<\/mark>)/;
const OPEN = "<mark>";
const CLOSE = "</mark>";

export function parseSnippet(snippet: string): SnippetSegment[] {
  return snippet
    .split(MARK_PAIR)
    .filter((part) => part !== "")
    .map((part) =>
      // Only complete pairs are captured by the split; an unpaired token
      // falls through as literal text.
      part.startsWith(OPEN) && part.endsWith(CLOSE)
        ? { text: part.slice(OPEN.length, -CLOSE.length), marked: true }
        : { text: part, marked: false },
    );
}

/** `<mark>` styling comes from the global element rule (design §1.3/S3). */
export function Snippet({ text }: { text: string }) {
  return (
    <>
      {parseSnippet(text).map((segment, i) =>
        segment.marked ? (
          <mark key={i}>{segment.text}</mark>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

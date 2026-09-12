import type { SearchSegment } from '@/types/domain';

/**
 * Renders FTS5 match segments as React text nodes, wrapping each match in `<mark>`
 * (design-spec.md §3.3 rule 2 and §10.6 rule 3).
 *
 * **No `dangerouslySetInnerHTML` anywhere in the codebase.** `{segment.text}` is
 * escaped by React automatically, so a body containing `<script>alert(1)</script>`
 * renders as literal text and can never execute — which is the whole reason the
 * repository returns `{ text, match }[]` instead of HTML (architecture.md §7.3).
 *
 * `<mark>` carries the native "highlighted" announcement, so it needs no ARIA. The
 * token background is `--color-mark-bg`, and the element also inherits `mark`'s
 * default text colour from the browser — never colour alone (WCAG 1.4.1).
 */
export function Highlight({ segments }: { segments: SearchSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          // Index keys are correct here: segments are a positional projection of
          // one immutable string, with no reordering and no stable identity.
          <mark key={index} className="bg-mark-bg text-ink rounded-[2px] px-0.5">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

import { Badge } from '@/components/ui/badge';
import type { ArticleStatus } from '@/server/db/schema';

/**
 * design-spec.md §5.1 / §4.5 and `architecture.md` §9.6.
 *
 * `published` returns `null` — it is the default state, and a badge on every row
 * is noise (design-spec.md §10.6 rule 6). The archived variant is what makes an
 * archived article's link non-rotting but still clearly marked (`architecture.md`
 * §9.1).
 */
export function StatusBadge({ status }: { status: ArticleStatus }) {
  if (status === 'draft') return <Badge variant="draft">Draft</Badge>;
  if (status === 'archived') return <Badge variant="archived">Archived</Badge>;
  return null;
}

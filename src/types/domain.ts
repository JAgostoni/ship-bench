// `ArticleStatus` is the single source of truth in the Drizzle schema. The
// `import type` form is required, not stylistic: a type-only import is erased
// at compile time, so no server module (and therefore no `better-sqlite3`) can
// reach a client bundle through this file. Architecture spec §10.4 records this
// as the reason; the `import 'server-only'` guard in `src/server/db/client.ts`
// is the runtime backstop.
import type { ArticleStatus } from '@/server/db/schema';

export type CategoryRef = { id: number; name: string; slug: string };

export type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  excerpt: string;
  status: ArticleStatus;
  category: CategoryRef | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type ArticleDetail = ArticleListItem & { bodyMd: string };

export type SearchSegment = { text: string; match: boolean };

export type SearchHit = {
  id: number;
  slug: string;
  title: string;
  status: ArticleStatus;
  category: CategoryRef | null;
  updatedAt: Date;
  rank: number;
  titleSegments: SearchSegment[];
  snippetSegments: SearchSegment[];
};

export type SearchResults = {
  query: string;
  total: number | null;
  limit: number;
  results: SearchHit[];
};

export type CategorySummary = CategoryRef & { description: string | null; articleCount: number };

export type CategoryDetail = CategoryRef & { description: string | null };

export type RevisionSummary = {
  id: number;
  revisionNumber: number;
  title: string;
  summary: string | null;
  bodyMd: string;
  editorName: string;
  changeNote: string | null;
  createdAt: Date;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number | null;
  hasNext: boolean;
};

/**
 * Server Action return contract, from architecture.md §7.5. `conflict` is set on
 * the error variant so the editor form can render the "Reload and merge"
 * affordance without inspecting the message string.
 */
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; articleId: number; slug: string; version: number }
  | {
      status: 'error';
      message: string;
      fieldErrors?: Record<string, string[]>;
      conflict?: boolean;
    };

export const initialActionState: ActionState = { status: 'idle' };

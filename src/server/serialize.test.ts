// The wire serializers for `GET /api/*` (iteration 5.6).
//
// `architecture.md` §7.3 lists exactly which members each response carries, and the
// repository types carry more than the wire needs (a search hit's `excerpt` would be
// a second copy of its snippet). These assertions pin the projection, so adding a
// repository field cannot silently widen the API contract.
import { describe, expect, it } from 'vitest';
import { toArticleDetailWire, toArticleWire, toCategoryWire, toSearchHitWire } from './serialize';
import type { ArticleDetail, ArticleListItem, CategorySummary, SearchHit } from '@/types/domain';

const UPDATED = new Date('2026-09-08T12:00:00.000Z');
const CREATED = new Date('2026-08-02T14:10:00.000Z');
const PUBLISHED = new Date('2026-08-02T14:12:31.000Z');

const CATEGORY = { id: 3, name: 'Engineering', slug: 'engineering' };

const LIST_ITEM: ArticleListItem = {
  id: 12,
  title: 'Deploying the API',
  slug: 'deploying-the-api',
  summary: 'Step-by-step deploy guide for the internal API.',
  excerpt: 'Run the deploy script with the production environment flag…',
  status: 'published',
  category: CATEGORY,
  version: 4,
  createdAt: CREATED,
  updatedAt: UPDATED,
  publishedAt: PUBLISHED,
};

describe('toArticleWire', () => {
  it('carries exactly the documented list members', () => {
    const wire = toArticleWire(LIST_ITEM);

    expect(Object.keys(wire).sort()).toEqual(
      [
        'category',
        'createdAt',
        'excerpt',
        'id',
        'publishedAt',
        'slug',
        'status',
        'summary',
        'title',
        'updatedAt',
        'version',
      ].sort(),
    );
  });

  it('serializes every Date to an ISO string', () => {
    const wire = toArticleWire(LIST_ITEM);

    expect(wire.createdAt).toBe(CREATED.toISOString());
    expect(wire.updatedAt).toBe(UPDATED.toISOString());
    expect(wire.publishedAt).toBe(PUBLISHED.toISOString());
  });

  it('passes a null publishedAt through as null rather than a bogus epoch', () => {
    const wire = toArticleWire({ ...LIST_ITEM, status: 'draft', publishedAt: null });

    expect(wire.publishedAt).toBeNull();
  });

  it('keeps a null category as null (Uncategorized is a UI concept, not a row)', () => {
    expect(toArticleWire({ ...LIST_ITEM, category: null }).category).toBeNull();
  });
});

describe('toArticleDetailWire', () => {
  it('adds bodyMd to the list members and nothing else', () => {
    const detail: ArticleDetail = { ...LIST_ITEM, bodyMd: '## Prerequisites\n\nNode 24 LTS.' };
    const wire = toArticleDetailWire(detail);

    expect(wire.bodyMd).toBe('## Prerequisites\n\nNode 24 LTS.');
    expect(Object.keys(wire).sort()).toEqual(
      Object.keys(toArticleWire(LIST_ITEM)).concat('bodyMd').sort(),
    );
  });
});

describe('toSearchHitWire', () => {
  it('carries the documented search members, including rank and both segment arrays', () => {
    const hit: SearchHit = {
      id: 12,
      slug: 'deploying-the-api',
      title: 'Deploying the API',
      status: 'published',
      category: CATEGORY,
      updatedAt: UPDATED,
      rank: -1.2437,
      titleSegments: [
        { text: 'Deploying the ', match: false },
        { text: 'API', match: true },
      ],
      snippetSegments: [{ text: 'Run the deploy script…', match: true }],
    };

    const wire = toSearchHitWire(hit);

    expect(Object.keys(wire).sort()).toEqual(
      [
        'category',
        'id',
        'rank',
        'slug',
        'snippetSegments',
        'status',
        'title',
        'titleSegments',
        'updatedAt',
      ].sort(),
    );
    expect(wire.rank).toBe(-1.2437);
    expect(wire.updatedAt).toBe(UPDATED.toISOString());
    expect(wire.titleSegments).toEqual(hit.titleSegments);
    // A search hit never carries an `excerpt`: the snippet is the body line.
    expect(wire).not.toHaveProperty('excerpt');
  });
});

describe('toCategoryWire', () => {
  it('carries id, name, slug, description, and articleCount', () => {
    const category: CategorySummary = { ...CATEGORY, description: null, articleCount: 12 };

    expect(toCategoryWire(category)).toEqual({
      id: 3,
      name: 'Engineering',
      slug: 'engineering',
      description: null,
      articleCount: 12,
    });
  });
});

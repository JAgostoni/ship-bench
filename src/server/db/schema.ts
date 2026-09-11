import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('categories_slug_unique').on(t.slug),
    uniqueIndex('categories_name_nocase_unique').on(sql`lower(${t.name})`),
  ],
);

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const articles = sqliteTable(
  'articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md').notNull().default(''),
    status: text('status', { enum: ARTICLE_STATUSES }).notNull().default('draft'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('articles_slug_unique').on(t.slug),
    index('articles_status_updated_idx').on(t.status, t.updatedAt),
    index('articles_category_idx').on(t.categoryId),
  ],
);

export const articleRevisions = sqliteTable(
  'article_revisions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    bodyMd: text('body_md').notNull(),
    editorName: text('editor_name').notNull(),
    changeNote: text('change_note'),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('article_revisions_unique').on(t.articleId, t.revisionNumber),
    index('article_revisions_article_idx').on(t.articleId, t.revisionNumber),
  ],
);

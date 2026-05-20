import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Categories Table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  categorySlugIdx: index('idx_categories_slug').on(table.slug),
}));

// Articles Table
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(), // Markdown format
  status: text('status', { enum: ['draft', 'published'] })
    .notNull()
    .default('published'),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
}, (table) => ({
  articleSlugIdx: index('idx_articles_slug').on(table.slug),
  articleCategoryIdx: index('idx_articles_category_id').on(table.categoryId),
}));

// Relations setup
export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
}));

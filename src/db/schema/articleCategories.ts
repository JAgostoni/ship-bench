import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { articles } from './articles';
import { categories } from './categories';

export const articleCategories = sqliteTable('article_categories', {
  articleId: text('article_id').notNull().references(() => articles.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
}, (table) => [
  primaryKey({ columns: [table.articleId, table.categoryId] }),
]);

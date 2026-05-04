import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

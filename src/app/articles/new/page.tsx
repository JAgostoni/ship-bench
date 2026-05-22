// src/app/articles/new/page.tsx
import React from 'react';
import { db } from '@/lib/db';
import { categories } from '@/lib/schema';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create New Article - TeamKB',
  description: 'Write and publish a new technical markdown article.',
};

export default async function NewArticlePage() {
  let allCategories: { id: number; name: string; slug: string }[] = [];

  try {
    allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .all();
  } catch (err) {
    console.error('Failed to load categories for article creation:', err);
  }

  return (
    <div style={{ padding: 'var(--spacing-md) 0', width: '100%', height: '100%' }}>
      <MarkdownEditor categories={allCategories} />
    </div>
  );
}

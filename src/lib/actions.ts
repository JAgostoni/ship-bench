'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { generateSlug } from '@/lib/slug';
import { stripMarkdown } from '@/lib/search';
import { articleCreateSchema, articleUpdateSchema } from '@/lib/validators';

function parseFormData(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  return raw;
}

export async function createArticle(formData: FormData) {
  const raw = parseFormData(formData);

  const parsed = articleCreateSchema.parse({
    title: raw.title,
    content: raw.content,
    categoryId: raw.categoryId ? Number(raw.categoryId) : null,
    status: raw.status ?? 'draft',
  });

  const slug = await generateSlug(parsed.title);
  const excerpt = stripMarkdown(parsed.content, 200);

  const article = await prisma.article.create({
    data: {
      title: parsed.title,
      slug,
      content: parsed.content,
      excerpt,
      status: parsed.status,
      categoryId: parsed.categoryId ?? null,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  revalidatePath('/');
  return article;
}

export async function updateArticle(id: number, formData: FormData) {
  const raw = parseFormData(formData);

  const parsed = articleUpdateSchema.parse({
    title: raw.title,
    content: raw.content,
    categoryId: raw.categoryId ? Number(raw.categoryId) : null,
    status: raw.status,
  });

  const data: Record<string, unknown> = {};

  if (parsed.title !== undefined) {
    data.title = parsed.title;
    data.slug = await generateSlug(parsed.title);
  }
  if (parsed.content !== undefined) {
    data.content = parsed.content;
    data.excerpt = stripMarkdown(parsed.content, 200);
  }
  if (parsed.categoryId !== undefined) {
    data.categoryId = parsed.categoryId;
  }
  if (parsed.status !== undefined) {
    data.status = parsed.status;
  }

  const article = await prisma.article.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  revalidatePath('/');
  revalidatePath(`/articles/${article.slug}`);
  return article;
}

export async function deleteArticle(id: number) {
  await prisma.article.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}

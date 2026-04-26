'use server';

import { prisma } from '@/lib/db';
import { ArticleSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { generateSlug } from '@/lib/utils';

export async function createArticle(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const validatedFields = ArticleSchema.safeParse({ title, content });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title: validTitle, content: validContent } = validatedFields.data;
  
  const slug = generateSlug(validTitle);

  try {
    const article = await prisma.article.create({
      data: {
        title: validTitle,
        content: validContent,
        slug: slug,
        // Using a default user since auth isn't implemented in MVP
        authorId: (await prisma.user.findFirst())?.id || 'default-user',
      },
    });

    revalidatePath('/');
    revalidatePath('/articles');
    return { success: true, slug: article.slug };
  } catch (e) {
    return { error: 'Database error: Failed to create article' };
  }
}

export async function updateArticle(slug: string, formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const validatedFields = ArticleSchema.safeParse({ title, content });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title: validTitle, content: validContent } = validatedFields.data;
  
  const newSlug = generateSlug(validTitle);

  try {
    await prisma.article.update({
      where: { slug },
      data: {
        title: validTitle,
        content: validContent,
        slug: newSlug,
      },
    });

    revalidatePath('/');
    revalidatePath('/articles');
    revalidatePath(`/articles/${newSlug}`);
    return { success: true, slug: newSlug };
  } catch (e) {
    return { error: 'Database error: Failed to update article' };
  }
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createArticle, updateArticle, deleteArticle } from '@/lib/articles';
import { createArticleSchema, updateArticleSchema } from '@/lib/schemas';

export type ActionState = {
  errors?: {
    title?: string[];
    content?: string[];
    status?: string[];
    categoryId?: string[];
    _form?: string[];
  };
};

export async function createArticleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    status: formData.get('status') as string,
    categoryId: (formData.get('categoryId') as string) || null,
  };

  const parsed = createArticleSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ActionState['errors']>;
      if (!errors[field]) errors[field] = [];
      errors[field]!.push(issue.message);
    }
    return { errors };
  }

  let article;
  try {
    article = await createArticle(parsed.data);
  } catch (err) {
    return { errors: { _form: [(err as Error).message ?? 'Failed to create article'] } };
  }

  revalidatePath('/articles');
  redirect(`/articles/${article.slug}`);
}

export async function updateArticleAction(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    status: formData.get('status') as string,
    categoryId: (formData.get('categoryId') as string) || null,
  };

  const parsed = updateArticleSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ActionState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ActionState['errors']>;
      if (!errors[field]) errors[field] = [];
      errors[field]!.push(issue.message);
    }
    return { errors };
  }

  let updatedArticle;
  try {
    updatedArticle = await updateArticle(id, parsed.data);
  } catch (err) {
    return { errors: { _form: [(err as Error).message ?? 'Failed to update article'] } };
  }

  revalidatePath('/articles');
  revalidatePath(`/articles/${updatedArticle.slug}`);
  redirect(`/articles/${updatedArticle.slug}`);
}

export async function deleteArticleAction(id: string, _formData?: FormData): Promise<void> {
  try {
    await deleteArticle(id);
  } catch {
    // Article not found — still redirect to list
  }
  revalidatePath('/articles');
  redirect('/articles');
}

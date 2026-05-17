'use server';

import { createCategory } from '@/lib/categories';
import { createCategorySchema } from '@/lib/schemas';

export type CategoryActionState = {
  errors?: {
    name?: string[];
    _form?: string[];
  };
};

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const raw = { name: formData.get('name') as string };

  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: CategoryActionState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<CategoryActionState['errors']>;
      if (!errors[field]) errors[field] = [];
      errors[field]!.push(issue.message);
    }
    return { errors };
  }

  try {
    await createCategory(parsed.data);
  } catch (err) {
    return { errors: { _form: [(err as Error).message ?? 'Failed to create category'] } };
  }

  return {};
}

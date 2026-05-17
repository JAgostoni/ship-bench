import { NextRequest } from 'next/server';
import { createCategorySchema } from '@/lib/schemas';
import { listCategories, createCategory } from '@/lib/categories';

export async function GET() {
  try {
    const categories = await listCategories();
    return Response.json({ categories });
  } catch {
    return Response.json({ error: 'Failed to fetch categories', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const category = await createCategory(parsed.data);
    return Response.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return Response.json({ error: err.message, code: 'CONFLICT' }, { status: 409 });
    }
    return Response.json({ error: 'Failed to create category', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

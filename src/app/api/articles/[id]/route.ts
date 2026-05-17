import { NextRequest } from 'next/server';
import { updateArticleSchema } from '@/lib/schemas';
import { getArticleById, updateArticle, deleteArticle, NotFoundError } from '@/lib/articles';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) {
    return Response.json({ error: 'Article not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  return Response.json(article);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = updateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const article = await updateArticle(id, parsed.data);
    return Response.json(article);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message, code: 'NOT_FOUND' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to update article', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await deleteArticle(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message, code: 'NOT_FOUND' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to delete article', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { articleQuerySchema, createArticleSchema } from '@/lib/schemas';
import { listArticles, searchArticles, createArticle } from '@/lib/articles';

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = articleQuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { q, category, status } = parsed.data;

  try {
    const articles = q
      ? await searchArticles(q, { categorySlug: category })
      : await listArticles({ categorySlug: category, status });
    return Response.json({ articles, total: articles.length });
  } catch {
    return Response.json({ error: 'Failed to fetch articles', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const article = await createArticle(parsed.data);
    return Response.json(article, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create article', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

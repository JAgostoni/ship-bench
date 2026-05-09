import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { articleUpdateSchema } from '@/lib/validators';
import { generateSlug } from '@/lib/slug';
import { stripMarkdown } from '@/lib/search';
import { z } from 'zod';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const articleId = Number(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (err) {
    console.error('GET /api/articles/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const articleId = Number(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = articleUpdateSchema.parse(body);

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
      where: { id: articleId },
      data,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json(article);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    // Prisma "not found" error
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    console.error('PUT /api/articles/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const articleId = Number(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    await prisma.article.delete({ where: { id: articleId } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Prisma "not found" error
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    console.error('DELETE /api/articles/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

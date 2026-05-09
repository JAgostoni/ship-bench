import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchArticles } from '@/lib/search';
import { articleCreateSchema } from '@/lib/validators';
import { generateSlug } from '@/lib/slug';
import { stripMarkdown } from '@/lib/search';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'published']).optional().default('published'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const params = querySchema.parse(Object.fromEntries(searchParams.entries()));

    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.category) {
      const category = await prisma.category.findUnique({
        where: { slug: params.category },
        select: { id: true },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    // If a search query is provided, use FTS search
    if (params.q) {
      const results = await searchArticles(params.q, params.page, params.limit);
      const filtered = results.articles.filter((a) => a.status === params.status);

      const total = params.status === 'published' ? results.total : filtered.length;
      const totalPages = Math.ceil(total / params.limit);

      return NextResponse.json({
        articles: filtered,
        total,
        page: params.page,
        totalPages,
      });
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / params.limit);

    return NextResponse.json({
      articles,
      total,
      page: params.page,
      totalPages,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: err.flatten() }, { status: 400 });
    }
    console.error('GET /api/articles error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = articleCreateSchema.parse(body);

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

    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/articles error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

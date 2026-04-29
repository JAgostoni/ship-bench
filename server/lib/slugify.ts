import type { PrismaClient } from '@prisma/client';

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function generateUniqueSlug(
  prisma: PrismaClient,
  title: string
): Promise<string> {
  const base = slugify(title);
  if (!base) {
    const fallback = 'article';
    const existing = await prisma.article.findFirst({
      where: { slug: { startsWith: fallback } },
      orderBy: { slug: 'desc' },
    });
    if (!existing) return fallback;
    const match = existing.slug.match(new RegExp(`^${fallback}-(\\d+)$`));
    const maxNum = match ? parseInt(match[1], 10) : 1;
    return `${fallback}-${maxNum + 1}`;
  }

  let slug = base;
  let suffix = 2;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }
  return slug;
}

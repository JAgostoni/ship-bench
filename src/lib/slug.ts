import { prisma } from '@/lib/prisma';

export async function generateSlug(title: string): Promise<string> {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .replace(/-+/g, '-');           // Collapse consecutive hyphens

  // Handle empty or all-special-char titles
  if (!slug) {
    slug = 'untitled';
  }

  // Uniqueness check: if slug exists, append -2, -3, etc.
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function generateSlug(title: string): Promise<string> {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function createArticle(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  
  if (!title || !content) {
    throw new Error('Title and content are required')
  }

  let slug = await generateSlug(title)
  
  const existing = await prisma.article.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      content,
    }
  })

  revalidatePath('/')
  redirect(`/articles/${article.slug}`)
}

export async function updateArticle(id: string, formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  
  if (!title || !content) {
    throw new Error('Title and content are required')
  }

  const existingArticle = await prisma.article.findUnique({ where: { id } })
  if (!existingArticle) {
    throw new Error('Article not found')
  }

  const article = await prisma.article.update({
    where: { id },
    data: { title, content },
  })

  revalidatePath('/')
  revalidatePath(`/articles/${article.slug}`)
  redirect(`/articles/${article.slug}`)
}

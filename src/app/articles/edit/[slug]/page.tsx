import { notFound } from 'next/navigation'
import prisma from '@/lib/db'
import Editor from '@/components/Editor'
import { updateArticle } from '@/actions/article.actions'

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await prisma.article.findUnique({ where: { slug } })
  
  if (!article) {
    notFound()
  }

  const updateArticleWithId = updateArticle.bind(null, article.id)

  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      <Editor 
        initialTitle={article.title}
        initialContent={article.content}
        action={updateArticleWithId} 
        cancelHref={`/articles/${article.slug}`}
      />
    </div>
  )
}

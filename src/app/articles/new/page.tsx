import Editor from '@/components/Editor'
import { createArticle } from '@/actions/article.actions'

export default function NewArticlePage() {
  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      <Editor 
        action={createArticle} 
        cancelHref="/"
      />
    </div>
  )
}

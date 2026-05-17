import { listCategories } from '@/lib/categories';
import { CreateArticleForm } from '@/components/CreateArticleForm';

export const metadata = { title: 'New Article — Knowledge Base' };

export default async function NewArticlePage() {
  const categories = await listCategories();
  return <CreateArticleForm categories={categories} />;
}

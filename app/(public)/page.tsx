import { getArticles, getCategories, getCategoryCounts } from '@/src/lib/articles';
import { Sidebar } from '@/components/layout/Sidebar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { BrowseContent } from './browse-content';

export default async function HomePage() {
  const [articlesResult, categoriesList, categoryCounts] = await Promise.all([
    getArticles({ limit: 20 }),
    getCategories(),
    getCategoryCounts(),
  ]);

  const sidebarCategories = categoriesList.map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    count: categoryCounts[cat.slug] ?? 0,
  }));

  const totalArticles = sidebarCategories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="flex">
      {/* Sidebar: visible on desktop (≥1024px), hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar
          categories={sidebarCategories}
          totalArticles={totalArticles}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1">
        <BrowseContent
          initialArticles={articlesResult.articles}
          nextCursor={articlesResult.nextCursor}
          sidebarCategories={sidebarCategories}
          totalArticles={totalArticles}
        />
      </div>
    </div>
  );
}

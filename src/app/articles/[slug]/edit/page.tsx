import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getArticleBySlug,
  listCategories,
  listTags,
} from "@/lib/queries/articles";
import { ArticleForm } from "@/components/articles/ArticleForm";

export const dynamic = "force-dynamic";

type EditArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EditArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found" };
  }
  return { title: `Edit: ${article.title}` };
}

export default async function EditArticlePage({
  params,
}: EditArticlePageProps) {
  const { slug } = await params;
  const [article, categories, tags] = await Promise.all([
    getArticleBySlug(slug),
    listCategories(),
    listTags(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <ArticleForm
      mode="edit"
      categories={categories}
      tags={tags}
      initialValues={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        contentHtml: article.contentHtml,
        status: article.status,
        categoryId: article.categoryId,
        tagIds: article.tags.map((t) => t.tagId),
        expectedUpdatedAt: article.updatedAt.toISOString(),
      }}
    />
  );
}

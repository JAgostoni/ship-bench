import type { Metadata } from "next";
import { listCategories, listTags } from "@/lib/queries/articles";
import { ArticleForm } from "@/components/articles/ArticleForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create article",
};

export default async function NewArticlePage() {
  const [categories, tags] = await Promise.all([
    listCategories(),
    listTags(),
  ]);

  return (
    <ArticleForm
      mode="create"
      categories={categories}
      tags={tags}
      initialValues={{
        title: "",
        slug: "",
        contentHtml: "",
        status: "DRAFT",
        categoryId: null,
        tagIds: [],
      }}
    />
  );
}

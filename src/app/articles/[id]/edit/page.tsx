import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";
import { parseArticleId } from "@/lib/api/http";
import { getArticle } from "@/lib/repo/articles";

// Content freshness beats caching for an internal KB (architecture §6.1).
export const dynamic = "force-dynamic";

export const metadata = { title: "Edit article — Team KB" };

/** S5 — edit article (design §1.3): RSC shell, article fetched via the repo. */
export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseArticleId(rawId);
  if (id === null) {
    notFound();
  }
  const article = getArticle(id);
  if (!article) {
    notFound();
  }

  return (
    <ArticleEditor
      mode="edit"
      article={{
        id: article.id,
        title: article.title,
        content: article.content,
      }}
      heading={<h1 className="text-xl font-semibold">Edit article</h1>}
    />
  );
}

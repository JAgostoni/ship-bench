import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/ArticleBody";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { parseArticleId } from "@/lib/api/http";
import { getArticle } from "@/lib/repo/articles";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
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
    <>
      {/* First focusable element in main (design §1.3/S2). */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text hover:underline"
      >
        <ArrowLeftIcon size={14} />
        All articles
      </Link>
      {/* Edit/Delete actions land here in iteration 5 (backlog decision #5). */}
      <h1 className="mt-4 text-2xl font-bold">{article.title}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Updated {formatDate(article.updatedAt)} · Created{" "}
        {formatDate(article.createdAt)}
      </p>
      <hr className="my-6 border-border" />
      <ArticleBody content={article.content} />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/ArticleBody";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { FocusHeading } from "@/components/FocusHeading";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, PencilIcon } from "@/components/ui/icons";
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
      {/* Actions right of the h1 ≥768px, full row below; ≥8px between
          targets (design §1.3/S2, §3.3). */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* tabIndex -1: focused after a post-save client-side push (§7.5). */}
        <h1 tabIndex={-1} className="text-2xl font-bold">
          {article.title}
        </h1>
        <FocusHeading />
        <div className="flex shrink-0 gap-2 max-md:w-full">
          <Button
            href={`/articles/${article.id}/edit`}
            variant="secondary"
            icon={<PencilIcon />}
          >
            Edit
          </Button>
          <DeleteArticleButton
            articleId={article.id}
            articleTitle={article.title}
          />
        </div>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        Updated {formatDate(article.updatedAt)} · Created{" "}
        {formatDate(article.createdAt)}
      </p>
      <hr className="my-6 border-border" />
      <ArticleBody content={article.content} />
    </>
  );
}

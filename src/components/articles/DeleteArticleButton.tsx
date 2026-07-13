"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteArticle } from "@/lib/actions/articles";
import { Button } from "@/components/ui/Button";

type DeleteArticleButtonProps = {
  articleId: string;
  articleTitle: string;
  /** When true, icon-only styling still shows “Delete” text per design S3. */
  className?: string;
};

/**
 * Delete control with native confirm — design §3.6.
 */
export function DeleteArticleButton({
  articleId,
  articleTitle,
  className = "",
}: DeleteArticleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    const ok = window.confirm(
      `Delete “${articleTitle}”? This cannot be undone.`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const result = await deleteArticle(articleId);
        if (result && result.ok === false) {
          setError(result.message);
        }
      } catch (err) {
        // redirect throws; ignore NEXT_REDIRECT
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error("[DeleteArticleButton] delete failed:", err);
        setError("Could not delete the article. Please try again.");
      }
    });
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="danger-ghost"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
      >
        <Trash2 className="size-4" aria-hidden />
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error ? (
        <p className="mt-1 text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

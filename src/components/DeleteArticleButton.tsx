"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Trash2Icon } from "@/components/ui/icons";

export type DeleteArticleButtonProps = {
  articleId: number;
  articleTitle: string;
};

/**
 * Ghost-danger "Delete" trigger + confirm dialog on the article detail page
 * (design §2.4): Cancel is default-focused; in flight the danger button shows
 * "Deleting…"; on error the dialog body swaps and the buttons re-enable.
 */
export function DeleteArticleButton({
  articleId,
  articleTitle,
}: DeleteArticleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Delete failed with ${response.status}`);
      }
      router.push("/");
      router.refresh();
      // Stay busy until navigation unmounts the dialog.
    } catch (error) {
      console.error("Failed to delete article:", error);
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost-danger"
        icon={<Trash2Icon />}
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete “${articleTitle}”?`}
        body={
          failed
            ? "Couldn’t delete. Try again."
            : "This permanently deletes the article. This can’t be undone."
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        danger
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

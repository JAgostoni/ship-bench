import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileQuestionIcon } from "@/components/ui/icons";

/** S6 — serves both missing article ids and unknown routes (design §5.3). */
export default function NotFound() {
  return (
    <EmptyState
      titleAs="h1"
      icon={<FileQuestionIcon size={32} />}
      title="Article not found"
      body="It may have been deleted, or the link is wrong."
      action={<Button href="/">Back to all articles</Button>}
    />
  );
}

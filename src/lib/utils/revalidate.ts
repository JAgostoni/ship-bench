import { revalidatePath } from "next/cache";

/**
 * Revalidate list, search, and article paths after CUD.
 * On slug change, pass both old and new slugs.
 */
export function revalidateArticlePaths(
  slug: string,
  previousSlug?: string | null,
): void {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/articles/${slug}`);
  revalidatePath(`/articles/${slug}/edit`);

  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/articles/${previousSlug}`);
    revalidatePath(`/articles/${previousSlug}/edit`);
  }
}

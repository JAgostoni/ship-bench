import { ArticleEditor } from "@/components/ArticleEditor";

export const metadata = { title: "New article — Team KB" };

/** S4 — create article (design §1.3): RSC shell around the client editor. */
export default function NewArticlePage() {
  return (
    <ArticleEditor
      mode="new"
      heading={<h1 className="text-xl font-semibold">New article</h1>}
    />
  );
}

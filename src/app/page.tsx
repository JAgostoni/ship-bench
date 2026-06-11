import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilePlus2Icon } from "@/components/ui/icons";
import { listArticles } from "@/lib/repo/articles";

// Content freshness beats caching for an internal KB (architecture §6.1).
export const dynamic = "force-dynamic";

export default function HomePage() {
  const articles = listArticles();
  const count = articles.length;

  return (
    <>
      <PageHeader
        title="Articles"
        rightSlot={
          <Badge>
            {count} article{count === 1 ? "" : "s"}
          </Badge>
        }
      />
      {count === 0 ? (
        <EmptyState
          icon={<FilePlus2Icon size={32} />}
          title="No articles yet"
          body="Create the first article and start your team’s knowledge base."
          action={
            <Button href="/articles/new">Create your first article</Button>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {articles.map((article) => (
            <li key={article.id}>
              <Card
                id={article.id}
                title={article.title}
                updatedAt={article.updatedAt}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

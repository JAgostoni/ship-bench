import { SearchPageContent } from '@/components/search/SearchPageContent';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';

  return <SearchPageContent query={query} />;
}

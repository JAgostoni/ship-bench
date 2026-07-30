import { useState, useEffect, ChangeEvent } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { searchArticles } from '@/lib/search';

interface SearchBoxProps {
  onResults: (articles: any[]) => void;
  onQueryChange?: (query: string) => void;
}

export default function SearchBox({ onResults }: SearchBoxProps) {
  const [input, setInput] = useState('');
  const debounced = useDebounce(input, 300);

  const { data, refetch } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchArticles(debounced),
    enabled: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (debounced) {
      refetch();
    } else {
      onResults([]);
    }
  }, [debounced, refetch, onResults]);

  useEffect(() => {
    if (data) {
      onResults(data);
    }
  }, [data, onResults]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (onQueryChange) onQueryChange(e.target.value);
  };

  return (
    <input
      type="text"
      placeholder="Search articles…"
      value={input}
      onChange={handleChange}
      className="border p-2 w-full rounded mb-4"
    />
  );
}

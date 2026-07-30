import { useState, useEffect, ChangeEvent } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';

interface SearchBoxProps {
  onResults: (articles: any[]) => void;
  onQueryChange?: (query: string) => void;
}

export default function SearchBox({ onResults, onQueryChange }: SearchBoxProps) {
  const [input, setInput] = useState('');
  const debounced = useDebounce(input, 300);

  // Use React Query to fetch from the search API endpoint
  const { data, refetch } = useQuery({
    queryKey: ['search', debounced],
    queryFn: async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(debounced)}`);
      const json = await res.json();
      return json.results;
    },
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
    const val = e.target.value;
    setInput(val);
    if (onQueryChange) onQueryChange(val);
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

"use client";
import { useEffect, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';

interface TagSelectProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelect({ selected, onChange }: TagSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function fetchTags() {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setOptions(data.map((t: any) => t.name));
    }
    fetchTags();
  }, []);

  const filtered = query === '' ? options : options.filter(t => t.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={selected} onChange={onChange} multiple>
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5"
          displayValue={(tags: string[]) => tags.join(', ')}
          onChange={e => setQuery(e.target.value)}
          placeholder="Select tags..."
        />
        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filtered.map(tag => (
            <Combobox.Option key={tag} value={tag} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-600 text-white' : 'text-gray-900'}`}>
              {({ selected, active }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : ''}`}>{tag}</span>
                  {selected ? (
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-indigo-600'}`}>
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
}

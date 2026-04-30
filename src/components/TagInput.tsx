import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;
const TAG_REGEX = /^[a-zA-Z0-9-]+$/;

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (raw: string) => {
      const name = raw.trim().toLowerCase();
      if (!name) return;

      if (tags.includes(name)) {
        setError(`Tag "${name}" already exists`);
        return;
      }
      if (tags.length >= MAX_TAGS) {
        setError(`Maximum ${MAX_TAGS} tags allowed`);
        return;
      }
      if (name.length > MAX_TAG_LENGTH) {
        setError(`Tags must be ${MAX_TAG_LENGTH} characters or fewer`);
        return;
      }
      if (!TAG_REGEX.test(name)) {
        setError('Tags may only contain letters, numbers, and hyphens');
        return;
      }

      setError(null);
      onChange([...tags, name]);
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.slice();
      next.splice(index, 1);
      setError(null);
      onChange(next);
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
        setInput('');
      }
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = () => {
    if (input.trim()) {
      addTag(input);
      setInput('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',') || text.includes('\n')) {
      e.preventDefault();
      const names = text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
      names.forEach((n) => addTag(n));
      setInput('');
    }
  };

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:ring-2 focus-within:ring-accent"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-700"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="ml-0.5 rounded hover:bg-slate-200 focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          aria-label="Add tag"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-text-tertiary">
        Press Enter or comma to add a tag. Max {MAX_TAGS} tags.
      </p>
    </div>
  );
}

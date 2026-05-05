'use client';

import { useRef, useEffect, forwardRef, type TextareaHTMLAttributes } from 'react';

interface MarkdownTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  autoExpand?: boolean;
  minRows?: number;
}

export const MarkdownTextarea = forwardRef<HTMLTextAreaElement, MarkdownTextareaProps>(
  ({ value, onChange, autoExpand = true, minRows = 12, className = '', ...rest }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose the ref to parent
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(textareaRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
      }
    }, [ref]);

    useEffect(() => {
      if (autoExpand && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [value, autoExpand]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;

        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange({
          ...e,
          target: { ...target, value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>);

        // Set cursor position after the inserted spaces
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
          if (autoExpand) {
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }
        });
      }
    };

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        rows={minRows}
        className={`font-mono text-[15px] leading-[1.8] ${className}`}
        aria-label="Article content"
        style={{ minHeight: '300px', resize: 'vertical' }}
        {...rest}
      />
    );
  }
);

MarkdownTextarea.displayName = 'MarkdownTextarea';

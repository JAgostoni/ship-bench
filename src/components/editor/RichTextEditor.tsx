"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { stripHtml } from "@/lib/utils/excerpt";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  error?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * TipTap WYSIWYG editor — design §6.8, architecture §7.3.
 * Client-only; load via dynamic import from form pages.
 */
export function RichTextEditor({
  content,
  onChange,
  error = false,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-article min-h-[280px] px-4 py-3 focus:outline-none",
        ...(id ? { id } : {}),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Article content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external content resets (e.g. form reset after conflict reload)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  const isEmpty = !content || stripHtml(content).length === 0;

  return (
    <div
      className={[
        "overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-bg-elevated)]",
        "focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]/30",
        error
          ? "border-[var(--color-danger)] focus-within:ring-[var(--color-danger)]/20"
          : "border-[var(--color-border)] focus-within:border-[var(--color-accent)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <EditorToolbar editor={editor} />
      <div className="relative">
        {isEmpty && !editor?.isFocused ? (
          <p
            className="pointer-events-none absolute left-4 top-3 text-sm text-[var(--color-text-muted)]"
            aria-hidden
          >
            Start writing…
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;

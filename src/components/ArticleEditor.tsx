"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { z } from "zod";
import { ArticleBody } from "@/components/ArticleBody";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { AlertCircleIcon } from "@/components/ui/icons";
import type { ApiError } from "@/lib/api/http";
import { cx } from "@/lib/cx";
import { articleInput } from "@/lib/validation/article";
import { FOCUS_H1_FLAG } from "@/components/FocusHeading";
import type { Article } from "@/lib/db/schema";

const PREVIEW_DEBOUNCE_MS = 150;
const TITLE_MAX = 200;
const TITLE_COUNTER_AT = 180;
const CONTENT_MAX = 100_000;
const CONTENT_COUNTER_AT = 90_000;

type Field = "title" | "content";
type FieldErrors = { title?: string; content?: string };

export type ArticleEditorProps = {
  /** The page h1, rendered by the RSC shell into the sticky heading row. */
  heading: ReactNode;
} & (
  | { mode: "new" }
  | { mode: "edit"; article: Pick<Article, "id" | "title" | "content"> }
);

/**
 * Markdown editor with live preview (design §2.3, normative): split pane at
 * ≥1024px, Write/Preview tabs below; blur/submit validation from the shared
 * Zod schema; debounced preview through the shared ArticleBody (preview
 * parity); dirty guards (beforeunload + discard dialog); POST/PUT save flow
 * with server 400 mapping and a network-error banner.
 */
export function ArticleEditor(props: ArticleEditorProps) {
  const router = useRouter();
  const baseId = useId();
  const contentId = "article-content";
  const contentErrorId = `${contentId}-error`;
  const writeTabId = `${baseId}-tab-write`;
  const previewTabId = `${baseId}-tab-preview`;
  const writePanelId = `${baseId}-panel-write`;
  const previewPanelId = `${baseId}-panel-preview`;

  const initial =
    props.mode === "edit"
      ? { title: props.article.title, content: props.article.content }
      : { title: "", content: "" };
  const cancelHref =
    props.mode === "edit" ? `/articles/${props.article.id}` : "/";

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [previewContent, setPreviewContent] = useState(initial.content);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const writeTabRef = useRef<HTMLButtonElement>(null);
  const previewTabRef = useRef<HTMLButtonElement>(null);
  // Fields that have shown an error re-validate on every change so the error
  // clears the moment it's fixed (§2.3); pristine fields never validate on
  // keystroke.
  const erroredRef = useRef<Set<Field>>(new Set());

  const dirty = title !== initial.title || content !== initial.content;

  // Preview re-render debounced 150 ms after the last keystroke (§2.3).
  useEffect(() => {
    const timer = setTimeout(
      () => setPreviewContent(content),
      PREVIEW_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [content]);

  // Textarea auto-grows with content — no inner scrollbar on desktop, the
  // page scrolls (§2.3). Re-measured on tab switch: a CSS-hidden textarea
  // measures 0 (min-height floors it) and needs a fresh pass when shown.
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [content, activeTab]);

  // Unsaved-changes guard, registered only while dirty (§2.3). In-app
  // navigation is covered by the Cancel dialog only — no over-guarding.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Required by Chrome for the prompt to appear.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // The error banner is focused when shown (design §4.6).
  useEffect(() => {
    if (bannerVisible) {
      bannerRef.current?.focus();
    }
  }, [bannerVisible]);

  function validateField(field: Field, value: string): string | undefined {
    const result = articleInput.shape[field].safeParse(value);
    return result.success ? undefined : result.error.issues[0]?.message;
  }

  function onFieldBlur(field: Field, value: string) {
    const message = validateField(field, value);
    if (message) {
      erroredRef.current.add(field);
    }
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function onFieldChange(field: Field, value: string) {
    (field === "title" ? setTitle : setContent)(value);
    if (erroredRef.current.has(field)) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  }

  /** Show field errors (client or server 400) and focus the first invalid field (§7.5). */
  function applyFieldErrors(fieldErrors: FieldErrors) {
    for (const field of ["title", "content"] as const) {
      if (fieldErrors[field]) {
        erroredRef.current.add(field);
      }
    }
    setErrors(fieldErrors);
    const focusContent = !fieldErrors.title && Boolean(fieldErrors.content);
    if (focusContent) {
      // The textarea may be CSS-hidden behind the Preview tab; it must be
      // visible before it can take focus.
      setActiveTab("write");
    }
    // Deferred so it lands after React commits the state updates above.
    setTimeout(() => {
      if (fieldErrors.title) {
        titleRef.current?.focus();
      } else if (focusContent) {
        textareaRef.current?.focus();
      }
    }, 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    const parsed = articleInput.safeParse({ title, content });
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      applyFieldErrors({
        title: fieldErrors.title?.[0],
        content: fieldErrors.content?.[0],
      });
      return;
    }

    setBannerVisible(false);
    setSaving(true);
    try {
      const response = await fetch(
        props.mode === "edit"
          ? `/api/articles/${props.article.id}`
          : "/api/articles",
        {
          method: props.mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );

      if (response.ok) {
        const { article } = (await response.json()) as {
          article: { id: number };
        };
        // Post-save the detail page h1 gets focus (§7.5) — both announced
        // and visually anchored.
        try {
          sessionStorage.setItem(FOCUS_H1_FLAG, "1");
        } catch {
          // Storage may be unavailable (privacy modes); focus is best-effort.
        }
        router.push(`/articles/${article.id}`);
        router.refresh();
        // Stay in the loading state until navigation unmounts the editor.
        return;
      }

      if (response.status === 400) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiError | null;
        const fieldErrors = body?.error?.fieldErrors;
        if (fieldErrors && (fieldErrors.title || fieldErrors.content)) {
          // Server 400 maps onto fields exactly like client errors (§2.3).
          applyFieldErrors({
            title: fieldErrors.title?.[0],
            content: fieldErrors.content?.[0],
          });
          setSaving(false);
          return;
        }
      }
      setBannerVisible(true);
      setSaving(false);
    } catch {
      // Network failure / server unreachable — inputs stay intact (§4.6).
      setBannerVisible(true);
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty) {
      setDiscardOpen(true);
    } else {
      router.push(cancelHref);
    }
  }

  function onTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd+Enter submits from the textarea; plain Enter inserts newlines (§7.3).
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function onTablistKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    let next: "write" | "preview" | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = activeTab === "write" ? "preview" : "write";
    } else if (event.key === "Home") {
      next = "write";
    } else if (event.key === "End") {
      next = "preview";
    }
    if (next !== null) {
      // Arrow keys move and activate (§7.3).
      event.preventDefault();
      setActiveTab(next);
      (next === "write" ? writeTabRef : previewTabRef).current?.focus();
    }
  }

  const actions = (
    <>
      <Button variant="secondary" onClick={handleCancel} disabled={saving}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        loading={saving}
        loadingLabel="Saving…"
      >
        Save article
      </Button>
    </>
  );

  const showTitleCounter = title.length >= TITLE_COUNTER_AT;
  const showContentCounter = content.length >= CONTENT_COUNTER_AT;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* Heading row — actions top-right, sticky with the heading ≥1024px
          (§3.2); the negative margin closes the gap over main's padding. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-bg pb-4 lg:sticky lg:top-14 lg:z-10 lg:-mt-6 lg:pt-6">
        {props.heading}
        <div className="hidden gap-2 lg:flex">{actions}</div>
      </div>

      {bannerVisible && (
        <div
          ref={bannerRef}
          role="alert"
          tabIndex={-1}
          className="mb-4 flex items-center gap-2 rounded-sm border border-danger bg-danger-bg p-3 text-base text-danger-text"
        >
          <AlertCircleIcon />
          Couldn’t save. Your text is still here — try again.
        </div>
      )}

      <Input
        ref={titleRef}
        id="article-title"
        label="Title"
        value={title}
        error={errors.title}
        onChange={(event) => onFieldChange("title", event.target.value)}
        onBlur={(event) => onFieldBlur("title", event.target.value)}
      />
      {showTitleCounter && (
        <p
          className={cx(
            "mt-1 text-right text-xs",
            title.length > TITLE_MAX ? "text-danger-text" : "text-text-muted",
          )}
        >
          {title.length.toLocaleString("en-US")}/{TITLE_MAX}
        </p>
      )}

      {/* Write/Preview tabs below 1024px (§2.3); the panes replace them at lg. */}
      <div
        role="tablist"
        aria-label="Editor view"
        className="mt-6 flex gap-4 border-b border-border lg:hidden"
        onKeyDown={onTablistKeyDown}
      >
        <button
          ref={writeTabRef}
          type="button"
          role="tab"
          id={writeTabId}
          aria-selected={activeTab === "write"}
          aria-controls={writePanelId}
          tabIndex={activeTab === "write" ? 0 : -1}
          onClick={() => setActiveTab("write")}
          className={cx(
            "-mb-px flex h-11 cursor-pointer items-center border-b-2 px-3 text-base font-medium",
            activeTab === "write"
              ? "border-accent text-text"
              : "border-transparent text-text-secondary",
          )}
        >
          Write
        </button>
        <button
          ref={previewTabRef}
          type="button"
          role="tab"
          id={previewTabId}
          aria-selected={activeTab === "preview"}
          aria-controls={previewPanelId}
          tabIndex={activeTab === "preview" ? 0 : -1}
          onClick={() => setActiveTab("preview")}
          className={cx(
            "-mb-px flex h-11 cursor-pointer items-center border-b-2 px-3 text-base font-medium",
            activeTab === "preview"
              ? "border-accent text-text"
              : "border-transparent text-text-secondary",
          )}
        >
          Preview
        </button>
      </div>

      {/* Split pane 1fr/1fr gap 24px at ≥1024px (§2.3); single tabbed panel
          below. The textarea stays mounted across tab switches — content,
          scroll, and cursor survive (CSS hide only). */}
      <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-6">
        <div
          id={writePanelId}
          role="tabpanel"
          aria-labelledby={writeTabId}
          className={cx(activeTab !== "write" && "max-lg:hidden")}
        >
          <label
            htmlFor={contentId}
            className="mb-1.5 block text-sm text-text-muted max-lg:sr-only"
          >
            Content
          </label>
          <textarea
            ref={textareaRef}
            id={contentId}
            value={content}
            spellCheck
            aria-invalid={errors.content ? true : undefined}
            aria-describedby={errors.content ? contentErrorId : undefined}
            onChange={(event) => onFieldChange("content", event.target.value)}
            onBlur={(event) => onFieldBlur("content", event.target.value)}
            onKeyDown={onTextareaKeyDown}
            className={cx(
              // 14px mono at 1.6 (§2.3); bumps to 16px below md to prevent
              // iOS zoom-on-focus (§3.3).
              "min-h-90 w-full resize-none overflow-hidden rounded-sm border bg-surface p-3 font-mono text-base leading-[1.6] max-md:text-md",
              errors.content
                ? "border-danger"
                : "border-border-strong hover:border-text-secondary",
            )}
          />
          {errors.content && (
            <p
              id={contentErrorId}
              className="mt-1.5 flex items-center gap-1 text-sm text-danger-text"
            >
              <AlertCircleIcon size={14} />
              {errors.content}
            </p>
          )}
        </div>

        <div
          id={previewPanelId}
          role="tabpanel"
          aria-labelledby={previewTabId}
          className={cx(activeTab !== "preview" && "max-lg:hidden")}
        >
          <div
            aria-hidden="true"
            className="mb-1.5 text-sm text-text-muted max-lg:sr-only"
          >
            Preview
          </div>
          <div className="editor-preview min-h-90 rounded-sm border border-border p-3">
            {previewContent.trim() === "" ? (
              <p className="flex min-h-90 items-center justify-center text-base text-text-muted">
                Nothing to preview yet.
              </p>
            ) : (
              <ArticleBody content={previewContent} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-sm text-text-muted">
          Markdown supported — headings, lists, tables, code, links.
        </p>
        {showContentCounter && (
          <p
            className={cx(
              "text-xs",
              content.length > CONTENT_MAX
                ? "text-danger-text"
                : "text-text-muted",
            )}
          >
            {content.length.toLocaleString("en-US")}/
            {CONTENT_MAX.toLocaleString("en-US")}
          </p>
        )}
      </div>

      {/* Below 1024px the actions move under the content: Save right-aligned
          on tablet, full-width stacked with Save on top below 768px (§3.2). */}
      <div className="mt-6 flex flex-col gap-2 md:flex-row-reverse md:justify-between lg:hidden [&>*]:max-md:w-full">
        <Button
          type="submit"
          variant="primary"
          loading={saving}
          loadingLabel="Saving…"
        >
          Save article
        </Button>
        <Button variant="secondary" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
      </div>

      <ConfirmDialog
        open={discardOpen}
        title="Discard changes?"
        body="Your edits haven’t been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => router.push(cancelHref)}
      />
    </form>
  );
}

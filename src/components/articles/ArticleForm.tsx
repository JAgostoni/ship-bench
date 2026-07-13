"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  createArticle,
  deleteArticle,
  updateArticle,
  type ActionResult,
} from "@/lib/actions/articles";
import { slugify } from "@/lib/utils/slugify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const RichTextEditor = dynamic(
  () =>
    import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text-muted)]"
        aria-busy="true"
      >
        Loading editor…
      </div>
    ),
  },
);

export type ArticleFormCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export type ArticleFormTagOption = {
  id: string;
  name: string;
  slug: string;
};

export type ArticleFormInitialValues = {
  id?: string;
  title: string;
  slug: string;
  contentHtml: string;
  status: "DRAFT" | "PUBLISHED";
  categoryId: string | null;
  tagIds: string[];
  expectedUpdatedAt?: string;
};

type ArticleFormProps = {
  mode: "create" | "edit";
  initialValues: ArticleFormInitialValues;
  categories: ArticleFormCategoryOption[];
  tags: ArticleFormTagOption[];
};

type FieldErrors = Record<string, string[]>;

function firstError(fieldErrors: FieldErrors, field: string): string | undefined {
  return fieldErrors[field]?.[0];
}

/**
 * Shared create/edit form — design S4/S5.
 */
export function ArticleForm({
  mode,
  initialValues,
  categories,
  tags,
}: ArticleFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initialValues.status,
  );
  const [categoryId, setCategoryId] = useState(initialValues.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initialValues.tagIds);
  const [contentHtml, setContentHtml] = useState(initialValues.contentHtml);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugTouched && mode === "create") {
        setSlug(slugify(value));
      }
    },
    [mode, slugTouched],
  );

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const scrollToFirstError = (errors: FieldErrors) => {
    const order = [
      "title",
      "slug",
      "status",
      "categoryId",
      "tagIds",
      "contentHtml",
    ];
    for (const key of order) {
      if (errors[key]?.length) {
        const el = document.getElementById(`field-${key}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = el?.querySelector<HTMLElement>(
          "input, select, textarea, [contenteditable='true'], button",
        );
        focusable?.focus();
        return;
      }
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsConflict(false);
    setFieldErrors({});

    const formData = new FormData();
    if (mode === "edit" && initialValues.id) {
      formData.set("id", initialValues.id);
    }
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("contentHtml", contentHtml);
    formData.set("status", status);
    formData.set("categoryId", categoryId);
    for (const id of tagIds) {
      formData.append("tagIds", id);
    }
    if (mode === "edit" && initialValues.expectedUpdatedAt) {
      formData.set("expectedUpdatedAt", initialValues.expectedUpdatedAt);
    }

    startTransition(async () => {
      try {
        const action = mode === "create" ? createArticle : updateArticle;
        const result: ActionResult<{ slug: string }> | void =
          await action(formData);

        // Successful redirects never return; if we get a result it's an error
        if (result && result.ok === false) {
          if (result.code === "CONFLICT") {
            setIsConflict(true);
            setFormError(result.message);
            return;
          }
          setFormError(result.message);
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
            // Defer scroll so error nodes exist
            queueMicrotask(() => scrollToFirstError(result.fieldErrors!));
          }
        }
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error("[ArticleForm] submit failed:", err);
        setFormError("Something went wrong. Please try again.");
      }
    });
  };

  const handleDelete = () => {
    if (!initialValues.id) return;
    const ok = window.confirm(
      `Delete “${title || initialValues.title}”? This cannot be undone.`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const result = await deleteArticle(initialValues.id!);
        if (result && result.ok === false) {
          setFormError(result.message);
        }
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        console.error("[ArticleForm] delete failed:", err);
        setFormError("Could not delete the article. Please try again.");
      }
    });
  };

  const cancelHref =
    mode === "create"
      ? "/"
      : `/articles/${initialValues.slug || slug}`;

  const editReloadHref = `/articles/${initialValues.slug || slug}/edit`;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl space-y-6"
      noValidate
    >
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
        {mode === "create" ? "Create article" : "Edit article"}
      </h1>

      {formError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-muted)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          <p>{formError}</p>
          {isConflict ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                window.location.href = editReloadHref;
              }}
            >
              Reload
            </Button>
          ) : null}
        </div>
      ) : null}

      <div id="field-title">
        <Label htmlFor="title" required>
          Title
        </Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          error={Boolean(firstError(fieldErrors, "title"))}
          aria-required
          aria-describedby={
            firstError(fieldErrors, "title") ? "title-error" : undefined
          }
          autoComplete="off"
        />
        {firstError(fieldErrors, "title") ? (
          <p id="title-error" className="mt-1 text-sm text-[var(--color-danger)]">
            {firstError(fieldErrors, "title")}
          </p>
        ) : null}
      </div>

      <div id="field-slug">
        <Label htmlFor="slug" required>
          Slug
        </Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          onBlur={() => setSlugTouched(true)}
          error={Boolean(firstError(fieldErrors, "slug"))}
          aria-required
          aria-describedby="slug-help"
          autoComplete="off"
          spellCheck={false}
        />
        <p
          id="slug-help"
          className="mt-1 text-sm text-[var(--color-text-muted)]"
        >
          URL: /articles/{slug || "…"}
        </p>
        {firstError(fieldErrors, "slug") ? (
          <p className="mt-1 text-sm text-[var(--color-danger)]">
            {firstError(fieldErrors, "slug")}
          </p>
        ) : null}
      </div>

      <fieldset id="field-status" className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-[var(--color-text)]">
          Status <span className="text-[var(--color-danger)]" aria-hidden>*</span>
        </legend>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="radio"
              name="status"
              value="DRAFT"
              checked={status === "DRAFT"}
              onChange={() => setStatus("DRAFT")}
              className="size-4 accent-[var(--color-accent)]"
            />
            Draft
          </label>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="radio"
              name="status"
              value="PUBLISHED"
              checked={status === "PUBLISHED"}
              onChange={() => setStatus("PUBLISHED")}
              className="size-4 accent-[var(--color-accent)]"
            />
            Published
          </label>
        </div>
        {firstError(fieldErrors, "status") ? (
          <p className="text-sm text-[var(--color-danger)]">
            {firstError(fieldErrors, "status")}
          </p>
        ) : null}
      </fieldset>

      <div id="field-categoryId">
        <Label htmlFor="categoryId">Category</Label>
        <Select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          error={Boolean(firstError(fieldErrors, "categoryId"))}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {firstError(fieldErrors, "categoryId") ? (
          <p className="mt-1 text-sm text-[var(--color-danger)]">
            {firstError(fieldErrors, "categoryId")}
          </p>
        ) : null}
      </div>

      <div id="field-tagIds">
        <span
          id="tags-label"
          className="mb-1 block text-sm font-medium text-[var(--color-text)]"
        >
          Tags
        </span>
        {tags.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No tags available. Tags will appear when configured.
          </p>
        ) : (
          <div
            role="group"
            aria-labelledby="tags-label"
            className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3"
          >
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]"
              >
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  checked={tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                {tag.name}
              </label>
            ))}
          </div>
        )}
        {firstError(fieldErrors, "tagIds") ? (
          <p className="mt-1 text-sm text-[var(--color-danger)]">
            {firstError(fieldErrors, "tagIds")}
          </p>
        ) : null}
      </div>

      <div id="field-contentHtml">
        <Label htmlFor="content-editor" required>
          Content
        </Label>
        <RichTextEditor
          id="content-editor"
          content={contentHtml}
          onChange={setContentHtml}
          error={Boolean(firstError(fieldErrors, "contentHtml"))}
          aria-invalid={Boolean(firstError(fieldErrors, "contentHtml"))}
          aria-describedby={
            firstError(fieldErrors, "contentHtml")
              ? "content-error"
              : undefined
          }
        />
        {firstError(fieldErrors, "contentHtml") ? (
          <p
            id="content-error"
            className="mt-1 text-sm text-[var(--color-danger)]"
          >
            {firstError(fieldErrors, "contentHtml")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending
            ? "Saving…"
            : mode === "create"
              ? "Save article"
              : "Save changes"}
        </Button>
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Cancel
        </Link>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="danger-ghost"
            className="ml-auto"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

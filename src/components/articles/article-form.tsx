'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ClipboardCopy, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { createArticle, updateArticle } from '@/app/actions/articles';
import { useEditorBridge } from '@/components/layout/editor-bridge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/slug';
import { articleFormSchema } from '@/lib/validation/article';
import type { ActionState, ArticleDetail, CategoryRef } from '@/types/domain';

/**
 * The article create/edit form (design-spec.md §3.5, `architecture.md` §6.4).
 *
 * **How the submit works, and why it is not `action={formAction}` alone.**
 * `architecture.md` §6.4's snippet puts React's `formAction` on the `<form>` so the
 * browser can still POST natively when JavaScript never loads, and RHF's resolver on
 * `onSubmit` so the client gets instant feedback from the *same* Zod schema the
 * Server Action re-parses. Both are kept here:
 *
 * - `action={formAction}` is on the `<form>`, which is what makes the no-JS path a
 *   real form POST.
 * - `onSubmit` runs RHF. While the client is invalid, RHF's `preventDefault()` stops
 *   the request, so a payload the client already knows is bad never reaches the
 *   network. When the client is valid, a `FormData` is built from the resolved values
 *   plus the server-owned hidden fields and handed to `formAction`.
 *
 * Building the `FormData` explicitly (rather than letting the browser serialize the
 * DOM) is what guarantees that a valid client submit and the Server Action agree on
 * the payload: the values are exactly the schema's *output* — trimmed, `''` summary
 * normalized to absent — instead of the raw input strings the browser would send.
 *
 * **Why the editor is `ssr: false`.** `@uiw/react-md-editor` carries ~120 KB and §9.3
 * requires it to stay out of the browse route's first-load JS. The dynamic import
 * lives *here*, in a Client Component, because `ssr: false` is rejected in a Server
 * Component (Next.js 16 `next/dynamic` docs).
 *
 * **Validation timing (E12).** `mode: 'onBlur'` means an error never appears while a
 * field is being typed for the first time; `reValidateMode: 'onChange'` means a field
 * that *has* errored re-checks on every keystroke, so the message clears as soon as
 * the input becomes valid rather than at the next blur.
 */

const MarkdownEditor = dynamic(() => import('./markdown-editor'), {
  ssr: false,
  /**
   * §7.5's "Editor bundle" state: a 520px skeleton with a centered `Loading editor…`
   * label — never a bare spinner, and never a layout shift when the real editor
   * arrives.
   */
  loading: () => (
    <div className="relative h-[520px]" role="status" aria-label="Loading editor…">
      <Skeleton className="h-full w-full" />
      <p className="text-ink-subtle absolute inset-0 flex items-center justify-center text-[13px]">
        Loading editor…
      </p>
    </div>
  ),
});

/** The body's warning threshold and hard limit, per §3.5's "Body over limit" row. */
const BODY_WARN_AT = 190_000;
const BODY_MAX = 200_000;

/** The schema's output plus the one edit-only field. */
type ArticleFormValues = {
  title: string;
  summary?: string;
  bodyMd: string;
  categoryId: number | null;
  status: 'draft' | 'published';
  changeNote?: string;
};

export type ArticleFormProps = {
  mode: 'create' | 'edit';
  categories: CategoryRef[];
  /** Present on the edit route only. */
  article?: ArticleDetail;
  /** Pre-selected category, from `?category={slug}`. */
  initialCategoryId?: number | null;
  /**
   * The `<form>`'s id. The focused shell's header `Save` submits by this id, so it
   * takes the same path through RHF and the action rather than a second
   * implementation. Defaulted so a standalone mount (a component test) needs no prop.
   */
  formId?: string;
};

/**
 * The status pill (E7, E8). It is a `role="status"` live region, so the state change
 * is announced rather than only being visible.
 *
 * Precedence matters: an in-flight or failed save outranks the dirty flag, otherwise
 * the pill would read "Unsaved changes" the entire time a save is failing.
 */
function StatusPill({ state, isDirty }: { state: 'saving' | 'failed' | 'idle'; isDirty: boolean }) {
  if (state === 'saving') {
    return (
      <span className="text-ink-muted inline-flex items-center gap-1.5 text-[13px]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }

  if (state === 'failed') {
    return <span className="text-danger-ink text-[13px] font-medium">Save failed</span>;
  }

  if (isDirty) {
    return (
      <span className="bg-warning-soft text-warning rounded-pill inline-flex items-center gap-1.5 px-2 py-0.5 text-[13px] font-medium">
        <span aria-hidden="true" className="bg-warning h-1.5 w-1.5 rounded-full" />
        Unsaved changes
      </span>
    );
  }

  return <span className="text-ink-subtle text-[13px]">Saved</span>;
}

export function ArticleForm({
  mode,
  categories,
  article,
  initialCategoryId,
  formId = 'article-form',
}: ArticleFormProps) {
  const router = useRouter();
  const action = mode === 'create' ? createArticle : updateArticle;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {
    status: 'idle',
  });

  const defaultValues = useMemo<ArticleFormValues>(
    () => ({
      title: article?.title ?? '',
      summary: article?.summary ?? '',
      bodyMd: article?.bodyMd ?? '',
      categoryId: article ? (article.category?.id ?? null) : (initialCategoryId ?? null),
      status: article?.status === 'published' ? 'published' : 'draft',
      changeNote: '',
    }),
    [article, initialCategoryId],
  );

  const form = useForm<ArticleFormValues>({
    /**
     * `articleFormSchema`, not `articleCreateSchema`.
     *
     * `zodResolver` replaces the submitted values with the schema's **output**, so a field
     * the schema does not declare is dropped before the form sees it. The create schema
     * has no `changeNote`, so running it on the edit route would silently discard the note
     * the author typed and write a revision with a `null` one. `articleFormSchema` is the
     * create schema plus that field, and deliberately without `version` — which is the
     * concurrency token, not something a user edits.
     */
    resolver: zodResolver(articleFormSchema) as unknown as Resolver<ArticleFormValues>,
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isDirty },
  } = form;

  /**
   * `useWatch` rather than `watch`.
   *
   * `watch` returns a subscribed value but is not a hook the React Compiler can analyze —
   * the lint config flags it as an incompatible library and skips compiling the whole
   * file, which would silently disable memoization for this component. `useWatch` is the
   * supported hook form and yields the same values.
   */
  const title = useWatch({ control, name: 'title' });
  const summary = useWatch({ control, name: 'summary' });
  const bodyMd = useWatch({ control, name: 'bodyMd' });
  const status = useWatch({ control, name: 'status' });
  const categoryId = useWatch({ control, name: 'categoryId' });

  /**
   * The displayed slug, **derived during render** rather than stored by an effect.
   *
   * - On the edit route it is the stored slug and never follows the title — §9.3's "slug
   *   stability": renaming an article must not break links people already have.
   * - On the create route it tracks the title until the author explicitly regenerates it
   *   (E2), after which `pinned` takes over.
   *
   * `pinned` is a one-way latch, so a derive-during-render is exact: there is no state to
   * synchronise, and no cascading render to cause.
   */
  const [slugPinned, setSlugPinned] = useState<string | null>(article?.slug ?? null);
  const slug = slugPinned ?? slugify(title ?? '');

  const [slugDialogOpen, setSlugDialogOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'write' | 'preview'>('write');
  const [copied, setCopied] = useState(false);
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const intentRef = useRef<'save' | 'another'>('save');

  const conflict = state.status === 'error' && state.conflict === true;
  const formError = state.status === 'error' && !conflict ? state.message : null;

  /**
   * Server field errors are pushed into RHF so `Field` renders them exactly as it
   * renders a client-side failure — `architecture.md` §10.5's *"same field errors,
   * returned from the Server Action"* — and focus moves to the first invalid control.
   */
  useEffect(() => {
    if (state.status !== 'error' || !state.fieldErrors) return;

    const entries = Object.entries(state.fieldErrors);
    for (const [field, messages] of entries) {
      if (messages.length > 0 && field in defaultValues) {
        setError(field as keyof ArticleFormValues, { type: 'server', message: messages[0] });
      }
    }

    const first = entries[0]?.[0];
    if (first === 'title') titleRef.current?.focus();
    else if (first === 'bodyMd') bodyRef.current?.focus();
    else if (first) document.getElementById(first)?.focus();
  }, [state, setError, defaultValues]);

  const bodyLength = bodyMd?.length ?? 0;
  const bodyTooLarge = bodyLength >= BODY_MAX;
  const bodyError = errors.bodyMd?.message;

  const pillState: 'saving' | 'failed' | 'idle' = isPending
    ? 'saving'
    : state.status === 'error' && !conflict
      ? 'failed'
      : 'idle';

  const bridge = useEditorBridge();

  /**
   * Reports the derived status up to the focused shell, whose sticky header owns the
   * pill (design-spec.md §3.5). Reporting rather than lifting the form keeps a single
   * copy of the field state.
   */
  const report = bridge?.report;
  useEffect(() => {
    if (!report) return;
    if (pillState === 'saving') report('saving');
    else if (pillState === 'failed') report('failed');
    else if (isDirty) report('dirty');
    else report('saved');
  }, [report, pillState, isDirty]);

  /** E6's `beforeunload` guard. `preventDefault()` is what most browsers require. */
  useEffect(() => {
    if (!isDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  /**
   * Builds the payload the Server Action re-parses.
   *
   * `categoryId` is omitted rather than sent empty when it is `null`: the schema's
   * `.default(null)` applies to an *absent* key, while `''` would coerce to `0` and
   * fail `positive()`. The same reasoning is why `summary` is dropped when blank —
   * the schema normalizes `''` to absent itself, but leaving it out keeps a valid
   * client submit byte-identical to the no-JS one.
   */
  const submit = useCallback(
    (values: ArticleFormValues) => {
      const formData = new FormData();
      formData.set('title', values.title ?? '');
      if (values.summary) formData.set('summary', values.summary);
      formData.set('bodyMd', values.bodyMd ?? '');
      if (values.categoryId !== null && values.categoryId !== undefined) {
        formData.set('categoryId', String(values.categoryId));
      }
      formData.set('status', values.status ?? 'draft');

      if (mode === 'edit' && article) {
        formData.set('id', String(article.id));
        formData.set('version', String(article.version));
        // The action needs the pre-save status to tell a publish apart from a
        // re-save, so it can pick `Article published.` over `Article saved.` (§7.6).
        formData.set('previousStatus', article.status);
      }

      if (values.changeNote) formData.set('changeNote', values.changeNote);
      formData.set('intent', intentRef.current);

      void formAction(formData);
    },
    [formAction, mode, article],
  );

  /**
   * RHF runs first and `preventDefault()`s on its own, which cancels React's `action`
   * for this submit. A valid client submit therefore calls `formAction` from `submit`
   * above; an invalid one never reaches the network. When JavaScript is absent there
   * is no `onSubmit` at all, and `action={formAction}` on the `<form>` performs the
   * native POST.
   */
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (bodyTooLarge) {
        event.preventDefault();
        return;
      }
      void handleSubmit(submit)(event);
    },
    [handleSubmit, submit, bodyTooLarge],
  );

  /** Cancel and the breadcrumb both route through the dirty guard (E6). */
  const requestNavigation = useCallback(
    (href: string) => {
      if (isDirty) {
        setPendingHref(href);
        setDiscardOpen(true);
        return;
      }
      router.push(href);
    },
    [isDirty, router],
  );

  /**
   * Registers the dirty-guarded cancel with the shell so the header's `← Cancel` takes
   * the same path as the form's own Cancel button. Without this the header would need
   * its own copy of the dirty flag and could discard work silently.
   */
  const registerCancel = bridge?.registerCancel;
  const cancelDestination = mode === 'create' ? '/' : `/articles/${article?.slug}`;
  useEffect(() => {
    if (!registerCancel) return;
    registerCancel(() => requestNavigation(cancelDestination));
  }, [registerCancel, requestNavigation, cancelDestination]);

  function regenerateSlug() {
    setSlugPinned(slugify(title ?? ''));
    setSlugDialogOpen(false);
  }

  async function copyMyText() {
    const text = [title, summary, bodyMd].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be denied by permissions policy. The text is still on
      // screen and the banner stays up, so the escape hatch is intact.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const saveLabel = isPending ? 'Saving…' : mode === 'create' ? 'Save article' : 'Save changes';
  const pending = isPending;

  const bodyHint = bodyTooLarge
    ? 'Article body is too large (200,000 character limit).'
    : 'Markdown supported — the preview updates as you type.';

  return (
    <form
      id={formId}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending || undefined}
      className="flex flex-col gap-6"
    >
      {conflict ? (
        <ConflictBanner
          onCopy={copyMyText}
          copied={copied}
          onReloadRequest={() => setReloadConfirmOpen(true)}
        />
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="rounded-card border-danger/40 bg-danger-soft flex items-start gap-3 border p-4"
        >
          <AlertTriangle className="text-danger-ink mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-ink text-[14px]">{formError}</p>
            {/*
              This is the server/network case: the payload may have been fine, so the
              recovery affordance is a retry with the same content (§7.4). It posts
              through the same path, which is why it is a submit button rather than a
              link.
            */}
            <Button type="submit" variant="secondary" size="sm" className="mt-3" disabled={pending}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      <Field label="Title" htmlFor="title" error={errors.title?.message} required>
        <Input
          id="title"
          autoComplete="off"
          // E1: the title is deliberately larger than a normal input.
          className="h-11 text-[17px] font-semibold"
          {...(register('title') as { name: 'title' })}
        />
      </Field>

      {/* E2: the slug is read-only text, never an input. */}
      <div className="-mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-ink-subtle">Slug: {slug || '—'}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSlugDialogOpen(true)}
          disabled={!title}
        >
          Regenerate from title
        </Button>
      </div>

      <div className="grid gap-1.5">
        <Field label="Summary" htmlFor="summary" error={errors.summary?.message}>
          {/*
            Deliberately **no `maxLength`**. A hard cap would make the 300-character
            rule unreachable — a paste of 301 characters would be silently truncated to
            300 and the message `Summary must be 300 characters or fewer.` could never
            appear, which `architecture.md` §11.3 requires it to. The counter below plus
            schema validation is the enforcement, so the user sees why the field is
            rejected instead of having their text quietly clipped.
          */}
          <Textarea id="summary" rows={3} {...register('summary')} />
        </Field>
        <p className="text-ink-subtle text-right text-[12px] tabular-nums">
          {(summary ?? '').length} / 300
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-1.5">
          <span className="text-ink text-[13px] leading-[1.4] font-medium">Category</span>
          <Select
            value={categoryId === null || categoryId === undefined ? 'none' : String(categoryId)}
            onValueChange={(value) =>
              setValue('categoryId', value === 'none' ? null : Number(value), { shouldDirty: true })
            }
          >
            <SelectTrigger aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <span className="text-ink text-[13px] leading-[1.4] font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue('status', value as ArticleFormValues['status'], { shouldDirty: true })
            }
          >
            <SelectTrigger aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            {/* `Archived` is never offered in the editor — it is an action, not a state
                you type (design-spec.md §4.5). */}
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-ink text-[13px] leading-[1.4] font-medium">
            Body
            <span aria-hidden="true" className="text-danger-ink ml-0.5">
              *
            </span>
          </span>

          {/*
            §3.5's <768px rule: one pane behind a `[Write | Preview]` segmented
            control. `md:hidden` because above that the panes sit side by side.
          */}
          <div
            role="group"
            aria-label="Editor pane"
            className="border-border rounded-control flex gap-0 border p-0.5 md:hidden"
          >
            {(['write', 'preview'] as const).map((pane) => (
              <button
                key={pane}
                type="button"
                aria-pressed={mobilePane === pane}
                onClick={() => setMobilePane(pane)}
                className={
                  mobilePane === pane
                    ? 'rounded-control bg-surface-sunken text-ink px-3 py-1 text-[13px] font-medium'
                    : 'rounded-control text-ink-muted px-3 py-1 text-[13px]'
                }
              >
                {pane === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>
        </div>

        <div className={mobilePane === 'write' ? undefined : 'hidden md:block'}>
          <MarkdownEditor
            value={bodyMd ?? ''}
            onChange={(next) =>
              setValue('bodyMd', next, { shouldDirty: true, shouldValidate: true })
            }
            submitButtonId="article-save"
            describedBy="bodyMd-hint"
            invalid={Boolean(bodyError)}
          />
        </div>

        <p
          id="bodyMd-hint"
          className={
            bodyTooLarge
              ? 'text-danger-ink text-[12px]'
              : 'text-ink-subtle text-[12px] leading-[1.4]'
          }
        >
          {bodyHint}
        </p>
        {bodyLength >= BODY_WARN_AT ? (
          <p
            className={
              bodyTooLarge
                ? 'text-danger-ink text-right text-[12px] tabular-nums'
                : 'text-warning text-right text-[12px] tabular-nums'
            }
          >
            {bodyLength.toLocaleString()} / {BODY_MAX.toLocaleString()} characters
          </p>
        ) : null}
        {bodyError ? (
          <p role="alert" className="text-danger-ink text-[12px]">
            {bodyError}
          </p>
        ) : null}
      </div>

      {/* E3: a create has no prior state to describe, so the note is edit-only. */}
      {mode === 'edit' ? (
        <Field label="Change note" htmlFor="changeNote" hint="Shown in history. Optional.">
          <Input
            id="changeNote"
            placeholder="What changed? (optional)"
            maxLength={200}
            {...register('changeNote')}
          />
        </Field>
      ) : null}

      <div className="border-divider flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <div role="status" aria-live="polite" className="mr-auto">
          <StatusPill state={pillState} isDirty={isDirty} />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={pending}
          onClick={() => requestNavigation(cancelDestination)}
        >
          Cancel
        </Button>

        {/* E10: secondary, create route only. */}
        {mode === 'create' ? (
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={pending || bodyTooLarge}
            onClick={() => {
              intentRef.current = 'another';
            }}
          >
            Save &amp; create another
          </Button>
        ) : null}

        <Button
          id="article-save"
          type="submit"
          variant="primary"
          size="md"
          disabled={pending || bodyTooLarge}
          loading={pending}
          onClick={() => {
            intentRef.current = 'save';
          }}
        >
          {saveLabel}
        </Button>
      </div>

      <Dialog open={slugDialogOpen} onOpenChange={setSlugDialogOpen}>
        <DialogContent>
          <DialogTitle>Regenerate slug?</DialogTitle>
          <DialogDescription>
            Changing the slug will break existing links to this article.
          </DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setSlugDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={regenerateSlug}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogTitle>Discard your unsaved changes?</DialogTitle>
          <DialogDescription>Your edits to this article will be lost.</DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setDiscardOpen(false);
                if (pendingHref) router.push(pendingHref);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reloadConfirmOpen} onOpenChange={setReloadConfirmOpen}>
        <DialogContent>
          <DialogTitle>Discard your unsaved edits?</DialogTitle>
          <DialogDescription>Copy them first if you want to keep them.</DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setReloadConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setReloadConfirmOpen(false);
                window.location.reload();
              }}
            >
              Discard and reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

/**
 * design-spec.md §5.5 — the conflict banner.
 *
 * It is the app's highest-priority message, so it takes focus on mount: a
 * screen-reader user has to hear that their save did not land before doing anything
 * else, and `tabIndex={-1}` makes a non-interactive element focusable without adding
 * it to the tab order.
 *
 * `Copy my text` renders **before** the destructive path and is never hidden. It is
 * the whole reason "reload discards my edits" is acceptable (UX14), so the ordering
 * is deliberate rather than incidental.
 */
export function ConflictBanner({
  onCopy,
  copied,
  onReloadRequest,
}: {
  onCopy: () => void;
  copied: boolean;
  onReloadRequest: () => void;
}) {
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      tabIndex={-1}
      ref={focusRef}
      className="rounded-card border-warning/40 bg-warning-soft border p-4"
    >
      <div className="flex gap-3">
        <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-ink text-[15px] font-semibold">
            This article was updated by someone else.
          </p>
          <p className="text-ink-muted mt-1 text-[13px]">
            Reload the latest version to see their changes, or copy your text first so nothing is
            lost.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={onReloadRequest}>
              Reload latest version
            </Button>
            <Button variant="secondary" size="sm" onClick={onCopy}>
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy my text'}
            </Button>
            {/* The label swap is announced; the button's own name already changed. */}
            <span role="status" aria-live="polite" className="sr-only">
              {copied ? 'Copied' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

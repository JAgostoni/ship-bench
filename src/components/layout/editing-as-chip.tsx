'use client';

import { ChevronDown } from 'lucide-react';
import { useActionState, useCallback, useState } from 'react';
import { setDisplayName } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Toast, ToastRegion } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { TOAST_MESSAGES } from '@/lib/toast-messages';
import { ANONYMOUS_EDITOR } from '@/lib/display-name-constants';
import type { ActionState } from '@/types/domain';

/**
 * The sidebar's `Editing as` chip (design-spec.md §4.6, UX12).
 *
 * **This is not authentication.** The spec is emphatic that it must never be
 * described as such: it is one dialog and one cookie whose only purpose is that
 * `History` reads as a person rather than as "Anonymous editor" for everyone (U4).
 * The body copy says so in as many words.
 *
 * The warning dot is the whole nudge. UX12 rejected blocking editing until a name is
 * set — that would tax the core flow — and rejected doing nothing, because History
 * would then be uniformly anonymous. A subtle `--warning` dot is the middle weight:
 * visible enough to prompt, ignorable enough to proceed past.
 */
export type EditingAsChipProps = {
  /** The cookie value, read on the server so the chip's first paint is correct. */
  initialName?: string | null;
  className?: string;
};

const initial: ActionState = { status: 'idle' };

export function EditingAsChip({ initialName, className }: EditingAsChipProps) {
  const [name, setName] = useState(initialName?.trim() ? initialName.trim() : null);
  const [open, setOpen] = useState(false);
  /** The toast's dismissal latch. It only ever hides, so it cannot cascade. */
  const [dismissed, setDismissed] = useState(false);
  /**
   * The submitted name, captured so the chip's own label updates from what the server
   * confirmed rather than optimistically. A chip claiming a name the server did not store
   * would be worse than one that lags a tick.
   */
  const [submitted, setSubmitted] = useState<string | null>(null);

  /**
   * The action is bound to a wrapper that closes the dialog as part of its own body.
   * A `useEffect` watching `state.status` would be a synchronous state update inside an
   * effect — a cascading render, and an error under this project's React Compiler lint
   * config. Closing here is the accurate description: the close is a consequence of the
   * *submission*, and it runs on the event path.
   */
  const boundAction = useCallback(
    async (prev: ActionState, formData: FormData) => {
      const next = await setDisplayName(prev, formData);
      if (next.status === 'success') {
        setOpen(false);
        setName(submitted);
      }
      return next;
    },
    [submitted],
  );

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    boundAction,
    initial,
  );

  const succeeded = state.status === 'success';
  const displayName = name ?? ANONYMOUS_EDITOR;
  const isAnonymous = name === null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              'rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[13px]',
              className,
            )}
          >
            <span className="text-ink-subtle">Editing as</span>
            <span className={isAnonymous ? 'text-ink-subtle truncate' : 'text-ink truncate'}>
              {displayName}
            </span>
            {isAnonymous ? (
              <span
                aria-hidden="true"
                data-testid="editing-as-warning"
                className="bg-warning h-1.5 w-1.5 shrink-0 rounded-full"
              />
            ) : null}
            <ChevronDown
              className="text-ink-subtle ml-auto h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
          </button>
        </DialogTrigger>

        <DialogContent>
          <DialogTitle>Display name</DialogTitle>
          <DialogDescription>
            Your name appears in an article&apos;s history when you save. It is not a login.
          </DialogDescription>

          <form action={formAction} className="mt-5" noValidate>
            <Field
              label="Display name"
              htmlFor="displayName"
              required
              error={state.status === 'error' ? state.fieldErrors?.displayName?.[0] : undefined}
            >
              <Input
                id="displayName"
                name="displayName"
                defaultValue={name ?? ''}
                maxLength={40}
                autoComplete="off"
              />
            </Field>

            {state.status === 'error' && !state.fieldErrors ? (
              <p role="alert" className="text-danger mt-2 text-[12px]">
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isPending}
                // The chip's label comes from the submitted value, so the handler reads it
                // off the form rather than duplicating the input's state.
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  const input = form?.elements.namedItem('displayName');
                  if (input instanceof HTMLInputElement) setSubmitted(input.value.trim() || null);
                }}
              >
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {succeeded && !dismissed ? (
        <ToastRegion>
          <Toast duration={4000} onDismiss={() => setDismissed(true)}>
            {TOAST_MESSAGES.nameSaved}
          </Toast>
        </ToastRegion>
      ) : null}
    </>
  );
}

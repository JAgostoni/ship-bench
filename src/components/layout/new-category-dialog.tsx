'use client';

import { useActionState, useCallback, useState } from 'react';
import { createCategory } from '@/app/actions/categories';
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
import { TOAST_MESSAGES } from '@/lib/toast-messages';
import type { ActionState } from '@/types/domain';

const initial: ActionState = { status: 'idle' };

/**
 * The `New category` dialog (design-spec.md §4.4, §7.6).
 *
 * Iteration 4 rendered the form and its exact copy with an inert submit; iteration 6's
 * `createCategory` Server Action is what makes it write. The dialog owns the call rather
 * than the sidebar because a dialog's success state is "close me and confirm", and that
 * decision needs the action's result.
 *
 * **The action is wrapped in a local async function rather than used raw.** The wrapper
 * awaits the Server Action and then closes the dialog in the same async continuation —
 * which is an event path, not an effect. Closing from a `useEffect` that watches the
 * action's result would be a state update synchronously within an effect (cascading
 * render, and flagged by the React Compiler lint rule); awaiting is both simpler and the
 * more accurate description of what is happening.
 *
 * Two behaviours come from the spec rather than from convenience:
 *
 * - **A duplicate name is a *form-level* error, not a field error.** It is a statement
 *   about the set of categories, not about the `Name` field's format, and rendering it
 *   under the input would imply the user typed something malformed.
 * - **The toast fires after the action's `revalidatePath('/')`**, so the sidebar row the
 *   user is looking at and the confirmation arrive together rather than a reload apart.
 */
export function NewCategoryDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  /** The toast's dismissal latch. It only ever hides, so it cannot cascade. */
  const [dismissed, setDismissed] = useState(false);

  /**
   * The action is bound to a wrapper that closes the dialog as part of its own body.
   *
   * A `useEffect` watching `state.status` would be a synchronous state update inside an
   * effect — a cascading render, and an error under this project's React Compiler lint
   * config. Closing here is both simpler and more accurate: the dialog's close is a
   * consequence of the *submission*, not a synchronisation with external state, and it
   * runs on the event path where a submit-time effect belongs.
   */
  const boundAction = useCallback(async (prev: ActionState, formData: FormData) => {
    const next = await createCategory(prev, formData);
    if (next.status === 'success') setOpen(false);
    return next;
  }, []);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    boundAction,
    initial,
  );

  const succeeded = state.status === 'success';
  const fieldError = state.status === 'error' ? state.fieldErrors?.name?.[0] : undefined;
  const formLevelError = state.status === 'error' && !state.fieldErrors ? state.message : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent>
          <div className="pr-8">
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>Categories help you group related articles.</DialogDescription>
          </div>

          <form action={formAction} className="mt-5" noValidate>
            <div className="grid gap-5">
              <Field label="Name" htmlFor="category-name" required error={fieldError}>
                <Input id="category-name" name="name" maxLength={60} autoComplete="off" />
              </Field>
              <Field
                label="Description"
                htmlFor="category-description"
                hint="Optional. Up to 200 characters."
              >
                <Input id="category-description" name="description" maxLength={200} />
              </Field>
            </div>

            {formLevelError ? (
              <p role="alert" className="text-danger mt-3 text-[12px]">
                {formLevelError}
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
              <Button type="submit" variant="primary" size="md" loading={isPending}>
                Create category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {succeeded && !dismissed ? (
        <ToastRegion>
          <Toast duration={4000} onDismiss={() => setDismissed(true)}>
            {TOAST_MESSAGES.categoryCreated}
          </Toast>
        </ToastRegion>
      ) : null}
    </>
  );
}

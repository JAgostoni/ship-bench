'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * The `New category` dialog (design-spec.md §4.4).
 *
 * Iteration 4 renders the form and its exact copy; the Server Action that writes
 * the row (`POST /api/categories` / `app/actions/categories.ts`) is iteration 6's
 * deliverable, so submitting is inert here. Shipping the entry point now keeps
 * the sidebar's empty state actionable rather than a dead end, which §5.6
 * requires.
 */
export function NewCategoryDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <div className="pr-8">
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>Categories help you group related articles.</DialogDescription>
        </div>
        <div className="mt-5 grid gap-5">
          <Field label="Name" htmlFor="category-name" required>
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
        <DialogFooter>
          <Button variant="secondary" size="md">
            Cancel
          </Button>
          <Button variant="primary" size="md">
            Create category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

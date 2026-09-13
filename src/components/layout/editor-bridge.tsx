'use client';

import { createContext, useContext } from 'react';

/**
 * The bridge between the editor's document status strip and the form that owns the
 * state (design-spec.md §3.5's wireflow).
 *
 * The spec places the status pill and the primary `Save` in the **sticky header**
 * while the fields live in the content column, so the two are siblings rather than
 * one component. Lifting every field's state into a shared parent would mean
 * synchronising two copies of the whole document; instead the form reports a small
 * derived status upward, and the header renders only that.
 *
 * `null` is a documented, supported case rather than an error: `ArticleForm` renders
 * its own action bar and status line when it is mounted without the shell (component
 * tests, or any future embedded use), so the form never depends on the shell to be
 * usable.
 */
export type EditorPillStatus = 'saved' | 'dirty' | 'saving' | 'failed';

export type EditorBridge = {
  /** The form's derived status, published for the header's pill. */
  status: EditorPillStatus;
  /** Reported by the form whenever the derived status changes. */
  report: (status: EditorPillStatus) => void;
  /** The form's dirty-guarded cancel; the header's `← Cancel` calls it. */
  cancel: () => void;
  /** Registered by the form, because only it knows the destination and dirty flag. */
  registerCancel: (handler: () => void) => void;
};

export const EditorBridgeContext = createContext<EditorBridge | null>(null);

/** `null` means "no focused shell" — see the note above. */
export function useEditorBridge(): EditorBridge | null {
  return useContext(EditorBridgeContext);
}

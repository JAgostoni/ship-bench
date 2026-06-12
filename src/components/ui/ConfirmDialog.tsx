"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Swapped to error copy by the caller in the error state (design §4.4). */
  body: string;
  confirmLabel: string;
  /** Verb label while busy, e.g. "Deleting…". */
  busyLabel?: string;
  cancelLabel?: string;
  /** Danger-styled confirm action (delete, discard). */
  danger?: boolean;
  /** Acting state: confirm loading-disabled; Cancel, Esc, and backdrop inert. */
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Modal confirmation dialog (design §4.4, normative): centered, max-width
 * 400px, `role="alertdialog"`, focus trapped, initial focus on the safe
 * button, Esc + backdrop click cancel, focus returned to the trigger on
 * close. Used by the delete flow and the editor's discard guard.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) {
    return null;
  }
  return createPortal(<DialogPanel {...props} />, document.body);
}

function DialogPanel({
  title,
  body,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;
  const panelRef = useRef<HTMLDivElement>(null);

  // Initial focus on the safe button (first in DOM order, design §4.4);
  // on close, focus returns to whatever triggered the dialog.
  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, []);

  // The confirm button gets real `disabled` while busy (§4 note), which drops
  // DOM focus; pull it back inside the trap.
  useEffect(() => {
    if (!busy) {
      return;
    }
    const panel = panelRef.current;
    const active = document.activeElement;
    if (
      panel &&
      (!(active instanceof HTMLElement) ||
        !panel.contains(active) ||
        (active instanceof HTMLButtonElement && active.disabled))
    ) {
      panel.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    }
  }, [busy]);

  // Esc cancels (inert while busy); Tab is trapped inside the panel.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) {
          onCancel();
        }
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not(:disabled)"),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && panel.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="pop-in w-full max-w-dialog rounded-md bg-surface p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {/* aria-live so the error-copy swap (§4.4 error state) announces. */}
        <p
          id={bodyId}
          aria-live="polite"
          className="mt-2 text-base text-text-secondary"
        >
          {body}
        </p>
        {/* Safe action left, destructive right, 8px gap (§4.4). */}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) {
                onCancel();
              }
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            loadingLabel={busyLabel ?? confirmLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

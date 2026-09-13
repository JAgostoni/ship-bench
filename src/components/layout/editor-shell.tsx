'use client';

import { useCallback, useMemo, useState } from 'react';
import { Footer } from './footer';
import { EditorBridgeContext, type EditorBridge, type EditorPillStatus } from './editor-bridge';
import { EditorStatusStrip } from './editor-status-strip';
/**
 * The focused editor shell (design-spec.md §2.2, UX6, §3.5).
 *
 * Deliberately **not** the `AppShell`: the editor drops the sidebar, the TOC, and
 * the header search. UX6's rationale is that writing is a different mode from
 * reading, and the two largest sources of "I'll just check that other article first"
 * are the navigation regions themselves. Rendering a two-region shell
 * (`header` + `main`) is the most direct expression of that, and it means no route
 * has to unwind chrome with a conditional.
 *
 * The shell owns exactly one piece of state — the derived save status — because the
 * spec puts the pill in the sticky header while the form owns the fields. The bridge
 * context is what carries it across; see `editor-bridge.tsx` for why this is not a
 * lifted form.
 */
export function EditorShell({
  title,
  formId,
  saveLabel,
  children,
}: {
  /** Breadcrumb title: `New article`, or the article's title on edit. */
  title: string;
  /** The `id` of the `<form>` the header's Save submits. */
  formId: string;
  saveLabel: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<EditorPillStatus>('saved');
  const [cancelHandler, setCancelHandler] = useState<(() => void) | null>(null);

  const registerCancel = useCallback((handler: () => void) => {
    // `useState`'s setter treats a function argument as an updater, so the handler is
    // wrapped — this is the standard way to store a callback in state.
    setCancelHandler(() => handler);
  }, []);

  const cancel = useCallback(() => {
    cancelHandler?.();
  }, [cancelHandler]);

  const bridge = useMemo<EditorBridge>(
    () => ({ status, report: setStatus, cancel, registerCancel }),
    [status, cancel, registerCancel],
  );

  const pending = status === 'saving';

  return (
    <EditorBridgeContext.Provider value={bridge}>
      <div className="flex min-h-dvh flex-col">
        <header className="bg-surface border-border sticky top-0 z-30 border-b">
          <EditorStatusStrip
            title={title}
            status={status}
            formId={formId}
            pending={pending}
            saveLabel={saveLabel}
            onCancel={cancel}
          />
        </header>

        {/*
          The shell owns the single `<main>` landmark, matching `AppShell`'s contract
          so `#main` and the skip link behave identically on every route
          (design-spec.md §9.4 requires exactly one).
        */}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>

        {/*
          design-spec.md §9.4 requires exactly one `contentinfo`. The focused shell
          omits the sidebar and the header search, but the footer is not chrome — it
          keeps the landmark contract identical on every route.
        */}
        <Footer />
      </div>
    </EditorBridgeContext.Provider>
  );
}

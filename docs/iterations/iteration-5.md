# Iteration 5 — Editing, create, and delete

**Goal:** complete the last required feature: the Markdown editor with live preview (create + edit), the delete flow with confirmation, and the editor component test. After this iteration, every brief-required feature is usable in the UI.

**Scope:** brief feature 3, UI layer (the write API exists from iteration 2). Adds the Edit/Delete actions deferred from iteration 3's detail page.

**References:** design §2.3 (editor UX, normative), §2.4 (delete), §1.3/S4–S5 (layouts), §4.1/§4.4/§4.6 (button loading, ConfirmDialog, error banner), §7.3–7.5 (tabs, dialog, focus management), §8.3 (exact copy); architecture §5.2 (editor decisions), §8.1 (component test).

---

## Tasks

### 5.1 ConfirmDialog primitive

`src/components/ui/ConfirmDialog.tsx` (extracted to `ui/` — used by both delete and the editor's discard guard, design §8.1):

- Props: `title`, `body`, `confirmLabel`, `danger`, `busy` (+ open/close/confirm callbacks).
- Modal per design §4.4: centered, max-width 400px, backdrop `rgb(0 0 0 / 0.4)`, `role="alertdialog"`, `aria-labelledby`/`aria-describedby`, focus trapped, **initial focus on the safe button**, `Esc` + backdrop click cancel, focus returns to the trigger on close. 150 ms open animation behind `prefers-reduced-motion`.
- States (exhaustive): open; acting (confirm button loading-disabled, Cancel and Esc disabled in flight); error (body swaps to error copy, buttons re-enabled).

### 5.2 ArticleEditor component

`src/components/ArticleEditor.tsx` (client, `mode: 'new' | 'edit'`). Design §2.3 is normative; the mechanics:

- **Layout:** title `Input` full-width above the panes. ≥1024px: split pane 1fr/1fr gap 24px — monospace textarea (14px/1.6, min-height 360px, auto-growing, spellcheck on, no toolbar) left; preview right, independently scrolling. Below 1024px: Write/Preview tabs (`role="tablist"` pattern, arrow keys move + activate; textarea stays mounted, hidden with CSS so content/scroll/cursor survive tab switches). Helper line: "Markdown supported — headings, lists, tables, code, links."
- **Preview:** renders through the shared `ArticleBody` (preview parity is a hard requirement), re-render debounced **150 ms**; empty content shows centered muted "Nothing to preview yet."
- **Validation** (the iteration-2 Zod schema, client-side): validate a field on blur and the whole form on submit; never on first keystroke; once a field has errored, re-validate on every change. Error presentation via the `Input` error wiring (danger border, message + icon, `aria-describedby`/`aria-invalid`). On failed submit, focus the first invalid field. Character counters appear only near limits (≥180/200 title, ≥90,000/100,000 content), danger-colored past them.
- **Save:** primary "Save article" → client-validate → button loading state ("Saving…", width-locked) → `POST /api/articles` or `PUT /api/articles/{id}` → on success `router.push` to the detail page + `router.refresh()`, then focus the page h1 (`tabindex="-1"`, design §7.5). Server 400 `fieldErrors` map onto fields exactly like client errors. Network/500 → form-level error banner (design §4.6: `role="alert"`, focused when shown) above the title: "Couldn't save. Your text is still here — try again." — inputs intact, button re-enabled.
- **Dirty tracking + guards:** dirty = title or content differs from initial values. `beforeunload` listener registered only while dirty. **Cancel** (secondary; new → `/`, edit → `/articles/[id]`): if dirty, ConfirmDialog variant — "Discard changes?" / "Your edits haven't been saved." / "Keep editing" (safe, default focus) + "Discard" (danger). Don't intercept other in-app navigation beyond `beforeunload`.
- **Keyboard:** `Enter` in the title input submits; `Ctrl/Cmd+Enter` submits from the textarea (plain Enter inserts newlines).
- Responsive actions per design §3.2: top-right sticky with heading ≥1024px; below content (Save right-aligned) on tablet; full-width stacked (Save on top) below 768px.

### 5.3 New and edit pages (S4, S5)

- `src/app/articles/new/page.tsx`: RSC shell, h1 "New article", `ArticleEditor mode="new"` with empty initial values.
- `src/app/articles/[id]/edit/page.tsx`: RSC shell, fetches the article via repo (`notFound()` if missing), h1 "Edit article", `ArticleEditor mode="edit"` pre-filled.
- The header's "+ New article" button and the home empty-state CTA now resolve to a real page — no interim 404 remains.

### 5.4 Detail-page actions: Edit and Delete

Complete S2's action slot (deferred from iteration 3):

- "Edit" — secondary button with pencil icon → `/articles/[id]/edit`.
- `src/components/DeleteArticleButton.tsx` (client) — ghost-danger button with trash icon opening ConfirmDialog: title "Delete "{article title}"?", body "This permanently deletes the article. This can't be undone.", "Cancel" (default focus) / "Delete" (danger). In flight: "Deleting…" loading state. Success → `DELETE /api/articles/{id}` → `router.push('/')` (+ refresh). Error → dialog body swaps to "Couldn't delete. Try again.", buttons re-enabled.
- Actions sit right of the h1 ≥768px, wrap to a full row below; ≥8px between targets (design §3.3).

### 5.5 Editor component test

Per architecture §8.1: one Vitest + `@testing-library/react` test file for `ArticleEditor` (jsdom environment via `// @vitest-environment jsdom`):

- Submitting with an empty title shows "Title is required" wired to the input via `aria-describedby`, and the field gets `aria-invalid`.
- Typing Markdown (e.g., `# Hello`) renders an `h1` "Hello" in the preview pane (after the debounce — use fake timers).
- Blur-then-fix clears the error on change.

---

## Iteration-specific notes

- **Sequencing within the iteration:** 5.1 first (5.2 and 5.4 both consume it) → 5.2 → 5.3 → 5.4 → 5.5. Write the component test against the finished editor, not mid-build.
- Depends on iteration 2 (write endpoints, shared Zod schema and its exact message strings), iteration 3 (`ArticleBody`, `Input`, `Button`, tokens, detail page), and iteration 4 only trivially (header is final).
- Use the design §8.3 copy reference **verbatim** for every label and message in this iteration — most of the app's copy surface lives here.
- State checklist to demo (design §9, Edit/Create + Delete rows): pristine, dirty, all four field-error messages, counters near limits, preview empty/live, tabs <1024px, Save loading, server 400 mapped to fields (send an oversized title via devtools to force one), network-error banner (stop the server mid-save), discard-changes dialog, `beforeunload` prompt, delete dialog open/acting/error, post-delete redirect.

## Definition of done

- Full content lifecycle works in the UI: create from header button and from the zero-articles empty state → land on new detail (h1 focused); edit → save → updated detail; cancel-with-dirty-state prompts; delete → confirm → home.
- New article is immediately findable via search (FTS triggers prove out end-to-end).
- Component test green alongside all prior unit tests; `npm run check` passes.
- Entire design §9 Edit/Create and Delete state rows demonstrable.

# Iteration 4 — Search experience

**Goal:** ship the brief's flagship interaction end-to-end: the header `SearchBox` with debounced dropdown and full keyboard combobox model, and the complete `/search` results page with highlighted snippets.

**Scope:** brief feature 2, UI layer (the FTS backend and `/api/search` already exist from iteration 2). Replaces the iteration-3 header stub and instruction-only `/search` page.

**References:** design §2.2 (normative search UX), §1.3/S3 (layout), §4.3 (SearchBox states), §5.2 (empty state), §7.3–7.4 (combobox a11y, aria-live); architecture §5.1 (one backend, two surfaces; `<mark>` whitelist rendering).

---

## Tasks

### 4.1 Shared `<mark>` token renderer

Small shared util/component (e.g., `src/components/Snippet.tsx`): takes the API's snippet string, splits on the known `<mark>`/`</mark>` tokens, and renders text nodes with `<mark>` elements — **never** `dangerouslySetInnerHTML` (design §8.4). `<mark>` styling: bg `--color-mark`, inherited text color, 0 2px padding. Used by both the dropdown and the results page.

### 4.2 Full search results page (S3)

Replace the iteration-3 placeholder at `src/app/search/page.tsx` (RSC, dynamic):

- Reads `q` from search params; calls `searchArticles(q, 20)` via the repo directly (server-side, no HTTP hop).
- Layout per design §1.3/S3: h1 22px "Search results for "{q}"", count right ("{n} result{s}") wrapped in `aria-live="polite"`; result rows — full-width blocks divided by 1px borders, entire row clickable to the article, anatomy: title 16px link, snippet 14px with `<mark>` highlights via 4.1, "Updated {relative}" 13px meta (reuse iteration 3's relative-time util).
- **Blank/missing `q`:** instruction state — "Type in the search box above to search all articles." Never an error (design §2.2B).
- **Zero results:** `EmptyState` — search-x icon, "No results for "{q}"", "Check the spelling or try a broader term.", secondary "Clear search" → `/` (design §5.2).

### 4.3 SearchBox component — core behavior

`src/components/SearchBox.tsx` (client), replacing the header stub. Design §2.2A and §4.3 are normative; key mechanics:

- Debounce **200 ms**; fire `GET /api/search?q=…&limit=5` only when trimmed query ≥ **2 chars**; below that the dropdown is closed and no request is made.
- **Stale-response guard:** track a request sequence number; ignore responses whose query no longer matches the current input.
- Dropdown anchored under the input, same width (min 320px; full viewport width minus 16px margins below 768px), surface/border/radius/shadow per §2.2A. Items: title 14px medium + single-line ellipsized snippet 13px (via 4.1), padding 8px 12px, min-height 44px below `lg`.
- Footer row "See all {total} results →" → `/search?q=…` — always present when there are results, even if total ≤ 5.
- **Loading:** previous results stay rendered (no flicker); 16px spinner replaces the `/` kbd hint inside the input. No skeletons.
- **No results (≥2 chars):** one non-interactive muted row: "No matches for "{q}" — press Enter to search everything".
- **Request error:** one non-interactive row in danger text: "Search isn't responding — press Enter to open full search". No toast, no auto-retry.
- **Dismissal/navigation:** outside click, `Tab`, `Esc`, or any navigation closes it. After navigating, clear the input — except navigation to `/search`, where the input keeps (and pre-fills from) `q`.
- On focus with ≥2 chars and cached results, reopen the dropdown.

### 4.4 Keyboard model and combobox accessibility

Per design §2.2A + §7.3:

- Input: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant` tracking the active `role="option"`; listbox role on the dropdown. DOM focus never leaves the input; the active option is visual + ARIA only.
- Keys: `↓`/`↑` move active option (wrapping); `Enter` opens the active option, or with none active navigates to `/search?q=…`; `Esc` closes the dropdown first, second press clears the input; `Tab` closes and moves on. Hover sets active; click navigates.
- Global `/` shortcut focuses the search input, suppressed while focus is in any input/textarea/contenteditable (design §7.3). The kbd `/` hint hides on pointer-coarse devices.
- Result-count announcements go through the `aria-live` count node, not by live-regioning the listbox (design §7.4).

### 4.5 Motion and polish

- Dropdown opens with the app's only sanctioned animation: 150 ms ease-out fade + 4px translate, wrapped in `@media (prefers-reduced-motion: no-preference)`; instant otherwise (design §7.6).
- Active option treatment: bg `--color-bg` + 2px left accent border (design §4.3).

---

## Iteration-specific notes

- **Sequencing within the iteration:** 4.1 → 4.2 (server page is simpler, validates the renderer and repo wiring) → 4.3 → 4.4 → 4.5. The dropdown reuses 4.2's verified plumbing.
- Depends on iteration 2's `/api/search` (dropdown) and `searchArticles` repo function (results page), and iteration 3's header, tokens, `EmptyState`, and relative-time util.
- The seeded articles are the test corpus — verify prefix matching ("depl" → Deploy checklist), title-over-content ranking, and `<mark>` highlights in both surfaces against them.
- State checklist to demo before calling it done (design §9, Search row): idle, <2 chars, loading with retained results, results + footer, zero-results row, error row (stop the dev server's API or force a 500 to see it), keyboard navigation, full page with count + highlights, full-page empty state, blank-`q` instruction state.

## Definition of done

- Search flow works end-to-end from any screen: type ≥2 chars → dropdown top-5 with highlights → click result → detail; Enter → full results page (shareable URL, pre-filled header input) → row click → detail; "Clear search" → home.
- Entire §9 Search state row demonstrable; keyboard-only operation complete (`/`, arrows, Enter, Esc×2, Tab).
- No `dangerouslySetInnerHTML` anywhere; reduced-motion honored.
- `npm run check` passes; all existing tests green.

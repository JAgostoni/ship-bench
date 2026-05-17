# Iteration 6 — Responsive Design

## Goal

Make the application fully responsive for desktop, tablet, and mobile viewports as specified in the design spec. After this iteration the application works correctly across all three breakpoints without layout breakage or loss of functionality.

## Scope

- Desktop layout is already implemented in iterations 3–5; this iteration adds breakpoint-specific overrides
- Tablet: sidebar collapses to 64px icon-only mode; search bar moves inline above the article list
- Mobile: sidebar hidden; top navigation bar (48px) with hamburger, app name, search icon, and New Article icon; hamburger opens a full-width drawer containing the full sidebar; search expands inline above the list

---

## Task List

### 6.1 — Tablet sidebar collapse

Modify `src/components/Nav.tsx` and the root layout to support the collapsed sidebar at the `md:` breakpoint (768–1023px):

**Sidebar width:**
- Default (mobile): sidebar hidden (`hidden md:flex`)
- `md:` breakpoint: 64px wide (`md:w-16`)
- `lg:` breakpoint: 240px wide (`lg:w-60`)

**At 64px (tablet) — hide text, show icons only:**
- App name "Knowledge Base" → hide text, show a monogram or `FileText` icon (20×20)
- Search bar → hide entirely from sidebar (`hidden lg:block`). A search icon button will be added to the mobile top nav (task 6.3) instead. At tablet the search icon opens a temporary overlay (task 6.4).
- "CATEGORIES" section label → hidden (`hidden lg:block`)
- Category links → hide the text label; show only a colored dot (a 10×10 rounded circle using the category's color) or the category's first letter as a monogram. Tooltip via `title` attribute for hover. Link retains its full click area.
- Horizontal rule → hidden at `md:`, shown at `lg:`
- "New Article" button → collapse to a `+` icon button with `aria-label="New article"` at `md:`, full-width button at `lg:`

Apply these changes using Tailwind responsive prefixes. No JavaScript is required for tablet collapse — it is CSS-only.

### 6.2 — Mobile top navigation bar

The mobile top nav bar replaces the sidebar at `< 768px`. Add it to `src/app/layout.tsx`:

- Render only on mobile: `<div className="flex md:hidden h-12 border-b border-[--color-border] items-center px-4 bg-[--color-surface]">`
- Content (left to right):
  1. Hamburger button (`Menu` icon, 20×20, `aria-label="Open navigation"`) — controls the mobile drawer
  2. `<span>Knowledge Base</span>` — centered, 16px semibold
  3. Search icon button (`Search` icon, `aria-label="Search"`) — expands inline search
  4. New article icon button (`Plus` icon, `aria-label="New article"`) — links to `/articles/new`

This bar is a Client Component (`'use client'`) because it controls drawer and search expand state via `useState`.

Create `src/components/MobileNav.tsx` as a Client Component housing the top bar, drawer, and search expand behavior.

### 6.3 — Mobile hamburger drawer

Inside `MobileNav.tsx`, implement the slide-in drawer:

**State:** `const [drawerOpen, setDrawerOpen] = useState(false)`

**Drawer:**
- Full-height panel that overlays from the left
- Background: `--color-surface`, `shadow-xl`, `rounded-r-lg`
- Width: `max-w-[280px] w-full`
- Overlay backdrop: `fixed inset-0 bg-black/50` behind the drawer (z-index management)
- Contents: the full `Nav` sidebar content (categories, search bar, New Article button) — replicate the Nav's content for mobile, or extract shared content into a `SidebarContent` component that both Nav and the drawer render
- Close behavior: clicking the backdrop, pressing `Escape`, or clicking any nav link closes the drawer
- Transition: slide in from left using CSS transition on `transform: translateX(-100%)` → `translateX(0)`. Use Tailwind's `transition-transform duration-200`
- Accessibility: drawer container uses `role="dialog"`, `aria-modal="true"`, `aria-label="Navigation"`. Focus is trapped inside the drawer while open (implement with a `useEffect` that calls `focus()` on the first focusable element and listens for `Tab` key to cycle through focusable children). Close on `Escape` via a `keydown` listener.

Close the drawer automatically when the route changes: listen to `usePathname()` + `useSearchParams()` changes in a `useEffect` and call `setDrawerOpen(false)`.

### 6.4 — Mobile search expand

Inside `MobileNav.tsx`, implement the search expand behavior:

**State:** `const [searchOpen, setSearchOpen] = useState(false)`

When `searchOpen === true`:
- Replace the top nav bar content with a full-width `<SearchBar />` component (the same component from iteration 3)
- Add an `×` button on the right to close the search bar (`setSearchOpen(false)`)
- Focus the search input automatically on expand (`useEffect` with `inputRef.current?.focus()`)

When `searchOpen === false`: show the normal top nav bar.

The transition should be a simple `opacity` or `height` CSS transition.

### 6.5 — Mobile article list and card adjustments

Reduce internal card padding on mobile to 12px (`p-3 md:p-4` on each `ArticleCard`).

Ensure the article list has `px-4` horizontal padding on mobile.

The article detail content area: remove the `max-w-[720px] mx-auto` constraint on mobile (< 768px) since small screens don't need it. Use `md:max-w-[720px] md:mx-auto` instead.

### 6.6 — Mobile editor tabs

The `@uiw/react-md-editor` component supports a `preview` prop and can be switched between modes. On mobile (< 768px), show tabbed mode instead of split-pane:

In `ArticleEditor.tsx`, detect screen width using a `useEffect` + `useState` pattern or a `useMediaQuery` hook:

```ts
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

Pass `preview={isMobile ? 'edit' : 'live'}` and conditionally render a tab bar above the editor when `isMobile`:
- "Write" tab (sets editor to `edit` mode) and "Preview" tab (sets editor to `preview` mode)
- Simple tab styling: two inline buttons, active tab underlined with `--color-accent`

Minimum height: 300px on mobile (`isMobile ? 300 : 400`).

### 6.7 — Touch target verification

Review all interactive elements at mobile viewport size and confirm minimum 44×44px touch targets:

- Category nav links: add `py-3` on mobile (`py-3 lg:py-2` on each link)
- Article cards: full-width, height is content-determined — no change needed
- Primary buttons: use `h-11` (44px) on mobile (`h-11 md:h-10`)
- Radio options: labels extend full width of their container
- Search clear button: ensure the `×` button's click target is at least 44×44px via padding

### 6.8 — Verify responsive layout

Test the following at each breakpoint using browser DevTools device emulation:

**Desktop (1280px):**
- Sidebar is 240px, full text visible
- Article list fills remaining width
- Editor is split-pane

**Tablet (768px):**
- Sidebar collapses to 64px with icon-only
- Category text hidden, colored dots or monograms visible
- "New Article" collapses to `+` icon
- Search bar absent from sidebar

**Mobile (375px — iPhone SE):**
- No sidebar visible
- Top nav bar: hamburger, "Knowledge Base", search icon, + icon
- Tapping hamburger opens drawer with full nav (categories + New Article button)
- Tapping backdrop closes drawer
- Tapping search icon expands full-width search bar
- Article cards have 12px internal padding
- Editor shows tab mode (Write / Preview)

---

## Iteration Notes

- The mobile drawer focus-trap implementation prevents background scrolling. Add `overflow-hidden` to `<body>` when the drawer is open via a `useEffect` that toggles a class.
- The `SidebarContent` extraction (shared between `Nav` and the mobile drawer) avoids duplicating the category list logic. `Nav` calls `listCategories()` as a Server Component; the mobile drawer receives categories via props from `MobileNav` which fetches them client-side (via `fetch('/api/categories')`) on first open. Alternatively, pass categories down from the root layout as a prop to `MobileNav` — since the root layout is a Server Component, it can call `listCategories()` once and pass the result to both `Nav` and `MobileNav`.
- Do not use `position: fixed` for the sidebar. The `overflow-hidden` on `<body>` + `overflow-y-auto` on `<main>` approach established in the root layout (iteration 3, task 3.2) already achieves a fixed sidebar without `position: fixed`.
- Tailwind's responsive prefixes (`md:`, `lg:`) are mobile-first — the default (no prefix) applies to mobile, then overrides apply at breakpoints. Write classes in the order: mobile → tablet (`md:`) → desktop (`lg:`).

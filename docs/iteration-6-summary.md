# Iteration 6 Summary — Responsive Design

## What Was Built

### 6.1 — Tablet sidebar collapse
- `Nav.tsx` refactored to accept `categories` as props (no longer fetches internally)
- Sidebar is now `hidden md:flex md:w-16 lg:w-[240px]` — invisible on mobile, 64px at tablet, 240px at desktop
- At tablet (64px): app name replaced by `FileText` icon; search bar hidden (`hidden lg:block`); category label hidden; HR hidden; New Article collapses to a `+` icon button (`md:w-10 md:h-10 lg:w-full lg:px-4`)

### 6.2 / 6.3 / 6.4 — MobileNav (top bar + drawer + search expand)
- Created `src/components/MobileNav.tsx` as a Client Component
- Top nav bar (`flex md:hidden`, `h-12`): hamburger (opens drawer), "Knowledge Base" title, search icon, + icon
- Drawer: full-height `position: fixed` panel, `max-w-[280px]`, slides in from left with `transition-transform duration-200`. Contains full sidebar content (search, categories, New Article button)
- Backdrop: `fixed inset-0 bg-black/50` closes drawer on click
- Escape key closes drawer; route changes auto-close drawer (`useEffect` on pathname + searchParams)
- Body scroll lock: `overflow-hidden` toggled on `<body>` when drawer open
- Focus trap: first focusable element focused on open; Tab cycles within drawer; Escape closes
- Search expand: tapping search icon replaces top bar with full-width `SearchBar` + X button; `autoFocus` prop focuses the input immediately
- `SearchBar` given `id="drawer-search-input"` and `id="mobile-search-input"` to avoid duplicate IDs in the DOM

### 6.5 — Mobile article list and card adjustments
- `ArticleCard`: padding changed from `p-4` to `p-3 md:p-4`
- Article detail page: `max-w-[720px] mx-auto` changed to `md:max-w-[720px] md:mx-auto` (no constraint on mobile)
- Main layout already provides `p-4` on mobile for the article list container

### 6.6 — Mobile editor tabs
- `ArticleEditor.tsx`: detects mobile via `window.matchMedia('(max-width: 767px)')` with a `change` listener for dynamic resizing
- When `isMobile`: renders "Write" / "Preview" tab bar above the editor; active tab underlined with `--color-accent`; editor min-height set to 300px; `preview` prop passed as `'edit'` or `'preview'` based on active tab
- When desktop: split-pane mode (`preview="live"`) and min-height 400px unchanged

### 6.7 — Touch target verification
- Category nav links: updated to `py-3 lg:py-2` (48px height on mobile/tablet)
- Primary buttons: `h-11 md:h-10` on articles list page, Create form, Edit form
- MobileNav icon buttons: `minWidth: 44px; minHeight: 44px` via inline style
- Search clear button: changed to `right-0 top-1/2 -translate-y-1/2` with `minWidth: 44px; minHeight: 44px`

### Layout architecture change
- `layout.tsx` is now `async` — calls `listCategories()` once and passes result to both `Nav` and `MobileNav`
- Body flex changed to `flex flex-col md:flex-row` to support the mobile top-nav + content stacking
- `MobileNav` is wrapped in `<Suspense>` in the layout (required for `useSearchParams` in the Client Component tree during SSR)
- `SearchBar` now accepts optional `id` and `autoFocus` props to support multiple instances without duplicate IDs

### CategoryNav updates
- Imports and uses `CATEGORY_COLORS` (now exported from `CategoryBadge.tsx`)
- Each category link renders both a colored dot (`lg:hidden`) and text label (`hidden lg:inline`)
- "All Articles" shows a neutral dot at tablet; colored dot (using the category's palette color) for named categories
- Links use `justify-center lg:justify-start` to center at tablet, left-align at desktop

## Assumptions Made

- The colored dot for "All Articles" in collapsed tablet mode uses the accent color when active and muted color when inactive (no explicit color specified in the design spec for this case).
- `MobileNav` wraps `CategoryNav` directly without an additional Suspense boundary inside the drawer — since `MobileNav` is a Client Component, the `useSearchParams` in `CategoryNav` works without SSR concern. The outer `<Suspense>` in `layout.tsx` covers the initial server render.
- The `CATEGORY_COLORS` export from `CategoryBadge.tsx` is a minor API change but has no breaking consumers — `CategoryBadge` is only used as a component, not for its constants.
- "New Article" button in the sidebar uses `md:w-10 md:h-10` (not `md:h-11`) because the sidebar is only visible at tablet+, where 40px buttons meet spec (`h-11` is only required on mobile breakpoint).

## Issues Encountered

None — the build passes cleanly (`next build` with no errors or warnings).

## App Runs Locally

Build completes successfully. All 8 routes generate without error. The responsive flows work as follows:
- **Desktop (≥1024px)**: 240px sidebar with full text, split-pane editor
- **Tablet (768–1023px)**: 64px icon-only sidebar, colored dots, `+` icon for new article
- **Mobile (<768px)**: Top nav bar with hamburger/search/+ icons; hamburger opens full drawer; search expands inline; 12px card padding; editor in tab mode

## Decisions Log

| Decision | Rationale |
|---|---|
| `listCategories()` called once in layout, passed as props | Avoids duplicate DB calls; aligns with the iteration spec's recommended approach for sharing data between Nav and MobileNav |
| No separate `SidebarContent` component | Both Nav and MobileNav are small enough that duplicating the content structure is cleaner than introducing another abstraction. Nav is Server, MobileNav is Client — a shared component that works in both contexts would require it to be Client-only, losing Server Component benefits for Nav |
| `MobileNav` wrapped in `<Suspense>` in layout | Required when a Client Component using `useSearchParams` is rendered from a Server Component (the layout). Without it, Next.js throws a build warning/error |
| Colored dot uses `bg` color from `CATEGORY_COLORS` with border | More visually distinguishable than a plain colored dot; matches the badge palette so category identity is consistent across the UI |

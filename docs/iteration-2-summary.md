# Iteration 2 Summary: Core Design System & Persistent Shell

This document provides a comprehensive summary of the work completed during **Iteration 2** for the **v1 Simplified Knowledge Base App**.

---

## 1. What Was Built in This Iteration

We successfully implemented the visual design token system, standard modern styling resets, responsive layouts, the global app header, and the database-driven sidebar category navigation. 

Specifically, the following elements were introduced:
*   **CSS Design System & Token Declarations**:
    *   Created [src/styles/variables.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/styles/variables.css) housing complete slate (Light) and obsidian (Dark) HSL color schemas, 8pt spacing scales, radii tokens, shadow variables, typography sizes, and custom bezier curves.
    *   Created [src/styles/globals.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/styles/globals.css) setting up CSS resets, modern scrollbars, a11y focus rings (`box-shadow`), global font defaults, heading styles, and unified button/card hover behaviors.
*   **Persistent Global Layout Frame (RSC & CSR Composition)**:
    *   Created [src/app/layout.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/layout.tsx) acting as the main entry shell, declaring proper SEO metadata (titles, descriptions, icons) and configuring standard responsive viewport optimizations.
    *   Created [src/components/LayoutShell.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/LayoutShell.tsx) and its stylesheet [src/components/LayoutShell.module.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/LayoutShell.module.css). This Client Component wraps the header and layout grid, providing responsive sidebars, scrim overlays, hamburger icons, search controls, and keydown listeners.
*   **Persistent Header Banner**:
    *   Added LogoGroup showing the application branding "TeamKB" with redirect links.
    *   Built `searchWrapper` displaying a magnifying glass icon, keyboard shortcuts, and full-screen overlay expansions.
    *   Integrated primary "New Article" tech cobalt action triggers.
*   **Database-Driven Sidebar Navigation (React Server Component)**:
    *   Created [src/components/Sidebar.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.tsx) and [src/components/Sidebar.module.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.module.css). This Server Component reads categories directly from the SQLite database.
    *   Calculates dynamic article counts using Drizzle ORM aggregation, filtering for `published` documents.
    *   Renders an "Add Category" trigger button (`+`) inside the sidebar subheader.
    *   Created [src/components/CategoryLink.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/CategoryLink.tsx) - a client-side link wrapper that highlights categories dynamically based on active URL parameters without forcing layout re-renders.
*   **Multi-Frame Responsive Grid (Mobile Hamburger & Search Modal)**:
    *   **Desktop (>= 1024px)**: High-density side-by-side structures with persistent 260px sidebars.
    *   **Tablet (768px - 1023px)**: Restructured standard views with collapsible navigation drawers.
    *   **Mobile (< 768px)**: Hidden sidebars that slide out as overlays from the left screen edge. Touch targets scaled to at least **48px x 48px**. Search input transitions into a full-screen focus modal.

---

## 2. Verification & Run Outcomes

The entire codebase is in a fully functional, compilation-safe, and runnable state:

### 2.1 Production Compilation Validation
Running `npm run build` compiles the production package successfully under Turbopack without any TypeScript type mismatches, server/client boundary errors, or missing suspense boundaries:
```bash
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /articles

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### 2.2 Local Flow & Interaction Validation
*   **Theme Switching**: Switching between Light and Dark modes in the OS system changes variables smoothly, maintaining premium Obsidian/Slate contrast.
*   **Responsive Reflows**: 
    *   At **1440px (Desktop)**: Persistent sidebar fits cleanly; main content expands dynamically.
    *   At **800px (Tablet)**: Clicking the header's hamburger toggle triggers smooth drawer sliding.
    *   At **480px (Mobile)**: Hamburger menu slides from the left; clicking outside closes the drawer via background blur/scrim. Focusing search expands to a full-screen overlay correctly.
*   **Interactive Search Keys**: Pressing `Ctrl + K` or `Cmd + K` automatically highlights and focuses the global search bar on desktop. Clicking `Esc` blurs the input successfully.
*   **Database Counts Integration**: Sidebar items dynamically display published counts populated from Iteration 1 database seeds (e.g. Engineering, Product, Operations).

---

## 3. Assumptions Made & Issues Encountered

### 3.1 Next.js App Router useSearchParams Prerendering CSR Bailout (Resolved)
*   *Issue*: Using `useSearchParams()` inside `<LayoutShell>` and `<CategoryLink>` causes Next.js to de-optimize during static generation. During `next build`, pages like `_not-found` threw an error because they lacked a enclosing `<Suspense>` boundary.
*   *Solution*: Wrapped `<LayoutShell>` in a `<Suspense>` boundary inside the root `layout.tsx` file. This lets Next.js compile static files using loading fallbacks, rendering search hooks client-side after initial hydration.

### 3.2 React Server Component (RSC) to Client Event Serialization (Resolved)
*   *Issue*: Passing function event handlers (`onMouseOver`, `onMouseOut`) to Next.js's `<Link>` component inside the server-rendered `src/app/page.tsx` threw a compilation error during page serialization.
*   *Solution*: Removed the inline JavaScript events entirely. Re-implemented the premium hover animations using native CSS hover states (`:hover` and `:active` rules) in `src/styles/globals.css`, resolving compilation limits and improving styling standardizations.

---

## 4. Decisions Log

### 4.1 Hybrid Server/Client Sidebar Architecture
*   *Context*: Sidebar navigation items must render active category highlights dynamically based on search queries, but rendering the entire Sidebar as a Client Component would require REST endpoints or redundant DB APIs.
*   *Decision*: Crafted a hybrid Server/Client structure. `<Sidebar>` is a Server Component querying categories and aggregate published counts directly. Within the sidebar list, links render through the client-side `<CategoryLink>` wrapper. This lets us leverage server-side db aggregations while maintaining client-side styling hooks from URL queries.

### 4.2 Proportional SQLite Left Join Aggregate Counts
*   *Context*: Categories must show article counts for `published` articles only, but we must also render categories that have 0 published articles.
*   *Decision*: Implemented a clean Left Join SQL aggregate using `CAST(COUNT(CASE WHEN articles.status = 'published' THEN 1 END) AS INTEGER)`. This ensures categories without any published articles return 0 instead of being excluded from the list, resolving counts precisely.

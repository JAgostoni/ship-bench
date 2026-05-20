# Iteration 2: Core Design System & Persistent Shell

## Goal & Scope
Define the visual design system using adaptive HSL CSS variables, reset default browser styles, and build the persistent application framework shell (Header and Sidebar Navigation). This layout must dynamically adapt across Desktop, Tablet, and Mobile devices and support automatic system-driven Light and Dark color transitions.

At the end of this iteration, the developer will have a fully styled visual frame, database-driven category lists mounted in the sidebar with article counts, and responsive drawer transitions.

---

## Task Checklist

### 1. CSS Design Tokens & Adaptive Variables
- [ ] **Construct CSS Design Token File**:
  Create [src/styles/variables.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/styles/variables.css) containing the complete typography scales, 8pt spacing grid, shadow elevations, radii, and cubic-bezier transition curves:
  - Declare HSL theme colors for light mode (Premium Slate) under `:root`.
  - Declare matching HSL theme colors for dark mode (Deep Obsidian) under `@media (prefers-color-scheme: dark)`.
- [ ] **Configure Global Base Rules**:
  Create [src/styles/globals.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/styles/globals.css) importing variables and declaring global defaults:
  - Set modern system sans font families on the body, line-height `1.6`, letter-spacing `-0.011em`, and background-color matching adaptive tokens.
  - Implement a standard modern reset (box-sizing border-box, list style resets, link text decoration resets).

### 2. Persistent Layout Frame (App Shell)
- [ ] **Implement Dynamic Multi-Frame Grid**:
  Modify [src/app/layout.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/app/layout.tsx) to establish the application layout shell skeleton:
  - Add standard page metadata (descriptive title tags, viewport optimizations).
  - Wrap page routes in a semantic shell container (`shellContainer`) containing a persistent `<header>` and a layout grid wrapper (`layoutGrid`).
  - Configure the main content container (`<main id="main-content" class="mainPane" tabindex="-1">`) to receive dynamic route views.

### 3. Persistent Header Banner
- [ ] **Build Header UI Component**:
  Add structural branding and quick navigation hooks into the global header within `src/app/layout.tsx` (or as a separate component):
  - Add LogoGroup featuring a clean link redirecting home, an emoji badge (📚), and the app name "TeamKB".
  - Add global search container `searchWrapper` with a search magnifying glass icon, a placeholder `Search articles... (Ctrl+K)`, and a distinct keyboard badge reading `Ctrl K`.

### 4. Database-Driven Sidebar Navigation
- [ ] **Build Category Navigation Component**:
  Create [src/components/Sidebar.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.tsx) and its scoped styles [src/components/Sidebar.module.css](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.module.css):
  - Read active categories directly from the database using React Server Components.
  - Run SQL aggregation to calculate active article counts per category (e.g., matching category references where article status = `published`).
  - Render categories inside an HTML `<nav aria-label="Category Navigation">` list.
  - Apply distinct styles for selected categories: a soft cobalt accent background (`var(--accent-soft)`), cobalt border-left indicator, bold font weight, and deep cobalt text.
  - Render an "Add Category" trigger button (`+`) inside the sidebar subheader.

### 5. Responsive Adaptations & Mobile Hamburger
- [ ] **Implement Desktop, Tablet, and Mobile Stylesheets**:
  Write responsive CSS rules in global stylesheets and CSS Modules to restructure layouts dynamically:
  - **Desktop (>= 1024px)**: Display 3-column layout featuring persistent 260px sidebar navigation.
  - **Tablet (768px - 1023px)**: Restructure the layout using a collapsible sidebar toggled by an interactive button.
  - **Mobile (< 768px)**: Hide the sidebar behind an interactive hamburger menu. The menu must slide open from the left as an overlay drawer. Configure the global search input as a full-screen focus modal.
  - **Touch Targets**: Ensure touch targets are at least **48px x 48px** on devices smaller than 768px.

---

## Verification & QA Checkpoints

### 1. Developer Visual Audit
- Run the local development server:
  ```bash
  npm run dev
  ```
- Open a web browser to `http://localhost:3000`.
- Verify the persistent visual structure renders categories (Engineering, Product, Operations) and their counts populated by the database seeder in Iteration 1.

### 2. Layout & Theme Responsive Verification
- Open Browser DevTools, activate Responsive View, and verify layout structural changes at various viewport sizes:
  - **1440px (Desktop)**: Sidebar remains fixed at 260px; spacing is comfortable.
  - **800px (Tablet)**: Sidebar is collapsible; main content scales smoothly.
  - **480px (Mobile)**: Sidebar collapses into a hamburger icon. Clicking it slides the drawer in smoothly. The global search bar adapts dynamically.
- Toggle system light/dark mode and confirm colors adapt correctly, maintaining excellent reading contrast.

# UX/Design Direction Spec: Simplified Knowledge Base App

## 1. Visual Style System

The design language is calm, information-dense, and utilitarian. It prioritizes readability and structure over decorative elements. We rely on standard system fonts and a predictable 8px spacing grid to ensure the UI feels native and responsive.

### Tokens (CSS Variables for `globals.css`)

```css
:root {
  /* Color Palette */
  --color-bg-base: #F9FAFB;
  --color-bg-surface: #FFFFFF;
  --color-bg-subtle: #F3F4F6;
  
  --color-text-primary: #111827;
  --color-text-secondary: #4B5563;
  --color-text-muted: #9CA3AF;
  
  --color-border-default: #E5E7EB;
  --color-border-hover: #D1D5DB;
  
  --color-primary-base: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-subtle: #EFF6FF;
  
  --color-status-success: #10B981;
  --color-status-draft: #F59E0B;
  --color-status-danger: #EF4444;
  
  --color-focus-ring: rgba(37, 99, 235, 0.5);

  /* Typography */
  --font-family-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-family-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Spacing (8px grid) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  
  /* Borders */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

### Iconography
Use a standard, lightweight SVG icon set (e.g., Lucide or Heroicons). Required icons: Search, Plus (Add), Edit, Chevron Right, Document, Folder/Category, Check (Success), Alert Circle (Error).

---

## 2. Layout and Page Flows

The application relies on a persistent global layout and clear, linear navigation paths.

### Global Layout
- **Header:** Sticky top navigation containing:
  - Left: App Logo / Home link.
  - Center: Prominent Global Search Bar (expands on focus on desktop).
  - Right: "New Article" primary button.
- **Main Content Area:** Centered container, max-width `960px` for readability (except for the Editor view which expands wider).
- **Footer:** Minimal, containing standard meta links if necessary, or omitted for a web-app feel.

### Screen Wireflows

1. **Home / Browse (`/`)**
   - **Hero/Greeting:** Minimal welcome text.
   - **Category Grid/List:** Cards displaying Category Name, brief description, and article count.
   - **Recent Articles:** A list below categories showing the 5-10 most recently updated articles.
   - *Path:* Clicking a category -> Category Detail. Clicking an article -> Article Detail.

2. **Category Detail (`/categories/[slug]`)**
   - **Header:** Category Title, Description, and a "New Article in this Category" button.
   - **Article List:** Table or dense list view of articles (Title, Author, Last Updated, Status Badge for Drafts).
   - *Path:* Clicking an article -> Article Detail.

3. **Search Results (`/search?q=...`)**
   - **Header:** "Search results for '[Query]'"
   - **Results List:** Dense list showing Article Title, Category (as a small tag), and a highlighted snippet of the content match.
   - *Path:* Clicking a result -> Article Detail.

4. **Article Detail (`/articles/[slug]`)**
   - **Breadcrumbs:** `Home > Category > Article Title`
   - **Article Header:** Title, Metadata (Last updated date, Author), Status badge (if Draft), and an "Edit" secondary button.
   - **Content:** Markdown rendered content with standard typographic prose styling (max-width `65ch` for optimal reading line length).
   - *Path:* Click "Edit" -> Edit View.

5. **Article Create/Edit (`/articles/new` or `/articles/edit/[slug]`)**
   - **Header:** Action bar with "Cancel", Status Toggle (Draft/Published), Category Select dropdown, and "Save" primary button.
   - **Title Input:** Large, borderless input for the article title.
   - **Editor Workspace:** 
     - *Desktop:* 50/50 split pane. Left side: Markdown `<textarea>`. Right side: Live rendered preview.
     - *Mobile:* Tabs to switch between "Write" and "Preview".
   - *Path:* Save -> Redirect to Article Detail. Cancel -> Redirect back to previous screen.

---

## 3. Feature UX Decisions

### Search-First Navigation
Search is centrally located in the header because it is the primary way users will find information. 
- **Interaction:** Hitting `Enter` in the search bar navigates to `/search?q=value`. 
- **Empty State (No Query):** Hitting enter with an empty query should do nothing.

### Markdown Editor
- **Component Choice:** A plain `<textarea>` for raw input and a styled `<div>` using `react-markdown` for the preview.
- **Sync Scrolling:** (Stretch goal) Scrolling the textarea should ideally scroll the preview pane proportionally.
- **Font:** The textarea MUST use `var(--font-family-mono)` for clear structural alignment of markdown characters.

### Draft vs. Published Status
- **Visibility:** Drafts are visible to all internal users but are clearly badged with a yellow/amber `Draft` tag in list views and at the top of the detail view.
- **Editing:** When creating an article, default status is `Draft`. A toggle near the Save button allows switching to `Published`.

---

## 4. UI States

Developers must implement these states for all interactive elements:

- **Buttons (Primary):**
  - *Default:* `bg-primary-base`, `text-white`.
  - *Hover:* `bg-primary-hover`.
  - *Focus:* `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`.
  - *Disabled/Loading:* `opacity: 0.6`, cursor `not-allowed`.
- **Buttons (Secondary/Outline):**
  - *Default:* `bg-white`, border `color-border-default`, text `color-text-primary`.
  - *Hover:* `bg-bg-subtle`, border `color-border-hover`.
- **Inputs & Textareas:**
  - *Default:* border `color-border-default`.
  - *Focus:* border `color-primary-base`, `box-shadow: 0 0 0 3px var(--color-focus-ring)`.
  - *Error:* border `color-status-danger`.
- **Empty States:**
  - *No Search Results:* Centered illustration/icon, text "No results found for '[Query]'", and a button "Clear search".
  - *Empty Category:* Text "There are no articles in this category yet.", button "Create the first article".
  - *Empty State Container:* `bg-bg-subtle`, dashed border, padding `var(--space-8)`, text centered, `text-muted`.

---

## 5. Responsive Design

The application is mobile-first, adapting gracefully to larger screens.

- **Mobile (< 768px):**
  - Global padding: `var(--space-4)`.
  - Header search bar collapses to a search icon that expands a full-width input when tapped.
  - Editor becomes a tabbed interface (Write | Preview) to maximize screen real estate for the keyboard.
  - Interactive touch targets: Minimum `44px` height (Buttons, Inputs, Links).
- **Tablet (768px - 1024px):**
  - Global padding: `var(--space-6)`.
  - Two-column grids for categories.
- **Desktop (> 1024px):**
  - Global padding: `var(--space-8)`.
  - Editor transitions to a side-by-side split pane.
  - Maximum content width enforced (`960px`) to prevent excessively long lines of text.

---

## 6. Accessibility (a11y)

- **Contrast:** All text colors specified in the tokens meet WCAG AA requirements (e.g., `--color-text-secondary` against `--color-bg-surface`).
- **Keyboard Navigation:** 
  - All interactive elements must be reachable via `Tab`.
  - Focus rings MUST be visible. Do not use `outline: none` without providing a robust custom `box-shadow` focus state.
- **Screen Readers:**
  - Search input requires `aria-label="Search articles"`.
  - Icon-only buttons (if any) require `aria-label`.
  - The main content area must be wrapped in a `<main>` tag.
  - Use semantic heading levels (`<h1>` through `<h4>`) strictly for document structure, not just for sizing. The Article Title is always `<h1>`.

---

## 7. Handoff Notes

- **CSS Implementation:** Use standard CSS Modules (`.module.css`). Map the provided CSS variables to local classes. Avoid deep nesting or complex selectors; keep it flat and utility-like where possible.
- **Typography Prose:** Create a global or modular `.prose` class specifically for the Markdown preview and Article Detail views that automatically spaces out paragraphs (`margin-bottom: 1em`), styles blockquotes (left border, muted text), and formats inline code (monospaced, subtle background).
- **Forms:** We rely on native HTML5 validation (e.g., `required` attributes) enhanced by Server Actions for the v1 MVP. Do not over-engineer client-side validation libraries unless necessary.

---

## 8. Decisions Log

1. **Vanilla CSS & Variables over Tailwind:** Chose to stick to standard CSS variables and CSS modules to align with the technical brief's requirement to avoid Tailwind. This forces a clean, semantic markup structure and demonstrates strong CSS fundamentals.
2. **Tabbed vs. Split-Pane Editor:** A split-pane is vastly superior for Markdown authoring, but unusable on mobile. We explicitly define a responsive shift (Split on Desktop, Tabs on Mobile) to balance developer ergonomics with responsive non-functional requirements.
3. **No Complex WYSIWYG:** We opted for a raw `<textarea>` with a Markdown preview. This guarantees stability, eliminates cross-browser content-editable bugs, drastically reduces bundle size, and fits the technical mandate for simplicity and developer velocity.
4. **System Fonts:** Chose system fonts over loading external web fonts (like Inter or Roboto) to maximize Time to Interactive (TTI), reduce layout shifts, and provide a familiar, native-feeling "calm" interface.
# UX/Design Direction Spec: Simplified Knowledge Base App

## 1. Layout and Page Flows

### General Layout Strategy
The app uses a **Search-First, Two-Pane** approach. A global, sticky header contains the primary navigation and search. Content areas prioritize high information density and readability.

### Page Flows & Wireflows

#### Flow A: Discovery (Home $\rightarrow$ Search $\rightarrow$ Detail)
1. **Home Page (`/`)**:
   - **Header**: Logo (left), Global Search Bar (center), "New Article" Button (right).
   - **Main Content**: 
     - "Recent Articles" section: A dense list of cards showing title, author, and last updated date.
     - Empty State: If no articles exist, a centered "Get Started" call-to-action.
2. **Search Interaction**:
   - User types in Global Search $\rightarrow$ Immediate redirect/filter to `/articles?q=query`.
   - **Search Results Page**: List of articles with highlighted search terms in titles/snippets.
3. **Article Detail (`/articles/[slug]`)**:
   - **Layout**: Single column centered content (max-width 800px) for readability.
   - **Elements**: Breadcrumbs $\rightarrow$ Title $\rightarrow$ Metadata (Author, Date) $\rightarrow$ Markdown Content.
   - **Actions**: "Edit" button (top right).

#### Flow B: Content Creation/Maintenance (New/Edit $\rightarrow$ Detail)
1. **Create New (`/articles/new`)**:
   - **Layout**: Split-pane view.
   - **Left Pane**: Form fields (Title) + Markdown Textarea.
   - **Right Pane**: Live Preview (Rendered HTML).
   - **Actions**: "Cancel" and "Save" (bottom right).
2. **Edit Article (`/articles/[slug]/edit`)**:
   - Same layout as Create New, pre-populated with existing content.
3. **Exit Point**: Saving redirects user back to the Article Detail page.

---

## 2. Feature UX Decisions

### Global Search
- **Interaction**: "Type-to-filter" feel. Search is the primary way to move through the app.
- **State**: 
  - *Active*: Focus ring around search input.
  - *Empty Results*: "No articles found matching '[query]'" with a "Clear search" button.

### Markdown Editor (Split-Pane)
- **Interaction**: Synchronized scrolling between the editor and the preview pane.
- **Component**: Standard `<textarea>` for input to avoid complex WYSIWYG bugs, paired with a `react-markdown` renderer.
- **Edge Case**: Very long articles. The preview pane must have an independent scrollbar or be synced to the editor's scroll position.

### Article Browsing
- **Component**: Dense list/table. Avoid large "hero" cards. Use a list format: `[Title] | [Author] | [Date]`.
- **Transitions**: Hover states on list items to indicate clickability.

---

## 3. Responsive Design

### Breakpoints
- **Desktop ($\ge 1024$px)**: Two-pane editor, wide header, centered reading column.
- **Tablet ($768$px to $1023$px)**: 
  - Editor: Switch from side-by-side to **Tabbed View** (Edit $\leftrightarrow$ Preview) to preserve text area width.
  - Header: Search bar expands to fill available space.
- **Mobile ($< 768$px)**:
  - Navigation: Simple hamburger menu for "New Article" and "Browse".
  - Layout: Single column. Search bar becomes a full-width input on focus.
  - Touch Targets: All buttons and links minimum $44\text{px} \times 44\text{px}$.

---

## 4. Visual Style System

### Color Palette (Calm & Professional)
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--color-bg` | `#F9FAFB` | Main background (Slate 50) |
| `--color-surface` | `#FFFFFF` | Cards, modals, panels |
| `--color-text-primary` | `#111827` | Headings, primary body text (Slate 900) |
| `--color-text-secondary`| `#4B5563` | Metadata, placeholders (Slate 600) |
| `--color-primary` | `#2563EB` | Primary buttons, links, focus rings (Blue 600) |
| `--color-border` | `#E5E7EB` | Dividers, input borders (Slate 200) |
| `--color-error` | `#DC2626` | Error messages, destructive actions (Red 600) |

### Typography Scale (Sans-Serif Stack)
- **Font Family**: `Inter, system-ui, sans-serif`
- **Scale**:
  - `h1`: $30\text{px}$ / SemiBold / Leading $1.2$ (Article Titles)
  - `h2`: $24\text{px}$ / SemiBold / Leading $1.3$ (Section Headers)
  - `body`: $16\text{px}$ / Regular / Leading $1.5$ (Standard Text)
  - `small`: $14\text{px}$ / Regular / Leading $1.4$ (Metadata, Captions)

### Spacing & Layout
- **Base Unit**: $4\text{px}$
- **Scale**: `xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`
- **Page Padding**: $24\text{px}$ (mobile), $48\text{px}$ (desktop)

---

## 5. UI States

| Element | Default | Hover | Focus | Loading | Disabled | Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Button** | Primary Blue | Darker Blue | Blue + Ring | Spinner | Gray-200 | Red-600 |
| **Input** | Border Slate-200 | Border Slate-300 | Border Blue-600 | N/A | BG Gray-100 | Border Red-600 |
| **List Item**| White BG | Slate-50 BG | Ring-1 Blue | Skeleton | N/A | N/A |
| **Editor** | White BG | N/A | Ring-2 Blue | N/A | BG Gray-100 | Red border |

---

## 6. Accessibility

- **Contrast**: All text/background combinations must meet WCAG AA (min $4.5:1$).
- **Keyboard Navigation**:
  - `Tab` order: Header $\rightarrow$ Search $\rightarrow$ Main Content $\rightarrow$ Footer.
  - `Enter` to activate search results and buttons.
  - `Esc` to clear search or close modals.
- **Focus Order**: Visual focus rings (`outline-2 outline-offset-2`) must be highly visible on all interactive elements.
- **Screen Readers**:
  - Use `aria-label` for the search input ("Search knowledge base").
  - Use semantic `<main>`, `<nav>`, and `<article>` tags.
  - Form errors must be linked to inputs via `aria-describedby`.

---

## 7. Handoff Notes

### Component Guidance
- **GlobalSearch**: Use a controlled input. Implement a debounce ($300\text{ms}$) before triggering navigation or filtering.
- **MarkdownPreview**: Use `prose` classes from `@tailwindcss/typography` to ensure consistent spacing and sizing of rendered Markdown elements.
- **SplitPane**: Use a flex-row layout on desktop. Set `overflow-y-auto` on both the editor and preview containers.

### CSS Variable Suggestions
```css
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --bg-main: #f9fafb;
  --text-main: #111827;
  --text-muted: #4b5563;
  --border-main: #e5e7eb;
  --radius-md: 6px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
```

---

## 8. Decisions Log

- **Markdown vs WYSIWYG**: Chose Markdown for reliability and lower implementation friction. To mitigate the "learning curve," a live preview pane is provided.
- **Two-Pane Editor**: Prioritized immediate feedback (live preview) over a full-screen editor to reduce the need for frequent "Save & View" cycles.
- **Search-First Home**: Decided against a complex category landing page. For a small team ($\sim 100$ users), a global search and "Recent" list provide the fastest path to information.
- **Information Density**: Opted for a list-based browsing experience rather than a grid of cards to maximize the number of articles visible on screen without scrolling.

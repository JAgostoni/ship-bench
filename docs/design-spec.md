# UX/Design Direction Spec: Knowledge Base App

## 1. Overview
The design focuses on a **"Search-First, Read-Focused"** experience. The aesthetic is "Cinematic Monolith": clean, high-contrast, information-dense, and professional. It prioritizes utility and speed over decorative elements.

## 2. Layout and Page Flows

### 2.1. Global Shell
- **Navigation**: A persistent left sidebar (desktop) or bottom-docked bar (mobile) for quick access to "Home", "Categories", and "New Article".
- **Search Bar**: A prominent search input at the top of the content area or sidebar.

### 2.2. Page Flows

#### Flow A: Browse & Search (Home)
- **Entry**: User lands on the home page.
- **Layout**: 
  - **Sidebar**: List of categories and recent tags.
  - **Main Content**: A search bar followed by a list of "Latest Articles" or "Search Results".
- **Interaction**: 
  - Clicking an article card navigates to the Article Detail page.
  - Typing in the search bar dynamically filters the list (debounced).
  - Clicking a category/tag filters the list.

#### Flow B: Read Article (Detail)
- **Entry**: From Home or Search results.
- **Layout**: 
  - **Main Content**: Article title, metadata (author, date, category, status badge), and the rendered Markdown content.
  - **Actions**: "Edit" button for content owners.
- **Interaction**: 
  - Back button to return to the previous list/search context.

#### Flow C: Create/Edit Article
- **Entry**: "New Article" button or "Edit" button on an article.
- **Layout**: 
  - **Two-Pane Editor**: Left pane for Markdown input (monospace font); right pane for live preview (rendered Markdown).
  - **Meta Pane**: Sidebar for title, category selection, tags, and status (Draft/Published).
- **Actions**: "Save", "Cancel", "Delete" (if editing).

---

## 3. Feature UX Decisions

### 3.1. Search-First Navigation
- **Interaction**: Search should be accessible via a global shortcut (e.g., `Cmd/Ctrl + K`).
- **Results**: Show "Live" results as the user types. Highlight matching terms in the title and excerpt.
- **Empty State**: Clear "No results found" with a suggestion to clear filters or try a different term.

### 3.2. Markdown Editor
- **Input**: Standard `<textarea>` with line-numbering simulation (optional but helpful).
- **Preview**: Real-time rendering using `react-markdown`.
- **Sync**: Scroll-sync between input and preview panes.
- **Keyboard**: Support `Cmd/Ctrl + S` to save.

### 3.3. Article Status Badges
- **Draft**: Neutral gray border/text.
- **Published**: Subtle green border/text.
- **Visuals**: Low-key, not distracting from the content.

---

## 4. Responsive Design
- **Breakpoints**:
  - **Mobile**: < 768px (Single column, hidden sidebar behind hamburger or bottom nav).
  - **Tablet/Desktop**: >= 768px (Sidebar visible, dual-pane editor).
- **Touch Targets**: Minimum 44x44px for all interactive elements on mobile.
- **Navigation**: Move primary actions to a sticky header or footer on mobile for thumb accessibility.

---

## 5. Visual Style System

### 5.1. Color Palette (CSS Variables)
```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-border: #e5e7eb;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-success: #059669;
  --color-draft: #9ca3af;
  --color-error: #dc2626;
  --color-focus-ring: rgba(37, 99, 235, 0.5);
}
```

### 5.2. Typography
- **Font Stack**: `Inter`, `Geist`, or system sans-serif.
- **Monospace**: `JetBrains Mono` or `Fira Code` for the editor.
- **Scale**:
  - `h1`: 2rem / 32px (Bold)
  - `h2`: 1.5rem / 24px (Semi-bold)
  - `body`: 1rem / 16px (Regular)
  - `small`: 0.875rem / 14px (Regular)

### 5.3. Spacing & Grid
- **Grid**: 4px base unit.
- **Spacing**: `4px`, `8px`, `16px`, `24px`, `32px`, `48px`.
- **Radius**: `4px` (Small), `8px` (Large).

---

## 6. UI States

| Element | Default | Hover | Focus | Active/Selected | Disabled |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Button (Primary)** | Solid Blue | Darker Blue | Blue Ring | Darkest Blue | Grayed out |
| **Link** | Underlined Blue | No Underline | Ring | - | - |
| **Input** | Gray Border | Darker Gray | Blue Ring | - | Light Gray |
| **Article Card** | White Bg | Subtle Gray Bg | - | - | - |

---

## 7. Accessibility
- **Contrast**: All text must pass WCAG 2.1 AA (4.5:1 for normal text).
- **Keyboard**: Visible focus rings on all interactive elements. Tab order follows logical page flow (Search -> Sidebar -> Main Content).
- **Aria**:
  - `aria-label` for icon-only buttons.
  - `aria-expanded` for sidebar toggles.
  - `role="main"` for primary content.
  - `role="search"` for the search form.

---

## 8. Handoff Notes
- **CSS Variables**: Use the tokens defined in Section 5.1.
- **Icons**: Use `Lucide React`.
- **Skeleton Screens**: Use a 10% opacity gray block for loading states in lists and article headers.
- **Transitions**: 150ms `ease-in-out` for hover/focus states.

---

## 9. Decisions Log
- **Why Two-Pane Editor?**: Provides the best balance between Markdown's speed and visual feedback for non-technical users.
- **Why Sidebar Navigation?**: Better for "Information-Dense" applications; allows categories to be always accessible.
- **Why Search-First?**: In a knowledge base, users usually come with a specific question. Search is the fastest path to the answer.

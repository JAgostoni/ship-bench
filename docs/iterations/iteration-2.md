# Iteration 2: Read Flow

## Goal
Implement the core article browsing experience, including the home page list and detailed article views.

## Scope
- API endpoints for listing and fetching articles.
- Home page with article list and category sidebar.
- Article Detail page with Markdown rendering.
- Layout and Navigation components.

## Tasks
1. **API: Read Endpoints**:
   - Implement `GET /api/articles` with pagination and category filtering.
   - Implement `GET /api/articles/:slug` to fetch a single article by its slug.
2. **Web: Global Layout**:
   - Create a `Layout` component with the persistent sidebar as per `design-spec.md`.
   - Add navigation for "Home" and a list of categories in the sidebar.
3. **Web: Home Page**:
   - Create `ArticleCard` component for the list view.
   - Fetch and display the latest articles using `TanStack Query`.
   - Implement "Skeleton Screens" for loading states.
4. **Web: Article Detail Page**:
   - Implement dynamic routing for `/articles/:slug`.
   - Fetch article data and render Markdown using `react-markdown` and `shiki` for code highlighting.
   - Add a "Back" button and metadata display (date, category).
5. **Web: Navigation**:
   - Implement category filtering by clicking category links in the sidebar.
   - Ensure the URL updates with query parameters (e.g., `?category=slug`).

## Notes
- Focus on the "Cinematic Monolith" aesthetic: high contrast, clean typography, and information density.
- Use Vanilla CSS Modules for all component styling.

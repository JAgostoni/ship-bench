# Iteration 1 Summary

**Built**
- Initialized npm project and installed core dependencies (Next.js 16, React 19, Tailwind CSS 4, Prisma, Next‑Auth, React‑Query, Zod, React‑MDE, Jest, Playwright).
- Added TypeScript configuration (`tsconfig.json`).
- Configured Tailwind (`tailwind.config.cjs`) and PostCSS (`postcss.config.cjs`).
- Created global CSS with design tokens.
- Scaffolded Next.js App Router with `layout.tsx` and a placeholder home page.
- Defined Prisma schema with `Article` model and ran initial migration, generating Prisma client.
- Added `.env.example`, README with setup instructions, and useful npm scripts (dev, build, lint, format, test).
- Verified dev server starts (`npm run dev`).

**Assumptions / Issues**
- Switched markdown editor to `@uiw/react-md-editor` because `react-mde` required React 16.
- Used `next-auth@4.24.15` (latest stable) instead of a non‑existent version 5.
- Tailwind and PostCSS configs follow the design spec tokens.
- No UI components beyond the placeholder page are required for this iteration.

**Verification**
- `npm run dev` launches the app at http://localhost:3001 with no errors.
- Prisma client generated and DB initialized (`dev.db`).
- All scripts run successfully.

**Decisions Log**
- Chose `@uiw/react-md-editor` for markdown editing (compatible with React 19).
- Adopted `next-auth@4` as the stable credential auth provider.
- Added `npm run format` using Prettier (pre‑installed via dev dependencies).

---
*Iteration 1 is complete. Ready for the next iteration.*
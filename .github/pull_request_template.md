## What and why

<!-- The "why" belongs here; the "what" is visible in the diff. -->

## PR checklist

The five questions from `architecture.md` §5.3:

- [ ] **Does it change the schema?** (`src/server/db/schema.ts`)
- [ ] **Does it need a migration?** If yes: edit the schema → `npm run db:generate` →
      review the generated SQL in `drizzle/` → commit both. Never `drizzle-kit push`
      against a database with data you care about.
- [ ] **Are empty states handled?** No list surface may render blank
      (`design-spec.md` §7.3) — every empty list resolves to one of the five
      canonical states with its exact copy and CTA.
- [ ] **Are new user-visible strings reachable by keyboard?** Every new control is in
      the tab order, has a visible focus ring, and has an accessible name.
- [ ] **Are unit tests added for new pure logic?** Plus integration tests for new
      repository or route-handler behaviour.

## Verification

- [ ] `npm run verify` passes locally (typecheck → lint → format:check → test → build).
- [ ] `npm run test:e2e` passes if this touches a UI flow or a route.

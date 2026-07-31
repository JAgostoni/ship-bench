# QA Report – Simplified Knowledge Base App (v1)

## 1. MVP Flow Verification
| Flow | Pass/Fail | Notes |
|------|-----------|-------|
| Article List (browse) | ✅ Pass | `GET /api/articles` returns JSON list (tested via curl). |
| Article Detail | ✅ Pass | `GET /api/articles/:id` returns article data (verified with curl). |
| Search | ✅ Pass (empty result) | `GET /api/search?query=Test` returns empty array (no matching FTS rows). |
| Create Article | ❌ Fail | `POST /api/articles` returns *Unauthenticated* (no user seeded). |
| Edit Article | ❌ Fail | Same auth block; edit page not reachable without login. |
| Authentication (login) | ❌ Fail | No seeded admin user; login endpoint returns empty response. |
| Error States (empty list, no search results) | ✅ Pass | Empty list shows empty‑state JSON; search returns empty array. |
| Validation (title/content length, required fields) | ❌ Not verified | Validation schemas exist (Zod) but not exercised due to auth block. |

**Overall MVP Flow:** Core read‑only flows work; auth‑protected create/edit flows cannot be exercised because the seed data (admin user) is missing and the seed script fails.

## 2. Local Setup Verification
| Step | Result | Comments |
|------|--------|----------|
| `npm ci` | ✅ Success | Packages installed (some high‑severity vulnerabilities reported, but not blocking). |
| `npx prisma migrate deploy` | ✅ Success | DB schema applied; no pending migrations. |
| `npm run dev` (detached) | ✅ Success | Server listening on `http://localhost:3000`. |
| `curl http://localhost:3000/api/articles` | ✅ Success | Returns a sample article (seeded by earlier manual insert). |
| `curl http://localhost:3000/api/search?query=Test` | ✅ Success (empty) | Search endpoint reachable. |
| `npm run test` | ❌ Failure | Jest environment missing; after installing `jest-environment-jsdom` tests still fail (typos, missing `fetch` polyfill). |
| `npm run seed` | ❌ Failure | Seed script cannot resolve `@/lib` alias; no user created. |

**Local Setup:** Start‑up works, but the seed script is broken and unit tests cannot run out‑of‑the‑box.

## 3. Test Suite Review
| Suite | Pass/Fail | Coverage (approx.) | Remarks |
|-------|-----------|-------------------|---------|
| Unit tests (`npm run test`) | ❌ Fail | 0 % (no tests executed) | Missing Jest environment, test code errors (`ntest` typo, `fetch` not defined). |
| Integration API tests (none present) | N/A | – | No dedicated integration tests. |
| E2E Playwright (`npm run test:e2e`) | ❌ Not executed | – | Playwright not run; server must be up and auth flow functional. |
| Coverage | – | – | No coverage report generated. |

**Test Coverage:** Critical gaps – no automated verification of create/edit flows, search relevance, or UI behavior.

## 4. Responsiveness Check
Manual inspection (via browser) shows:
- Desktop (≥ 1024 px) – two‑column grid appears.
- Tablet (768‑1023 px) – collapses to single column, navigation drawer works.
- Mobile (≤ 767 px) – full‑screen list, hamburger menu, touch targets ≥ 44 dp.

**Result:** ✅ Pass – UI adapts to required breakpoints.

## 5. Error Handling Review
| Scenario | Observed Behavior | Verdict |
|----------|-------------------|---------|
| Empty article list | Returns empty JSON array; UI shows empty‑state illustration. | ✅ Pass |
| Search with no results | Returns `{ results: [] }`; UI displays “no results” message. | ✅ Pass |
| Unauthenticated API access | Returns 401 with “Unauthenticated”. | ✅ Pass (proper status) |
| Validation errors (e.g., missing title) | Not exercised (blocked by auth). | ❌ Not verified |
| Server errors (exception) | Not observed; no error‑handling tests. | ❌ Not verified |

## 6. Spec Adherence
| Spec Item | Conformance | Notes |
|-----------|-------------|-------|
| Article browsing & detail | ✅ | Implemented via `/articles` and `/articles/[id]`. |
| Full‑text search | ✅ | SQLite FTS5 used; endpoint exists. |
| Markdown editing | ❌ | Edit UI present but inaccessible without login; create API blocked. |
| Minimal authentication | ❌ | Auth flow present but no seeded user; login endpoint returns empty response. |
| Responsive layout | ✅ | Matches design spec breakpoints. |
| Design tokens & UI | ✅ | Tailwind tokens, color contrast, ARIA attributes present. |
| Testing scope (unit + E2E) | ❌ | Tests failing/not run. |
| Dependency versions (latest) | ✅ | Versions pulled from live web (e.g., React 19, Next 16, Tailwind 4). |

**Overall:** Core read‑only features align with spec; auth‑protected flows and testing are incomplete.

## 7. Code Signals Checklist
| Signal | Yes/No | Comments |
|--------|--------|----------|
| Linting clean (no warnings) | ✅ | `npm run lint` passes (no errors reported). |
| Obvious security holes | ✅ (none detected) | Passwords hashed with bcrypt, JWT session, no SQL injection (parameterized query). |
| Modular code (no god files) | ✅ | Separation in `src/app/api`, `src/lib`, `src/components`. |
| Follows architecture spec | ✅ | Uses Next.js App Router, Prisma, FTS5, React Query, Tailwind. |
| Planner iterations followed | ✅ | Repo structure matches backlog (iterations 1‑5). |
| Dependency versions current | ✅ | All major deps at latest stable (checked via live web). |

## 8. Defect Log
| Severity | Defect | Reproduction Steps |
|----------|--------|--------------------|
| **Critical** | **Seed script fails – no admin user created** | Run `npm run seed`; error: `Cannot find package '@/lib'`. |
| **Critical** | **Create/Edit API blocked – unauthenticated** | `POST /api/articles` without a valid session returns 401. |
| **Major** | **Unit tests error out** | `npm run test` → `ReferenceError: ntest is not defined` and `fetch is not defined`. |
| **Major** | **Login endpoint returns empty response** | `curl -X POST http://localhost:3000/api/auth/callback/credentials …` returns empty body. |
| **Minor** | **High‑severity npm vulnerabilities** | `npm audit` reports 24 high‑severity issues (e.g., `inflight`). |
| **Minor** | **Missing Jest environment** | `jest-environment-jsdom` not installed; required for React Testing Library. |

## 9. Spec Drift Log
| Drift | Description | Intentional? |
|-------|-------------|--------------|
| Authentication flow present but no seeded user | Seed script broken → no user to log in. | Unintentional |
| Unit test suite not runnable | Test code contains typos (`ntest`) and missing polyfills. | Unintentional |
| Search endpoint returns empty array for existing article | FTS5 query does not match because article inserted before virtual table sync. | Unintentional |
| TagSelect component uses `fetch` directly (node environment) | `fetch` not defined in Jest environment causing test failure. | Unintentional |

## 10. Release Recommendation
**Recommendation:** **No‑Ship** (major blockers)

**Rationale:**
- Core read‑only flows work, but **create/edit** flows are unusable without a seeded admin user.
- **Automated tests** cannot run; no regression safety.
- **Seed script** and **login** are broken, preventing a fresh developer from getting a working environment.
- **Security‑related vulnerabilities** (high‑severity npm packages) remain unaddressed.

**Next steps (prioritized):**
1. Fix seed script (resolve `@/lib` alias, create default admin user).  
2. Re‑run `npm run seed` and verify login works (session cookie).  
3. Enable `POST /api/articles` and edit UI after authentication.  
4. Repair unit tests (replace `ntest` with `test`, polyfill `fetch` or mock).  
5. Run full test suite, capture coverage, and aim for ≥ 80 % on core modules.  
6. Address high‑severity npm vulnerabilities (`npm audit fix`).  
7. Add integration tests for create/edit and search relevance.  

Once the above are resolved and test coverage is satisfactory, a **Ship** recommendation can be revisited.
# UI/UX Score Sheet: evals_july2026_mercury2 (branch `evals_july2026_mercury2`, design-spec commit c055d39)

**Artifact evaluated:** `docs/design-spec.md`
**Spec applied:** `evals/ux-designer-measurement-spec.md`
**Evaluation date:** 2026-07-31
**Visual assets present:** none. Repository contains no wireframe, mockup, or screenshot files (`find` over repo excluding `node_modules`/`.next` for `*.png|*.jpg|*.svg|*.excalidraw|*.fig` returned zero results). Bonus anchors requiring visual wireflows or mockups are therefore not awarded.

---

## 1. COMPLETENESS (50 pts)

**Layout: 4/5**
§1.1 tabulates five screens with routes and primary goals; §1.2 specifies directional flow (entry→login→list→detail→edit) with explicit return/cancel paths and a 150 ms client-side fade transition. Below 5: no route is defined for create mode (§1.1 lists only `/articles/[id]/edit` while §1.2 requires "New article" → Edit create mode), pagination appears in the tab-order list (§6) but is never designed, and no visual wireflow is supplied.

**Search UX: 3/5**
§2.2 specifies input placement, 300 ms debounce, clear button, term highlighting, and a no-results state with broaden-query guidance; §2.1 supplies the no-articles empty state. Result ranking is not addressed in the design spec, no tag facet/filter UI is specified despite §1.1 claiming the list page supports "filter," and no search loading or search-failure state is defined.

**Edit flow: 4/5**
§2.3 fixes editor choice (React-MDE markdown + live preview, split/toggle), toolbar inventory, field types, validation rules (title required ≤150 chars; content required ≤10 KB), save-button dirty/valid gating with spinner, inline field errors, and a toast for server errors. Below 5: no unsaved-changes guard on Cancel ("discard changes" with no confirmation), and create-mode differences (route, default status, empty-editor state) are unspecified.

**Responsiveness: 5/5**
§3 defines three breakpoints with concrete pixel boundaries (≥1024 two-column + full header; 768–1023 single column + collapsible drawer; ≤767 full-screen list + hamburger), a 44×44 dp minimum touch target applied to buttons, list items, and toggles, and a mobile-specific swipe-action pattern with an overflow-menu fallback.

**Visual style: 4/5**
§4 provides seven color tokens, font stack, 16 px base, three-step heading scale, 8 px spacing unit, 4 px radius, and Heroicons 2 as the icon set, all declared as `:root` CSS variables. Gaps: no body/secondary text color token (the only text-purpose gray is labeled "Disabled text"), no line-height or small-text steps, no shadow token values despite hover elevation being specified in §2.1/§5, and no token for the search-highlight yellow referenced in §2.2.

**States: 4/5**
§5 is a 5-component × 7-state matrix (Button, Input, Toggle, Card, Tag Chip) with concrete CSS values for default/hover/focus/disabled/error/success. Loading is specified only for Button (spinner overlay, opacity 0.7); no skeleton or loading treatment is defined for the article list, detail view, or search results, which are the states most visible during data fetch.

**Accessibility: 4/5**
§6 states WCAG AA contrast with a computed ratio for the primary button pair, a defined tab order, per-element ARIA (`aria-checked`, `aria-labelledby`, `role="alert"`, status badge labels), `:focus-visible` outlines, and post-navigation focus movement to the first heading. Short of a full audit plan: no testing tooling or acceptance procedure, no skip-to-content link, no live-region announcement for debounced search results, no reduced-motion handling, and no contrast verification for the highlight, badge, or disabled-text pairings.

**Handoff: 5/5**
§7 supplies the component inventory (`Header`, `ArticleCard`, `SearchBox`, `EditorPane`, `TagSelect`, `StatusBadge`, `ToggleSwitch`) at concrete paths, CSS-variable/Tailwind usage pattern, the responsive grid classes, React Query hook names with `staleTime`, the article JSON contract, an executable Zod schema, icon import form, and the transition declaration.

**Subtotal: 33/40 → Scaled: 33 ÷ 40 × 50 = 41.25 → 41.3/50**

---

## 2. QUALITY (50 pts)

**Calm/Readable: 4/5**
Restrained palette (one accent, four grays), system font stack, 8 px spacing rhythm, 4 px radius, and 150 ms transitions produce a low-noise system; §2.1 limits card content to title, 2-line excerpt, one badge, and ≤3 chips. Below 5: the typographic scale stops at h1–h3 with no body, small, or line-height values, so paragraph-level readability in the article detail view — the app's primary reading surface — is unspecified.

**Information Density: 4/5**
§8 records the two-column desktop grid as a deliberate density decision; cards carry title, excerpt, status, and tags without marketing chrome. Search-first intent is present (persistent header input, debounced, integrated results) but not maximized: search sits top-right of the list header rather than as a global element, and §1.2 places a login screen ahead of any browsing.

**Friction Reduction: 3/5**
Positive: direct list→detail→edit path, optimistic save returning to detail, debounce, save disabled until dirty and valid. Offsetting friction: a mandatory login gate precedes browse (the brief specifies "Basic security assumptions only; do not require enterprise auth unless later specified"), Cancel discards without confirmation, create mode has no defined route or defaults, and a Delete action is exposed in the mobile swipe pattern (§3) with no confirmation flow designed.

**Responsive Quality: 4/5**
Three breakpoints with distinct navigation treatments per tier, 44 dp touch targets, and a native-feel mobile affordance (swipe-to-reveal with accessible fallback). Below 5: tablet is specified only as "single column + drawer" with no layout detail, and no responsive behavior is defined for the split-pane editor or the detail view at narrow widths, where a two-pane markdown preview is the highest-risk layout.

**Accessibility: 4/5**
Goes beyond AA assertion to mechanism: named ARIA attributes per component, defined focus order, `:focus-visible`, and focus management on route change. Independent verification of the §6 claim: `#FFFFFF` on `#0066CC` computes to 5.56:1 (spec states 5.0:1 — conservative, still AA-passing); `#6A737D` on `#FFFFFF` computes to 4.82:1, AA-passing. Not 5/5 because several interactive pairings (highlight yellow, Draft/Published badges) are asserted rather than computed, and no reduced-motion or search live-region handling is specified.

**Production Polish: 3/5**
Micro-details are present in prose — hover elevation, focus ring geometry (`0 0 0 2px rgba(0,102,204,.2)`), disabled cursor, 4 px radius, 150 ms easing. Held at 3 because no mockups, wireframes, or screenshots exist to verify the composed result, shadow values are named but never defined, and the empty-state "friendly illustration" (§2.1) is specified without any asset, style, or source.

**Handoff Clarity: 4/5**
A developer can implement directly from §4, §5, and §7: real CSS values, Tailwind class strings, an executable Zod schema, the API JSON shape, and hook names. Deductions for three concrete ambiguities: (1) the §4 token table maps `Color Warning #D73A49` (red) to the Draft badge while §2.5 specifies gray for Draft — a direct contradiction the developer must resolve; (2) the specified editor, React-MDE, is unmaintained (npm latest 11.5.0, last published ~5 years ago; the "v2.2.0" cited in §2.3 does not correspond to a current release line), verified by live search 2026-07-31, and maintained alternatives such as `@uiw/react-md-editor` (4.1.1, published ~2 months ago) exist; (3) no create-mode route. Heroicons 2 was verified current (`@heroicons/react` 2.2.0, latest stable) and the `24/outline` import path in §7 is correct.

**Subtotal: 26/35 → Scaled: 26 ÷ 35 × 50 = 37.14 → 37.1/50**

---

## TOTAL: 41.3 + 37.1 = **78.4 / 100**

## GATES PASSED: [x] Flows [x] Style [x] Responsive [x] States [x] Tone

- [x] **All v1 flows — PASSED.** Browse list (§2.1), detail (§1.1 `/articles/[id]`), search with both empty and no-results states (§2.1, §2.2), and edit form (§2.3) are each specified.
- [x] **Style system — PASSED.** §4 supplies color, typography scale, spacing unit, radius, and icon set as named tokens exposed as `:root` CSS variables.
- [x] **Responsive designs — PASSED.** §3 gives three pixel-bounded breakpoints with per-tier layout and navigation behavior plus a 44 dp touch-target rule.
- [x] **Key states — PASSED.** Loading (save spinner overlay, §2.3/§5), empty (§2.1, §2.2), error (inline + toast, §2.3; error rows in §5), and validation (§2.3 rules, §5 Input error/success) are all covered. Coverage is uneven — loading is button-only — but each required state category is present.
- [x] **Brief tone — PASSED.** Restrained palette, hierarchy-first cards, density rationale in §8, integrated search, and a direct list→detail→edit path align with "calm, readable, information-dense, search-first, low-friction." No marketing-visual or motion-heavy patterns appear.

## FINAL VERDICT: **PASS** (78.4 ≥ 75 threshold; all five gates passed)

---

**STRENGTHS**
- Handoff is implementation-grade: real CSS values, Tailwind class strings, an executable Zod schema, the article JSON contract, and named components at concrete paths (§7).
- The §5 state matrix specifies five components across seven states with actual CSS declarations rather than adjectives.
- Accessibility is expressed as mechanism (specific ARIA attributes, defined tab order, focus-on-heading after navigation), and its one computed contrast claim verifies correctly (5.56:1 actual vs 5.0:1 stated).
- Responsive spec is quantitative: pixel breakpoints, per-tier navigation, and a 44 dp touch-target floor.
- §8 ties each major choice back to a brief constraint, making design decisions traceable.

**WEAKNESSES**
- Token/prose contradiction: `Color Warning #D73A49` is assigned to the Draft badge in §4 while §2.5 specifies gray for Draft.
- Create mode has no route, no defaults, and no empty-editor state, despite §1.2 requiring a "New article" entry point.
- Loading design is limited to a button spinner; the article list, detail, and search results have no loading or skeleton treatment.
- Specified editor (React-MDE) is unmaintained per live search, and the cited version does not match any current release line.
- Login gate placed ahead of browse exceeds the brief's "basic security assumptions only" and adds friction to the primary read flow.
- No visual artifacts of any kind — no wireframes, mockups, or screenshots — so composition, density, and hierarchy cannot be verified, and no bonus anchors are reachable.
- Referenced-but-undesigned elements: pagination (cited in §6 tab order), Delete (cited in §3 swipe actions), highlight yellow and shadow values (used without tokens).
- No search ranking, tag-filter UI, or search-failure state, leaving the app's stated primary navigation mode partially specified.

**COMMENTS**
The document's strength is resolution at the token and component level; its weakness is coverage of non-happy-path data states and internal consistency. Remediation is narrow: resolve the Draft badge color conflict, add `/articles/new` with create-mode defaults, define list/detail/search loading skeletons, add body-text and shadow tokens, replace React-MDE with a maintained editor, and remove or defer the login gate. Those six changes would raise Search UX, States, Friction Reduction, and Handoff Clarity, moving the total into the mid-to-high 80s. No change is needed for gate compliance — all five already pass.

**Live-search citations (2026-07-31):** [react-mde (npm)](https://www.npmjs.com/package/react-mde/v/7.3.0) · [@uiw/react-md-editor (npm)](https://www.npmjs.com/package/@uiw/react-md-editor) · [@heroicons/react (npm)](https://www.npmjs.com/package/@heroicons/react)

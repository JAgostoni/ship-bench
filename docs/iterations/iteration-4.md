# Iteration 4: Quality Assurance & Testing

## Goal
Verify the stability of the MVP and ensure all critical user journeys work as expected.

## Tasks
- [ ] **Unit Testing**:
    - Setup Vitest.
    - Write unit tests for Zod validation schemas.
    - Write tests for any core utility functions (e.g., slug generation).
    - Aim for 80%+ coverage of utility functions.
- [ ] **E2E Test Setup**:
    - Install and configure Playwright.
    - Setup a dedicated test SQLite database for E2E runs.
- [ ] **Critical Journey Tests**:
    - **Journey 1**: Home $\rightarrow$ Search $\rightarrow$ Article Detail.
    - **Journey 2**: Article Detail $\rightarrow$ Edit $\rightarrow$ Save $\rightarrow$ Verify Change.
    - **Journey 3**: Create New Article $\rightarrow$ Save $\rightarrow$ Verify in List.
- [ ] **Final Polish**:
    - Verify contrast ratios and keyboard navigation (Tab/Enter/Esc) as per the Design Spec.
    - Perform a final pass on empty states.

## Notes
- This iteration focuses on the "Testing Scope" defined in the Product Brief.
- Do not add exhaustive edge-case coverage unless it blocks the critical journeys.

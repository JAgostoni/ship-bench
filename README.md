# Ship-Bench

**Ship-Bench tests whether AI agents and coding tools can actually ship realistic software.**

It evaluates LLMs and coding tools across a full agentic SDLC workflow — planning, architecture, UX/design, implementation, and QA — using a consistent benchmark application and repeatable scoring rubrics. The goal is less about ranking models and more about answering: *can it do it?*

---

## Why This Exists

Most AI coding demos are weak evidence. They show one-shot completions of isolated problems, not the multi-step, multi-role, decision-heavy work that real software delivery requires.

Ship-Bench evaluates models and tools against a realistic, phased SDLC workflow on a consistent benchmark app — a simplified internal knowledge base — that's complex enough to force real tradeoffs but small enough to run repeatedly.

---

## The Benchmark App

The benchmark application is a **Simplified Knowledge Base App** for a small internal team: create, browse, search, and maintain documentation in one place.

See [`docs/product-brief.md`](docs/product-brief.md) for the full spec.

### Required Features (v1)

1. Article browsing and article detail pages
2. Search across article titles and content
3. Basic editing for all articles
4. *(Stretch)* Category or tag-based organization
5. *(Stretch)* Simple article status handling (draft / published)

### Required Deliverables Per Run

Each benchmark run should produce:

1. Product summary
2. Scope and feature prioritization
3. Technical Architecture Spec
4. UX / Design Direction Spec
5. Implementation backlog (right-sized for 3–5 developer iterations)
6. Working application
7. Tests and verification notes
8. Short decisions log

---

## Repo Structure

```
ship-bench/
├── docs/                    # Project documentation and the product brief
│   └── product-brief.md     # v1 benchmark product brief
├── prompts/                 # Role prompts for each SDLC phase
│   ├── architect.md
│   ├── ux.md
│   ├── planner.md
│   ├── developer.md
│   └── reviewer.md
├── evals/                   # Measurement specs (scoring rubrics) per role
│   ├── architect-measurement-spec.md
│   ├── ux-designer-measurement-spec.md
│   ├── planner-measurement-spec.md
│   ├── developer-measurement-spec.md
│   └── reviewer-measurement-spec.md
└── README.md
```

---

## Prompts

Each prompt defines a role persona, its inputs, required outputs, decision constraints, and handoff expectations. They are designed to be reusable across tools and sessions.

| Role | File | Purpose |
|------|------|---------|
| **Architect** | [`prompts/architect.md`](prompts/architect.md) | Produces a complete Technical Architecture Spec with exact stack decisions, data model, API contracts, and local run instructions |
| **UX Designer** | [`prompts/ux.md`](prompts/ux.md) | Produces a UX/Design Direction Spec with page flows, visual style system, component states, and developer-ready handoff notes |
| **Planner** | [`prompts/planner.md`](prompts/planner.md) | Produces a right-sized Implementation Backlog split into 3–5 developer iterations, each deliverable end-to-end |
| **Developer** | [`prompts/developer.md`](prompts/developer.md) | Implements one assigned iteration at a time, following all prior specs, leaving the codebase runnable after each pass |
| **Reviewer** | [`prompts/reviewer.md`](prompts/reviewer.md) | Performs final QA + light code review, verifies all MVP flows, produces a defect log and a Ship / No-Ship recommendation |

### Prompt Design Goals

- Reusable across sessions and tools
- Specific about output format and decision responsibilities
- Clear on what inputs each role may assume from previous phases
- Open enough that the model still has to make real choices
- Constrained enough to support fair comparison across runs

---

## Evals (Measurement Specs)

Each role has a corresponding measurement spec that defines exactly how to score its deliverable. All specs use a **0–100 scale**, split 50/50 between completeness and quality, with a **≥75 pass bar** and explicit pass/fail gates.

| Role | File | Scoring Focus |
|------|------|---------------|
| **Architect** | [`evals/architect-measurement-spec.md`](evals/architect-measurement-spec.md) | Decision completeness (no unresolved choices left for dev) + tech choice quality (stack fit, simplicity, scale path) |
| **UX Designer** | [`evals/ux-designer-measurement-spec.md`](evals/ux-designer-measurement-spec.md) | Coverage of all required flows + design quality (calm/readable/info-dense, responsive, handoff-ready) |
| **Planner** | [`evals/planner-measurement-spec.md`](evals/planner-measurement-spec.md) | Right-sized tasks (5–15 steps, ≤1 feature per chunk, ≥70% good) + 3–5 iteration fit |
| **Developer** | [`evals/developer-measurement-spec.md`](evals/developer-measurement-spec.md) | Working MVP flows end-to-end + code quality, tech currency, iteration discipline |
| **Reviewer** | [`evals/reviewer-measurement-spec.md`](evals/reviewer-measurement-spec.md) | Verification completeness (every flow tested, defects logged) + assessment quality (evidence-backed ship verdict) |

### Scoring Approach

- **Objective checks first**: feature checklist, test pass/fail, lint pass/fail, build success, required artifacts present
- **Dual Independent Evaluation**: To mitigate the unreliability of LLM-as-judge for subjective code quality and UX metrics, evaluations are performed independently by both an **LLM Judge** and a **Human Judge** using the same explicit rubrics.
- **Score Resolution**: If the LLM and Human scores diverge significantly, a deeper human review determines the final score.
- **Pass bar**: ≥75/100 per role, with all gates required to pass

---

## Running a Benchmark

1. **Set up the repo**: Start from a blank or scaffolded repo — the starting point should be held constant across runs.
2. **Place the product brief** in `docs/product-brief.md` as the shared context for all roles.
3. **Run each role in sequence (Fresh Session Per Run)**: To prevent context window degradation, you MUST clear the LLM context/start a new session for every single role and every single Developer iteration. Pass only the required prior outputs as files in the workspace:
   - Architect → produces `docs/architecture.md`
   - UX Designer → produces `docs/ux-spec.md`
   - Planner → produces `docs/backlog.md` + `docs/iterations/iteration-N.md`
   - Developer → runs iterations sequentially. **Crucial**: Start a completely new session for *each* iteration chunk. The developer reads the previous specs and codebase from the file system, not from chat history.
   - Reviewer → reads all prior docs and the final repo, produces `docs/qa-report.md`
4. **Score each deliverable** using the corresponding measurement spec in `evals/`.
5. **Record results**: runtime, token usage, scores per role, pass/fail per gate, and qualitative notes.

### What to Record Per Run

- Run ID and date
- Model / tool used
- Time and estimated token usage
- Score per role (0–100)
- Gates passed / failed per role
- Final "can it do it?" verdict
- Key failure modes or surprising behavior

---

## Design Principles

**"Can it do it?"** — The primary lens is capability, not ranking. A model that ships a working MVP with minor gaps scores better than one that produces polished plans but fails to deliver.

**Consistency over novelty** — The brief, prompt pack, repo starting point, and scoring rules are held constant across runs. Time and cost are recorded as variables, not strict pass/fail gates.

**Evidence-friendly** — Every run should leave artifacts that can be inspected: plans, architecture notes, backlog output, implementation logs, repo diffs, tests, screenshots, and evaluator notes.

**Useful for all models** — The benchmark is designed to surface capability differences across the full range of current models, not just distinguish the top tier.

---

## Status

| Phase | Status |
|-------|--------|
| Product brief (v1) | ✅ Complete |
| Role prompts (all 5) | ✅ Complete |
| Measurement specs (all 5) | ✅ Complete |
| First benchmark runs | 🔜 Planned |
| Results and analysis | 🔜 Planned |

---

## License

[Apache 2.0](LICENSE)

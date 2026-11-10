# Universal Physics Tensor Framework - Development Plan

## Executive Summary

**Current state (2026-05-01):** UPT is at v0.1.0. The foundation phase is complete — `src/core/tensor.ts`, `src/core/types.ts`, and `src/index.ts` provide a rank-3 `UniversalTensor` with dimensional metadata; 37/37 Vitest tests pass. The bridge catalog (`docs/specification/Part-I.md` through `Part-VI.md`) describes 40 bridge equations across 15 categories (A through O), with per-equation status labels (Established / Standard extension / Speculative / Highly speculative). No bridge equation is yet implemented in code.

**Next focus: formalization.** Before any production-style scaling work, UPT needs to:

1. Curate the bridge equation catalog into a machine-readable index.
2. Build a dimensional-analysis tool that catches the bugs already documented in Part-I (Bridge Equations 11, 13, 16, 17 have known dimensional issues).
3. Decide the fate of self-refuting / weakly-motivated entries (Bridge Eq 16 in particular).
4. Take **one** bridge end-to-end as a template — Bridge Eq 14 (Ryu-Takayanagi) is the recommended candidate because it is `Established` and dimensionally clean.

Production hardening, distributed workers, AI-driven discovery, and the visualization layer are explicitly out of scope for this phase. They are parked in [`Future-Production-Hardening.md`](./Future-Production-Hardening.md).

---

## Methodology

**Development model:** Single developer, iterative. No sprint cadence. Per-task workflow follows the 12-step pipeline (plan → review → code → review → fix → simplify → docs → CHANGELOG → commit → push → recurse).

**Bridge-equation-driven prioritization.** Each bridge equation in the catalog has a status label; planning prioritizes by status:

| Status | Treatment in this phase |
|--------|-------------------------|
| **Established** | Eligible for first-class implementation; serves as templates and validation oracles. |
| **Standard extension** | Implement after at least one Established bridge is end-to-end working. |
| **Speculative** | Catalog entry only; no implementation until justified. |
| **Highly speculative** | Audit for retention; some entries may be removed entirely (see Bridge Eq 16). |

**Success metric for the phase:** at least one bridge equation flows from spec text → typed catalog entry → dimensional check → executable computation → unit test, all green.

---

## Phase A: Formalization (Current)

**Goal:** Promote the bridge equation catalog from prose specification to verified, typed, dimensionally-consistent code, taking one bridge end-to-end as a template.

### A.1 Bridge Equation Index Curation

For each of the 40 bridge equations (numbered 11-50; equations 1-10 are the implicit diagonal laws), capture:

- `equation_id` (e.g., `BE-14-ryu-takayanagi`)
- `category` (one of A-O from Parts I-II of the spec)
- `status` (Established / Standard extension / Speculative / Highly speculative)
- `dim_signature` — the dimensional signature of each side of the equation
- `known_issues_count` — number of open issues flagged in the spec or by the dimensional tool
- `dependencies` — other bridges or constants this equation references
- `validation_strategy` — known analytic limit, published numeric value, or "none yet"

Output: `src/bridges/index.ts` exporting a typed array of `BridgeEquationMetadata` records. No equation logic yet — this is pure metadata.

### A.2 Dimensional-Analysis Tool

Build `src/dimensional/` with:

- A `Dimension` algebra (mass, length, time, charge, temperature, amount, luminous intensity) with multiplication, division, and integer powers.
- A `check(lhs, rhs)` function that returns `{ ok: boolean, lhs_dim: Dimension, rhs_dim: Dimension }`.
- Unit tests covering at least the four bridges with documented dimensional issues (11, 13, 16, 17) plus three known-clean bridges as positive controls.

This tool is the single most valuable piece of infrastructure for the formalization phase. It turns spec audit from manual review into a typecheck-style pass.

### A.3 Per-Bridge Gap Audit and Remediation

Using the dimensional-analysis tool plus a manual read of Part-I:

- Run dimensional check on every catalogued bridge.
- For each failure, record the discrepancy in the bridge's `known_issues` field.
- For Bridge Eq 16 specifically: decide retain (with corrected derivation), demote (move to a "rejected candidates" appendix), or remove. The user's brief flagged this as self-refuting; that decision belongs to the owner, not the planning doc.
- For Highly speculative entries: review and decide which stay in the catalog vs. moving to a separate exploratory annex.

Output: a remediation plan in `docs/planning/bridge-remediation.md` (created when this work begins, not now) listing each flagged bridge and the chosen action.

### A.4 First End-to-End Bridge: Ryu-Takayanagi (Bridge Eq 14)

Bridge Eq 14 is `Established` and dimensionally clean — a good template for what an implemented bridge should look like.

Deliverables:

- `src/bridges/ryu-takayanagi.ts` — typed implementation that takes a minimal-surface area input and returns entanglement entropy.
- `src/validation/ryu-takayanagi.test.ts` — Vitest cases against published values for at least one analytic case (e.g., interval in 2D CFT).
- Documentation entry cross-referencing Part-I §Category D.
- Catalog metadata for BE-14 populated with `validation_strategy: "analytic limit (interval CFT)"`.

The point of this exercise is to discover what the right shape of a "bridge equation in code" is, before scaling to all 40.

---

## Phase B and Beyond

Phase B (the next bridge implementations and a generic worker abstraction) is intentionally not detailed here. Once Phase A.4 is complete, the actual shape of Phase B will be informed by what was learned. Drafting it now would be premature.

Items that would historically have appeared in Phase 2 / Phase 3 / Phase 4 — visualization workbench, AI/ML discovery, K8s deployment, multi-environment configs, distributed worker pool, JWT/RBAC, monitoring stack, REST/GraphQL APIs, on-premises installer — are all in [`Future-Production-Hardening.md`](./Future-Production-Hardening.md). They are not part of the formalization phase.

The visualization layer is **out of scope for this repo**; a Three.js-class viz layer is needed but will live in a separate future repo. UPT itself is the mathematical core only.

---

## Risks Specific to the Formalization Phase

| Risk | Mitigation |
|------|------------|
| Dimensional tool surfaces more bugs than expected | Acceptable; that is what the tool is for. Triage by category and status. |
| Bridge Eq 16 decision blocks progress | Treat the decision as a discrete artifact; if undecided, exclude from the dimensional pass and note in the remediation plan. |
| RT bridge implementation reveals the catalog metadata schema is wrong | Iterate on the schema; A.1 and A.4 are deliberately co-evolving. |
| Speculative bridges accumulate "known issues" | Acceptable; speculative status already signals "use with care." |

---

## Alignment with the Spec

This plan implements parts of the requirements in `System-Requirements.md` (MVP set):

- **FR-T1-P0** (basic tensor framework) — already met at v0.1.0.
- **FR-T2-P0** (essential bridge equations, minimum 10) — addressed by Phase A.1 / A.4 starting with one bridge end-to-end, then scaling.
- **FR-P2-P0** (numerical stability, dimensional checks) — addressed by Phase A.2.

Higher-numbered requirements (FR-T4-P1 full bridge library, FR-P3-P1 GR / QFT, FR-PERF2-P1) come into scope after Phase A.4.

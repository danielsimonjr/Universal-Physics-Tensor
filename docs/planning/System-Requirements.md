# Universal Physics Tensor Framework - System Requirements Specification

## Document Overview

This document specifies system requirements for UPT during its current **formalization phase** (single-developer TypeScript library at v0.1.0). Requirements are split into:

- **MVP Requirements** — what UPT must / should do as a single-user formalization tool. These drive the work in `Development-Plan.md` Phase A.
- **Future Requirements** — what UPT might do if it later grows into a multi-user research platform. These are aspirational; corresponding architecture work is parked in `Future-Production-Hardening.md`.

**Priority labels (within MVP):**
- **MUST (P0)** — failure blocks formalization phase progress.
- **SHOULD (P1)** — significant value, can be deferred without blocking.
- **MAY (P2)** — nice-to-have inside the current phase.

**Priority label (Future):**
- **FUTURE (P3)** — long-term aspiration; honesty caveats apply.

**Bridge equation status labels** from the spec (`docs/specification/Part-I.md`) are used throughout: Established / Standard extension / Speculative / Highly speculative.

---

## 1. Strategic Objectives

### 1.1 Primary Goal (MVP, P0)

**Mathematical formalization.** Promote the bridge equation catalog (`Part-I.md`–`Part-VI.md`) from prose into typed, dimensionally-checked, executable code. The framework is **organizational**: it catalogs and relates physics equations drawn from the literature; it does not itself derive new physics.

### 1.2 Secondary Goals (MVP, P1)

- **Dimensional auditing.** Catch and document the dimensional issues already flagged in Part-I (Bridge Equations 11, 13, 16, 17 known cases).
- **Status-driven prioritization.** Use per-equation status labels to drive what gets implemented first.

### 1.3 Future Aspirations (P3)

- **Autonomous discovery** of physics equations.
- **Universal unification** mapping all known physics through a unified tensor framework. Note: genuine unification is an unsolved scientific problem; this aspiration depends on theoretical advances well beyond the current state of the art. The framework provides a structure for organizing known relationships, not a mechanism for deriving new unification.
- **Real-time experimentation** with laboratory equipment integration.
- **Multi-user research platform** with collaboration, persistence, and access control.

These items propagate the same honesty caveat: they are direction, not commitment. Architecture sketches for them are in `Future-Production-Hardening.md`.

---

## 2. MVP Functional Requirements

### 2.1 Tensor Core

* **FR-T1-P0: Basic tensor framework** — UPT MUST implement a rank-3+ `UniversalTensor` supporting addition, multiplication, contraction, and dimensional consistency validation, with memory-efficient storage for tensors up to 10^6 elements.
  *Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`; the implementation is `src/core/tensor.ts`.*

* **FR-T2-P0: Essential bridge equations** — UPT MUST provide a minimum of 10 bridge equations as typed catalog entries, drawn from the spec's Established or Standard-extension tier. Implementation status need not be complete; metadata + dimensional check are sufficient for the catalog entry to count.

* **FR-T3-P1: Rank-6 expansion** — UPT SHOULD generalize the tensor to rank-6 with full mathematical rigor once at least one bridge equation requires it.

* **FR-T4-P1: Complete bridge library** — UPT SHOULD provide all 40 catalogued bridge equations (numbered 11-50; equations 1-10 are the implicit diagonal laws) across 15 categories (A-E in Part-I; F-O in Part-II), each with metadata and dimensional check, and at least 10 with full implementations.

* **FR-T5-P3: Adaptive discovery** — Aspirational. See `Future-Production-Hardening.md` § "Discovery Workbench" and the honesty caveat under §1.3.

### 2.2 Physics Engine

* **FR-P1-P0: Basic multi-physics support** — UPT MUST support quantum mechanical evolution (wave function), classical mechanics (Newtonian dynamics), and basic electromagnetic field calculations as the underlying domains the bridge equations connect. These currently exist as type-level constraints on tensor indices, not as full simulators.

* **FR-P2-P0: Numerical and dimensional stability** — UPT MUST provide:
  - Dimensional consistency checks on all bridge equation evaluations (this is the formalization-phase priority).
  - Conservation law monitoring (energy, momentum) for any bridge equation that claims to preserve them.
  - Convergence validation for any iterative method introduced.

* **FR-P3-P1: Extended physics domains** — UPT SHOULD support general relativistic calculations and quantum field theory once the corresponding bridge categories (D, K, L) have working representatives.

* **FR-P4-P1: Advanced numerical methods** — Adaptive time stepping and spectral methods become relevant only when a bridge implementation needs them. Deferred until then.

* **FR-P5-P3: Real-time monitoring dashboards** — Future, see `Future-Production-Hardening.md`.

### 2.3 Performance

* **FR-PERF1-P0: Basic performance** — Tensor operations should complete in < 1 second for 10^5 elements, bridge-equation evaluation in < 500 ms for standard parameters, memory usage < 4 GB for typical workloads. These are loose targets, not contracts.

* **FR-PERF2-P1: Optimized performance** — Tensor operations < 100 ms for 10^6 elements becomes a goal once a bridge implementation actually needs that scale. No optimization without a profiled bottleneck.

* **FR-PERF3-P3: HPC** — Distributed computing, GPU acceleration, real-time experimental streams. Future.

### 2.4 User Interface

UPT itself has no UI in this phase. The visualization layer (interactive 6D tensor viz, equation editor with LaTeX, discovery workbench) will live in a **separate future repo**, not in `universal-physics-tensor`. See `Future-Production-Hardening.md` § "Visualization Layer (Separate Future Repo)".

The current "interface" is the TypeScript API exported from `src/index.ts` and the test suite. That is sufficient for formalization-phase work.

---

## 3. MVP Non-Functional Requirements

### 3.1 Reliability

* **NFR-REL1-P0:** All publicly exported functions MUST be covered by Vitest tests.
* **NFR-REL2-P0:** Computational results MUST be deterministic for fixed inputs (no hidden randomness).

### 3.2 Maintainability

* **NFR-MAINT1-P0:** TypeScript strict mode MUST remain on.
* **NFR-MAINT2-P0:** Every bridge equation implementation MUST cite its spec section (Part-I/II).
* **NFR-MAINT3-P1:** Every bridge equation entry SHOULD record a `validation_strategy` field (analytic limit, published numeric value, or "none yet").

### 3.3 Items Explicitly Out of Scope at MVP

The following NFRs from earlier drafts have moved to `Future-Production-Hardening.md`:

- Concurrent-user scalability (UPT has one developer, not 10 simultaneous users).
- Horizontal scaling.
- 99% uptime SLA (no service to keep up).
- Dataset size limits beyond a single dev machine.
- Authentication, authorization, RBAC (no users to authenticate).
- API rate limiting (no API).
- Audit trails (no compliance regime).
- Backup / recovery (Git is sufficient for source; no persistent runtime state exists).

---

## 4. Implementation Notes

### 4.1 Stack

TypeScript / Node.js / Vitest. Single concrete stack. See `Implementation-Plan.md` §2 for details. Alternative stacks are noise at this scale and are listed in `Future-Production-Hardening.md`.

### 4.2 Evolution Strategy

- **v0.1.x (current):** Tensor core complete. Bridge catalog as prose only.
- **v0.2.x (Phase A target):** Bridge catalog as typed metadata; dimensional tool live; one bridge end-to-end.
- **v0.3.x and beyond:** TBD based on what Phase A reveals.
- **v1.0:** approximately when all 40 bridges have valid metadata and ≥10 have working implementations.

The "Version 2.0 / Version 3.0" milestones from earlier drafts (advanced visualization, AI discovery, distributed computing) are no longer on the UPT roadmap directly — they are in the parking lot.

---

## 5. Validation

### 5.1 Technical Validation

- Unit-test coverage on every bridge implementation (no hard percentage gate at this stage).
- Dimensional check passes for every bridge entry, or the entry is flagged with `known_issues`.
- Type-check passes (`npm run build`).
- All Vitest cases pass (`npx vitest run`).

### 5.2 Physics Validation

- Each bridge with `Established` status SHOULD be cross-checked against at least one published analytic limit or numeric value (recorded in `validation_strategy`).
- `Speculative` and `Highly speculative` bridges remain catalog entries; they are not subjected to physics validation pending peer review or removal.

### 5.3 What Is Not Validated Here

- Performance benchmarks against arbitrary loads — out of scope until there is a profile.
- Cross-browser compatibility — no browser target.
- Multi-user behavior — no users.

---

## 6. Risk Management (MVP-Phase)

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Dimensional tool reveals many flagged equations | High | Medium | That is the tool's job; triage by status label. |
| Bridge Eq 16 self-refutation | Confirmed | Medium | Decision artifact: retain corrected / demote to annex / remove. Owner: Daniel. |
| Speculative bridges accumulate issues | High | Low | Status label already signals exploratory nature. |
| Physics validation against published values is harder than expected | Medium | High | Start with one bridge (Ryu-Takayanagi, BE-14, Established and dimensionally clean) before scaling. |
| Catalog metadata schema needs revision after first implementation | High | Low | Co-evolve schema with first implementation; pre-1.0 versioning permits breakage. |

Risks tied to scaling, security, multi-user operation, and cloud deployment are in `Future-Production-Hardening.md`.

---

## 7. Conclusion

This document scopes UPT requirements to the formalization phase: a single-developer TypeScript library promoting a prose bridge equation catalog into typed, dimensionally-validated code. Requirements are graded P0/P1/P2 within MVP; aspirational P3 items (autonomous discovery, universal unification, real-time experimentation, multi-user platform) are preserved with their honesty caveats.

Production hardening, multi-environment configuration, security, monitoring, distributed compute, REST/GraphQL APIs, and the visualization layer are explicitly out of scope here and live in `Future-Production-Hardening.md`.

The success of the formalization phase is measured by one concrete deliverable: at least one bridge equation flowing from spec text → typed metadata → dimensional check → executable implementation → passing unit test.

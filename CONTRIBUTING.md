# Contributing to the Universal Physics Tensor Framework

UPT is an engineer's exploratory framework for organizing physical
knowledge — built by a systems engineer, **actively seeking physicist
collaborators** for validation and correction. You do not need to read
TypeScript to contribute physics: the catalog is published as a JSON
review surface (below), and most open tasks are bounded literature
checks.

## The fastest ways to help (bounded tasks)

### Physics review — no code required

Each task is a self-contained judgment with the evidence already
gathered. Open an issue (or PR against the JSON/markdown directly):

0. **Review the Phase 0 atlas pilot.** It does not block a roadmap phase.
   The owner removed that gate on 2026-10-01. The pilot claims five typed relations between oscillator
   models plus one rejection, each with executable witnesses under
   `src/atlas/oscillators/`; the design note is
   `docs/planning/Atlas-Phase-0-Design.md`. The claims worth attacking:
   spring↔LC is billed as an **exact equivalence** rather than an
   isomorphism of the nondimensionalized equation (an internal reviewer
   already disputed the type, and it was kept — say whether that was
   right); the pendulum relative period error `θ₀²/16`, checked at
   0.002506 against 0.002500 at 0.2 rad, with a validity horizon
   `t ≪ 16T₀/θ₀²`; the `m → 0` damped oscillator treated as a **singular**
   limit, where order drops 2→1 and a velocity initial condition cannot be
   imposed; the chain→wave dispersion error `(qa)²/24`; and the rejection
   of cubic-spring↔LC because `ε = βx₀²/k` survives nondimensionalization.
   The `(K, δ)` composition law composes outer-after-inner as
   `(K₂K₁, K₂δ₁ + δ₂)` — a wrong associativity convention here would
   propagate into every later phase, so it is worth its own look.
   **A rebuttal is as valuable as a confirmation**, and both internal
   reviewers already returned one wrong verdict apiece on this material.
1. **Adjudicate BE-44 (soft hair).** Is the encoded `Q_soft²` L²-norm a
   genuine information↔gravity bridge, or internal to classical
   radiation theory? Both readings are laid out in
   `docs/architecture/v0.8.0-catalog-adjudication.md`; the membership
   criterion is in `src/bridges/membership.ts`'s docstring.
2. **Adjudicate BE-46 (multiverse measure)** — same document: is
   anthropic selection a regime?
3. **Adjudicate BE-50 (Wheeler-Feynman)** — does the absorber boundary
   condition's thermodynamic-arrow claim make the encoded
   time-symmetry residual regime-spanning?
4. **Check BE-23 (SYK Planckian dissipation)** against Hartnoll 2015
   (*Nat. Phys.* 11:54) — is the encoded linear-in-T resistivity form
   the canonical one?
5. **Review the quantity identifications and alias dispositions** in
   `src/composition/compose.ts` (`QUANTITY_IDENTIFICATIONS` and
   `SOURCE_ALIAS_DISPOSITIONS`) — each is an explicit physics judgment
   (e.g., "the Hawking temperature IS the temperature in Landauer's
   bound", or "the two `mass` inputs of this composed edge refer to the
   same object") with rationale and citation. Agree or rebut.
6. **Review the centralized quantity naming** in
   `src/composition/quantities.ts` — each name is a judgment about
   which physical quantity a bridge input *is* (the file's header
   also documents a known unit-heterogeneity hazard: GeV-valued energy
   nodes beside joule-valued ones, and a bits/nats/J·K⁻¹ information
   split). Misidentifications here silently change what compositions
   the enumerator proposes.
7. **Assess the machine-proposed novel compositions** in
   `docs/research/v0.11.0-novel-candidates.md` — the candidate
   bridge-chains the enumerator found over the composition graph of
   that release (the note keeps the graph and count it was written
   with). Each needs a physicist's call: physically meaningful,
   trivially true, or nonsense?
8. **Audit any bridge's `dimensional_signature` or references** in the
   JSON catalog (below). Errors found by inspection are the cheapest
   kind to fix.

### The JSON review surface

`data/bridge-catalog.json` is the catalog record: every formula, status,
known issue, reference and note lives there, and nowhere else.
`src/bridges/catalog-load.ts` reads it and checks it against
`data/bridge-catalog.schema.json` at load; `BRIDGE_EQUATIONS`, the
composition graph and the evaluators are projections of it. Read it,
annotate it, PR it — an accepted change is a change to that file.
`bun run catalog:json` checks the file (schema version, `packageVersion`
against `package.json`, every `formalKey` against the vendored PhysJS
manifest); it does not regenerate it. The size and status counts are in
`NOTES.md`.

### The negative catalog is reviewable too

`src/bridges/rejected.ts` records NOT-A-BRIDGE adjudications with
reasons. Disagreement with a rejection is welcome — rebut the stated
reason with a citation.

## Code contributions

```bash
git clone https://github.com/danielsimonjr/universal-physics-tensor.git
bun install        # Bun is the package manager; Node ≥ 18 remains the runtime
bun run typecheck  # tsc --noEmit (+ tests project)
bun run test       # vitest full suite; `pretest` runs tsc first
```

- TypeScript 7 (native compiler; no compiler API), ESM (`"type": "module"` — relative imports need
  the `.js` extension), Node ≥ 18 (shipped runtime), Bun (install +
  `bun run` scripts), vitest. Lockfile is `bun.lock` only.
- The default branch is `master`. CI runs type-check + full suite on
  every push/PR.
- The rules are `AGENTS.md` and the procedure is `WORKFLOWS.md`
  (`CLAUDE.md` only loads them); the spec index is
  `docs/specification/README.md`.
- Drift guards will catch you honestly: spec↔index prose pins, the
  public-surface snapshot, the JSON-artifact freshness pin, and the
  `@public`-tag invariant all fail loudly when an edit forgets its
  counterpart. That's by design — update both sides in one PR.

## Status-promotion rule (important)

No bridge's `status` is promoted toward `established` on the strength
of internal review (human or LLM) alone. Promotions require a
human-verifiable literature anchor, and data-driven claims must be
re-runnable from the committed code. See the Status-Promotion Protocol
in `docs/specification/Part-VI.md`.

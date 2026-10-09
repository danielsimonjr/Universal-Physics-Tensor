# Identifiability Classifier — Design Note

> **Provenance:** Written 2026-06-13 (branch
> `claude/bridge-equations-specs-review-4mfy38`), implementing
> Consequence 1 of `Bridge-Inference-Epistemics-Note.md` — "the smallest
> of the three [build targets] and the natural first step." Records the
> precise definitions the classifier computes, because its correctness
> hinges on them (the over/exactly/under boundary, cycle handling, and
> identification-bridged connectivity each have a wrong-but-plausible
> formulation that this note rules out).
>
> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. The implementation is `src/composition/identifiability.ts`,
> with tests in `tests/composition/identifiability.test.ts`.

## What it computes (and what it deliberately does not)

The classifier answers a **structural** question over the directed
hypergraph of `BridgeEdge`s: *given a set of known quantities K and a
target quantity t, how many independent ways can the graph compute t from
K?* It classifies t into the epistemics-note trichotomy:

- **under-determined** — the graph cannot reach t from K. Verdict:
  *decline; needs more inputs or more physics.*
- **exactly-determined** — exactly one independent derivation. Verdict:
  *solve* (up to the dimensionless constant dimensional analysis can
  never supply — that boundary belongs to the future Buckingham-π
  enumerator, not here).
- **over-determined** — two or more independent derivations. The surplus
  derivations are **falsifiable consistency constraints** (each predicts
  t; they must agree). This is the headline regime.
- **given** — t ∈ K (degenerate); any derivations are cross-checks on the
  supplied value.

**It does NOT decide parametric/numerical identifiability** — whether the
resulting nonlinear system has a unique numeric solution. For closed-form
evaluators that is undecidable in general, and claiming it would be the
exact overreach the epistemics note warns against. "Independent
derivation" here means a **structurally distinct edge**, not a
provably-independent formula; two edges with algebraically equivalent
content are counted as two (an honest over-count, flagged in the API
docs).

## Definitions

Let `E` be the primitive edge set, each edge `e` a relation
`target(e) = f(sources(e))` (directional — evaluators are not inverted).

**Forward closure** `D = closure(K, E)` is the least set ⊇ K closed
under: if `sources(e) ⊆ D` then `target(e) ∈ D`. Computed as a monotone
fixpoint. Two consequences worth stating:

- A **parameter-free edge** (empty `sources`, e.g. BE-21's KSS bound
  η/s = 1/4π) fires unconditionally — its target is in *every* closure.
  Correct: a constant is always determinable.
- **Identifications** (`QUANTITY_IDENTIFICATIONS`, e.g.
  hawking-temperature ≡ temperature) participate in the closure as
  directed name-equivalences: `from ∈ D ⟹ to ∈ D`. This mirrors how
  `composeEdges`/`findJunction` actually connect the graph, so the
  classifier's connectivity agrees with the composition engine's. Like
  the engine, the identification is applied **globally** (the engine is
  equally permissive, and `enumerateCompositions` already routes the
  resulting candidates to human review) — so it is a constructor
  parameter, defaulting to the registered set; pass `[]` for the pure
  physical-edge graph.

**The t-removed closure** `D₋ₜ = closure(K, E \ {e : target(e) = t})`.
This is the load-bearing definition. A derivation of t must not depend on
t itself; removing every edge into t before testing a derivation's
sources excludes **circular self-support**. Worked counterexample the
naive count gets wrong: K = {a}, edges a→t, t→b, b→t. Naively both a→t
and b→t have sources in `D` (b ∈ D via t), giving "over-determined" — but
b's value *came from* t, so b→t is no independent check. Under `D₋ₜ`
(which drops a→t and b→t), b is not determinable, so only a→t counts:
**exactly-determined**, correctly.

**Supporting derivations** of t = `{ e ∈ E : target(e) = t and
sources(e) ⊆ D₋ₜ }`. Let `k = |supporting derivations|`.

**Verdict** (driven by closure membership, split by k):

| condition | verdict |
|---|---|
| t ∈ K | given |
| t ∉ D | under-determined |
| t ∈ D, k ≥ 2 | over-determined |
| t ∈ D, k ≤ 1 | exactly-determined |

Basing under-determined on `t ∉ D` (not `k = 0`) handles a target
reachable *only* by identity relabeling (k = 0 physical edges but t ∈ D):
it is determined-by-assertion, reported exactly-determined with zero
physical derivations. For physical targets the two formulations coincide
(provably, `t ∈ D ⟺ k ≥ 1`).

**Surplus constraints** = `given ? k : max(0, k − 1)`. A non-given target
spends its first derivation pinning the value; the rest are checks. A
given (measured) target spends none — all k derivations are checks
against the measurement.

**Blocking frontier** (under-determined only): the backward cone of t
(quantities from which t is forward-reachable) intersected with
"not determinable," minus t and K. These are the upstream gaps — *"if you
also knew one of these, t moves toward determined."* Leaf members (never
any edge's target) are the pure missing inputs.

## Real-graph anchor (pins the integration test)

From `known = {mass}` over the full 41-edge primitive set:

- **`hawking-temperature` → over-determined**, derivations
  `{be-42, be-42-via-rs}`, surplus 1. The Schwarzschild radius is
  determinable from mass (`law-schwarzschild-radius`), so both routes to
  T_H fire — a genuine, physically meaningful consistency constraint and
  the headline example.
- **`schwarzschild-radius` → exactly-determined** (`law-schwarzschild-radius`).
- **`landauer-erasure-energy` → exactly-determined** *with* the registered
  identification (mass→T_H, T_H≡temperature, be-16), but
  **under-determined** with `identifications: []` — the one identification
  is what bridges the name boundary (this is the CT-1 chain). Pins that
  identifications are load-bearing for determinability.

## API surface (public)

- `classifyIdentifiability(edges, knownNames, targetName, opts?)
  → IdentifiabilityResult`
- `classifyAll(edges, knownNames, opts?) → IdentifiabilityResult[]`
  (every quantity that is some edge's target — the natural feeder for the
  future retrodiction harness, build target 2)
- `forwardClosure(edges, knownNames, identifications?) → Set<string>`
  (the reusable determinability primitive)
- types `IdentifiabilityVerdict`, `IdentifiabilityResult`,
  `IdentifiabilityOptions`

Complexity is O(rounds × |E|) per closure, two closures per classify —
trivial at 41 edges.

## Honest limitations (recorded, not hidden)

1. Structural, not parametric (above).
2. "Independent" = structurally distinct edge, not algebraically
   independent formula — over-counts surplus when two edges encode the
   same relation.
3. Global identification application inherits the composition engine's
   permissiveness; the verdict PROPOSES, humans filter (Part-VI §XXVII-B),
   exactly as `enumerateCompositions` does.
4. Alias dispositions (the n-ary duplicate-name gate) are a
   composition-time concern and do not enter determinability; out of
   scope here by design.

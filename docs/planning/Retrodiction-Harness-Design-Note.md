# Retrodiction Harness — Design Note (with pre-registered pass bar)

> **Provenance:** Written 2026-06-13 (branch
> `claude/bridge-equations-specs-review-4mfy38`), build target 2 of
> `Bridge-Inference-Epistemics-Note.md` (Consequence 2). Follows the
> identifiability classifier (build target 1); reuses `classifyAll` as
> its feeder, exactly as the epistemics note anticipated.
>
> **P-3 pre-registration.** Per the project's pre-registration discipline
> (commit the pass bar BEFORE scoring), this note fixes the acceptance
> criteria up front, in a commit that also contains the implementation
> and its first run. The bar is stated in §"Pass bar" and must not be
> loosened to fit a result.
>
> Status and dates for this document are in `NOTES.md` and `CHANGELOG.md`. The implementation is `src/composition/retrodiction.ts`,
> with tests in `tests/composition/retrodiction.test.ts`.

## The idea

The framework's own falsification benchmark. Mask a quantity the graph
can compute, recompute it from ground-truth inputs via EACH independent
derivation, and check the predictions agree. If the graph cannot
reconstruct things it was "previously told" — or worse, two encodings of
the same quantity disagree — that is a visible failure of the whole
enterprise, caught cheaply here instead of in a preprint.

This operationalizes the **over-determined** verdict from the
identifiability classifier: the surplus derivations of an over-determined
node are predicted to be *consistency constraints*; the harness evaluates
them and checks that prediction numerically.

## What "mask" and "recover" mean (precise)

Ground truth is a `Record<string, number>` of quantity values (the
leaves, and optionally measured nodes). For a target node `n`:

1. **Mask** = compute source values over the graph with **every edge into
   `n` removed** (the same target-removed closure the classifier uses to
   exclude circular self-support). `n` is therefore never assigned a value
   that any of its own derivations could read back — it is genuinely
   hidden.
2. **Recover** = evaluate each edge whose target is `n`, keyed by those
   masked source values, through the domain-checked `evaluateEdge` (an
   edge that refuses its domain, or yields non-finite, simply does not
   fire — it contributes no prediction).
3. **Score** = the relative spread of the ≥2 predictions,
   `(max − min) / |mean|`.

Forward evaluation honors `QUANTITY_IDENTIFICATIONS` (a determined `from`
supplies `to`), mirroring `composeEdges` and the classifier. Parameter-
free edges (empty sources, e.g. BE-21) fire unconditionally.

## Outcomes

| outcome | meaning |
|---|---|
| `consistent` | ≥2 derivations, spread ≤ tolerance — the over-determined prediction holds |
| `inconsistent` | ≥2 derivations, spread > tolerance — **FALSIFICATION**: two encodings of one quantity disagree |
| `single` | exactly one derivation fired — recovered, but no cross-check |
| `unrecoverable` | no derivation fired from the ground truth |

`pass = outcome !== 'inconsistent'`. An optional external `references`
map (textbook values supplied by the caller, from OUTSIDE the codebase)
adds a `referenceRelError` / `referencePass` against the recovered value —
the "recover against the known value" half of the note. The consistency
check needs no external truth and is the self-contained, re-runnable
core; reference scoring is opt-in.

## Pass bar (PRE-REGISTERED — do not loosen to fit a result)

- **Consistency tolerance: relative spread ≤ 1e-6.** The independent
  derivations of a genuinely-over-determined node are algebraically
  identical closed forms evaluated in float64; agreement is expected at
  ~1e-15. 1e-6 is loose enough for float noise and tight enough that a
  real encoding discrepancy (different physics behind the same node name)
  fails the gate. The headline metric is `allConsistent` — zero
  `inconsistent` nodes across the swept set.
- **Reference tolerance (when used): relative error ≤ 1e-3** by default,
  caller-overridable. The note's "order of magnitude" is the floor; 1e-3
  is appropriate when the external value is a precise textbook constant.

## Pre-registered first-run anchor

Ground truth `{mass: M_sun}` over the full 41-edge graph. Prediction,
committed before the run: **`hawking-temperature` is over-determined and
`consistent`** — `be-42` (T_H = ℏc³/8πGMk_B, direct) and `be-42-via-rs`
(T_H = ℏc/4πk_B·r_s, with r_s = 2GM/c² from `law-schwarzschild-radius`)
agree to ≤ 1e-6 (expected ~1e-15). External reference anchor: the
solar-mass Hawking temperature ≈ 6.17×10⁻⁸ K (standard value, Hawking
1975 / any GR text) — `referencePass` at 1e-3. If either fired
`inconsistent`, that is a real finding to surface, not to suppress.

## API surface (public)

- `retrodict(edges, groundTruth, opts?) → RetrodictionReport` — the
  sweep: classifies (via `classifyAll`), tests every over-determined node
  (plus any with a supplied reference), aggregates `allConsistent`.
- `retrodictNode(edges, groundTruth, target, opts?) → RetrodictionResult`
  — one node.
- types `RetrodictionOutcome`, `RetrodictionPrediction`,
  `RetrodictionResult`, `RetrodictionReport`, `RetrodictionOptions`.

## Honest limitations

1. Inherits the classifier's structural/parametric boundary: it scores
   the encodings the graph HAS, at the inputs supplied — not a proof of
   physical correctness, a check of mutual consistency.
2. Two derivations that are the same closed form will always agree
   (vacuous pass); the signal is strongest where the encodings are
   genuinely distinct (the be-42 / be-42-via-rs pair is — different
   formula and constants, bridged by the r_s law).
3. Reference scoring is only as good as the external value the caller
   supplies; the harness does not ship a truth table (no fabrication).

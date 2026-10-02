# Deriving the Bridge Equations — a Dimensional-Analysis Audit

> **Status as of 2026-10-01.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../NOTES.md): ten atlas bridges and thirteen catalog ids (be-12, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `dd35202920bf19c39f71f15d9ee740a6d28ec173`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](../planning/Bridge-Gap-Inference.md). The be-15 row (exponent 1/2, recovered prefactor 1.000) and the be-17 row (recovered prefactor 1.000) are the Buckingham engine matched to the evaluator. The Lean route is `PhysJS.Dimensional.monomial_form` plus the nested theorem, and that fixes the form only up to a dimensionless constant: z=2 is not derived for be-15, and C=1 is a hypothesis for be-17.

> **Provenance:** 2026-06-13 (branch
> `claude/bridge-equations-specs-review-4mfy38`). Points the Buckingham-π
> engine (`src/dimensional/buckingham.ts`) at all 41 bridge edges and
> asks: how many of the catalog's bridge equations can be DERIVED by
> dimensional analysis? Every number below is pinned by
> `tests/dimensional/bridge-derivation-audit.test.ts`.

## Method

For each bridge edge (`sources → target`, with an evaluator) the audit:

1. **Searches for a dimensional closure** — the smallest subset of the
   fundamental constants {ℏ, c, G, k_B, e} which, added to the bridge's
   own source variables, makes the target dimensionally determined
   (`dimensionallyDetermines` returns a unique monomial).
2. **Verifies the closure numerically** — builds the candidate
   `target = Π(source^e)·Π(constant_SI^e)` and evaluates it against the
   bridge's actual evaluator at several input points. If the ratio is
   **constant**, the monomial is the right form and that ratio is the
   dimensionless prefactor (which dimensional analysis cannot supply, but
   the numerical match recovers). If the ratio **varies**, the closure is
   a *decoy* — dimensionally valid, physically wrong.

This is the epistemics note's "(A) form by dimensions, the constant by
physics" made operational, and audited against the catalog itself.

## Result (41 edges)

| outcome | count |
|---|---|
| **Derived** (form matches the evaluator; prefactor recovered) | 11 |
| **Decoy-only** (closures exist, none match the evaluator) | 5 |
| **Unclosable** (no constant subset closes it) | 25 |

**Roughly a quarter of the bridge equations are dimensional
consequences; three-quarters carry physics that dimensions cannot
reach.** This is the epistemics note's "dimensional matching is a weak
filter" confirmed empirically on the project's own catalog.

## Derived — and the recovered prefactors

The striking part: where the form *is* a dimensional consequence, the
numerical match against the bridge's evaluator hands back the famous
dimensionless constant the engine itself could never produce.

| bridge | engine derives (form) | recovered prefactor |
|---|---|---|
| be-16 Landauer | `E ∝ k_B·temperature` | **0.69315 = ln 2** |
| be-21 KSS bound | `η/s ∝ ℏ·k_B⁻¹` | **0.079577 = 1/4π** |
| be-42-via-rs Hawking | `T_H ∝ ℏ·c·r_s⁻¹·k_B⁻¹` | **0.079577 = 1/4π** |
| be-20 vacuum energy | `ρ_Λ ∝ Λ·c²·G⁻¹` | **0.039789 = 1/8π** |
| law-schwarzschild | `r_s ∝ G·mass·c⁻²` | **2.0000** |
| be-12 thermal de Broglie | `λ ∝ ℏ·(mass·k_B·temperature)⁻¹ᐟ²` | **2.5066 = √(2π)** |
| be-13 Einstein trace | `R ∝ cosmological-constant-curvature` | **4.0000** (R = 4Λ) |
| be-48 GRW localization | `λ_GRW ∝ mass·c²·ℏ⁻¹` | 7.03×10⁻⁴¹ (the GRW rate, an empirical parameter) |
| be-15 model-A coarsening | `L ∝ (mobility·time)¹ᐟ²` | 1.000 |
| be-17 torsion–spin | `spin² ∝ coupling²·torsion-scalar` | 1.000 |
| be-36 GW speed ratio | (dimensionless target — degenerate) | — |

ln 2, 1/4π (twice), 1/8π, √(2π), the factor 2 in r_s, the 4 in R = 4Λ —
each is the *physics* constant, recovered not by the dimensional engine
but by matching its derived form against the catalog's encoded evaluator.

## Decoy-only — the cautionary cases

Dimensionally valid, physically wrong. These are the vivid illustration
of why dimensional matching cannot be a *discovery* engine:

- **be-42 (Hawking, from mass directly).** The only closure of a
  temperature from {mass, c, k_B, …} is `mass·c²·k_B⁻¹` — the *rest-mass
  temperature* Mc²/k_B, which grows with M. The real Hawking temperature
  falls as 1/M; with {ℏ, G} added there is a free group (ℏc/GM²), so it
  is genuinely *not* a dimensional consequence. (Note the asymmetry:
  be-42-**via-rs** *is* derivable, because r_s already absorbs GM/c².)
- **be-51 (Eddington lensing).** The deflection angle is dimensionless,
  so dimensional analysis fixes it only as "a constant" — it cannot see
  the `4GM/bc²` dependence at all (the ratio varies with the inputs).
- **be-27 (effective temperature).** `T_eff = T + (noise/k_B)` is a
  *sum*, not a monomial — no power-product can match it.
- **be-14, be-43 (entanglement entropies).** Area-law forms whose
  coefficient needs the Planck area (ℏG/c³); with those constants
  supplied a free group appears, so no unique monomial.

## Unclosable — graded by dimensional complexity (not a flat "25")

"Unclosable" is not a verdict, it is a *spectrum*. Each non-derived
bridge carries some number of **free dimensionless parameters** — the
arguments of the dimensionless function F that dimensional analysis
cannot pin. Computed as: the minimal constant subset that puts the
target's dimension in span, then the leftover π-group count − 1.

| free params | meaning | bridges |
|---|---|---|
| 0 | a single dimensionless statement (derived monomial *or* decoy) | 16 |
| 1 | target = monomial × F(one ratio) — **one knob from a monomial** | 11 |
| 2 | F of two ratios | 4 |
| 3 | | 4 |
| 4 | | 4 |
| 5 | asymptotic safety (be-39) | 1 |
| 6 | primordial nucleosynthesis (be-47, 8 sources) | 1 |

The headline: **11 of the "unclosable" bridges are exactly one
dimensionless ratio away from a pure monomial** — and that band includes
**Mercury perihelion precession (be-52)** and the **Shapiro delay
(be-37)**, both *established*, both validated in this codebase to
~10⁻⁷–10⁻⁸. They are "unclosable" only because they carry a single
dimensionless ratio (eccentricity; a ratio of radii). The genuinely
many-parameter bridges (be-47 at 6, be-39 at 5) are a small tail.

## Complexity is NOT credibility (the load-bearing caveat)

It is tempting to read "derivable" as "solid" and "unclosable" as
"speculative." **The data refutes this.** Cross-tabulating the three
buckets against the catalog's `status` field:

| bucket | established | speculative | highly-spec | law |
|---|---|---|---|---|
| Derived (11) | 1 | 8 | 1 | 1 |
| Decoy (5) | 1 | 3 | 1 | — |
| Unclosable (25) | 5 | 18 | 2 | — |

- The **unclosable bucket holds 5 *established* bridges** — perihelion
  precession, the Yang–Mills β-function (asymptotic freedom), the
  Kibble–Zurek mechanism, the decoherence master equation. Not
  speculative; they simply involve dimensionless observables.
- The **derived bucket is 8/11 *speculative*** — derivability does not
  confer credibility either (be-48 GRW and be-42-via-rs Hawking are
  highly-speculative yet derive cleanly).

The two axes are nearly orthogonal. The audit measures **dimensional
structure** — how many independent dimensionless knobs a bridge has —
which tracks "number of scales / dimensionless observables," not whether
the bridge is true. Dimensional analysis is *weakest exactly where the
cleanest, most-established physics lives* (angles, eccentricities, ratios
of lengths). **Do not use this audit to prune, rank, or score the
catalog by credibility.**

## How to use it (triage, not filter)

- **Complexity as an organizing lens.** Sorting the catalog by free-
  parameter count groups bridges by structural complexity — a more
  honest spine than "established/speculative" for understanding *what
  kind* of relation each bridge is.
- **Decoys flag where the content lives.** A decoy means the bridge's
  dimensional skeleton matches a *simpler/different* quantity, so all its
  physics is in the prefactor and mechanism — useful for prioritizing
  physicist review of the coefficient, not a defect.
- Never as a gate on inclusion.

## Takeaway

The audit is a clean, quantitative confirmation of the project's
governing thesis (`Bridge-Inference-Epistemics-Note.md`): dimensional
analysis is a *form* filter, not a discovery engine. It derives the
skeleton of ~1/4 of the catalog; for those, matching the engine's form
against the encoded evaluator recovers the textbook constants (ln 2,
1/4π, 1/8π, √2π, …). For the other ~3/4 it correctly declines — and the
decoy cases show it would actively mislead if trusted as a generator.
Form by dimensions; constant, and everything harder, by physics.

And — the second lesson, learned the hard way by nearly mis-reading the
result — **this is a structural measure, orthogonal to credibility.**
The cleanest established physics in the catalog (perihelion, Shapiro,
lensing) is non-derivable, because it is built on dimensionless
observables; the cleanly-derivable set is mostly speculative. The
complexity spectrum (0 → 6 free parameters) is the right way to read the
non-derived bridges: most are one or two dimensionless ratios from a
monomial, not a wall of "speculative." Use it to understand structure,
never to score belief.

## Reproduce

```bash
npx vitest run tests/dimensional/bridge-derivation-audit.test.ts
```

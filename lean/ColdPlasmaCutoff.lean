/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-106`. Bridge. The R and L cutoffs, and the whistler limit.

Proved under these hypotheses. The cold-plasma refractive indices are
the Stix values

```
n_R² = 1 − ω_p² / (ω (ω − ω_c))
n_L² = 1 − ω_p² / (ω (ω + ω_c))
```

A cutoff is `n = 0`, so `ω(ω ∓ ω_c) = ω_p²`. The nonnegative roots are

```
ω_R = (ω_c + √(ω_c² + 4 ω_p²)) / 2
ω_L = (−ω_c + √(ω_c² + 4 ω_p²)) / 2
```

for `ω_c ≥ 0`. The whistler limit is a further hypothesis on the R mode:
drop the leading `1`, and replace `ω_c − ω` by `ω_c` because `ω ≪ ω_c`.
What is proved from that simplified dispersion `n² = ω_p² / (ω ω_c)`,
together with `n = c k / ω` and `d_e = c / ω_p`, is
`ω = ω_c (k d_e)²`. The Stix dielectric is not re-derived.
-/

namespace PhysJS.ColdPlasmaCutoff

/-- Vanishing refractive index is the cutoff quadratic. -/
theorem refractive_cutoff (n ω ωp ωc : ℝ) (hden : ω * (ω - ωc) ≠ 0)
    (hn : n ^ 2 = 1 - ωp ^ 2 / (ω * (ω - ωc))) (h0 : n = 0) :
    ω * (ω - ωc) = ωp ^ 2 := by
  have h := hn
  rw [h0] at h
  have h1 : ωp ^ 2 / (ω * (ω - ωc)) = 1 := by linarith
  rw [div_eq_iff hden] at h1
  linarith

/-- The R-cutoff root solves `ω(ω − ω_c) = ω_p²`. `ω_c ≥ 0` makes it nonnegative. -/
theorem cutoff_R (ωp ωc : ℝ) (hc : 0 ≤ ωc) :
    let ωR := (ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2
    ωR * (ωR - ωc) = ωp ^ 2 ∧ 0 ≤ ωR := by
  intro ωR
  have hdis : 0 ≤ ωc ^ 2 + 4 * ωp ^ 2 := by positivity
  have hs : Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2) ^ 2 = ωc ^ 2 + 4 * ωp ^ 2 :=
    Real.sq_sqrt hdis
  constructor
  · dsimp [ωR]
    have hform :
        (ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2 *
          ((ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2 - ωc) =
          (Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2) ^ 2 - ωc ^ 2) / 4 := by ring
    rw [hform, hs]
    ring
  · dsimp [ωR]
    positivity

/-- The L-cutoff root solves `ω(ω + ω_c) = ω_p²`. -/
theorem cutoff_L (ωp ωc : ℝ) (hc : 0 ≤ ωc) :
    let ωL := (-ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2
    ωL * (ωL + ωc) = ωp ^ 2 ∧ 0 ≤ ωL := by
  intro ωL
  have hdis : 0 ≤ ωc ^ 2 + 4 * ωp ^ 2 := by positivity
  have hs : Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2) ^ 2 = ωc ^ 2 + 4 * ωp ^ 2 :=
    Real.sq_sqrt hdis
  constructor
  · dsimp [ωL]
    have hform :
        (-ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2 *
          ((-ωc + Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2)) / 2 + ωc) =
          (Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2) ^ 2 - ωc ^ 2) / 4 := by ring
    rw [hform, hs]
    ring
  · dsimp [ωL]
    have hsq : ωc ^ 2 ≤ ωc ^ 2 + 4 * ωp ^ 2 := by linarith [sq_nonneg ωp]
    have habs : Real.sqrt (ωc ^ 2) ≤ Real.sqrt (ωc ^ 2 + 4 * ωp ^ 2) :=
      Real.sqrt_le_sqrt hsq
    rw [Real.sqrt_sq hc] at habs
    linarith

/-- Whistler limit of the simplified R-mode dispersion.

`hdisp` already drops the leading `1` and replaces `ω_c − ω` by `ω_c`.
`hn` is `n = c k / ω`. `hde` is the electron inertial length. -/
theorem whistler_limit (n ω ωp ωc c k de : ℝ)
    (hω : ω ≠ 0) (hωp : ωp ≠ 0) (hωc : ωc ≠ 0)
    (hn : n = c * k / ω)
    (hdisp : n ^ 2 = ωp ^ 2 / (ω * ωc))
    (hde : de = c / ωp) :
    ω = ωc * (k * de) ^ 2 := by
  have h := hdisp
  rw [hn] at h
  have hclear : (c * k) ^ 2 * ωc = ωp ^ 2 * ω := by
    have hl : (c * k / ω) ^ 2 * (ω ^ 2 * ωc) = (c * k) ^ 2 * ωc := by field_simp [hω]
    have hr : ωp ^ 2 / (ω * ωc) * (ω ^ 2 * ωc) = ωp ^ 2 * ω := by field_simp [hω, hωc]
    have h2 := congrArg (fun z => z * (ω ^ 2 * ωc)) h
    rw [hl, hr] at h2
    exact h2
  rw [hde]
  apply mul_left_cancel₀ (pow_ne_zero 2 hωp)
  calc
    ωp ^ 2 * ω = (c * k) ^ 2 * ωc := hclear.symm
    _ = ωp ^ 2 * (ωc * (k * (c / ωp)) ^ 2) := by field_simp [hωp]

end PhysJS.ColdPlasmaCutoff

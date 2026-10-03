/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-71`. Bridge. The Clapeyron slope.

The catalog equation is

```
dP/dT = L / (T Δv) = Δs / Δv
```

along a coexistence curve. `entropy_slope` differentiates the equality of
specific Gibbs free energies. On the curve, `g1 = g2` as functions of `T`.
Each phase contributes the Gibbs differential pulled back to that curve,

```
dg = −s dT + v dP
```

so the derivative at `T0` is `−s + v dP/dT`. Neither differential is
derived from a Legendre transform. `slope_eq` puts in the latent-heat
definition `L = T (s2 − s1)`, reversible and isothermal, and concludes
`dP/dT = L / (T (v2 − v1))`. Entropies and volumes are per the same
amount of one constituent. The ideal-gas step that drops the liquid
volume is not this theorem.

`temperature_factor_needed` drops `T` and fails when `T ≠ 1`.
`liquid_volume_needed` replaces `Δv` by one volume and fails when the
other volume is nonzero. `coefficient_not_fixed` separates any other
factor from `1`.
-/

namespace PhysJS.Clapeyron

/-- Equality of Gibbs free energies along the curve gives `Δs / Δv`.

`hcoex` restricts both phases to the coexistence curve. `h1` and `h2`
are `dg = −s dT + v dP` at `T0`. `v2 − v1 ≠ 0`. -/
theorem entropy_slope (g1 g2 P : ℝ → ℝ) (s1 s2 v1 v2 T0 : ℝ)
    (hcoex : g1 = g2)
    (h1 : HasDerivAt g1 (-s1 + v1 * deriv P T0) T0)
    (h2 : HasDerivAt g2 (-s2 + v2 * deriv P T0) T0)
    (hΔv : v2 - v1 ≠ 0) :
    deriv P T0 = (s2 - s1) / (v2 - v1) := by
  have heq : -s1 + v1 * deriv P T0 = -s2 + v2 * deriv P T0 := by
    rw [← h1.deriv, ← h2.deriv, hcoex]
  have hdiff : (v2 - v1) * deriv P T0 = s2 - s1 := by
    linear_combination -heq
  rw [eq_div_iff hΔv, mul_comm]
  exact hdiff

/-- Latent heat `L = T Δs` turns the entropy slope into `L / (T Δv)`.

`hL` is the reversible isothermal definition. It is not an integrated
vapor-pressure law.

Kind `bridge` on `PhysJS.Clapeyron.slope_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. -/
theorem slope_eq (g1 g2 P : ℝ → ℝ) (s1 s2 v1 v2 L T0 : ℝ)
    (hcoex : g1 = g2)
    (h1 : HasDerivAt g1 (-s1 + v1 * deriv P T0) T0)
    (h2 : HasDerivAt g2 (-s2 + v2 * deriv P T0) T0)
    (hΔv : v2 - v1 ≠ 0) (hT : T0 ≠ 0) (hL : L = T0 * (s2 - s1)) :
    deriv P T0 = L / (T0 * (v2 - v1)) := by
  have hs := entropy_slope g1 g2 P s1 s2 v1 v2 T0 hcoex h1 h2 hΔv
  rw [hs, hL]
  field_simp [hT, hΔv]

/-- The two catalog writings agree when `L = T Δs`. -/
theorem latent_matches_entropy (L T Δs Δv : ℝ) (hT : T ≠ 0) (hΔv : Δv ≠ 0)
    (hL : L = T * Δs) :
    L / (T * Δv) = Δs / Δv := by
  rw [hL]
  field_simp [hT, hΔv]

/-- Dropping `T` fails when `T ≠ 1`. -/
theorem temperature_factor_needed (L T Δv : ℝ) (hL : L ≠ 0) (hT : T ≠ 0)
    (hT1 : T ≠ 1) (hΔv : Δv ≠ 0) :
    L / (T * Δv) ≠ L / Δv := by
  intro hEq
  field_simp [hL, hT, hΔv] at hEq
  exact hT1 hEq.symm

/-- Using one phase volume in place of `Δv` fails when the other is nonzero. -/
theorem liquid_volume_needed (L T vGas vLiq : ℝ) (hL : L ≠ 0) (hT : T ≠ 0)
    (hGas : vGas ≠ 0) (hLiq : vLiq ≠ 0) (hΔ : vGas - vLiq ≠ 0) :
    L / (T * (vGas - vLiq)) ≠ L / (T * vGas) := by
  intro hEq
  field_simp [hL, hT, hGas, hΔ] at hEq
  exact hLiq (by linarith)

/-- `dP/dT = C L / (T Δv)`. `C` is unfixed. -/
theorem coefficient_not_fixed (L T Δv C : ℝ) (hL : L ≠ 0) (hT : T ≠ 0)
    (hΔv : Δv ≠ 0) (hC : C ≠ 1) :
    C * (L / (T * Δv)) ≠ L / (T * Δv) := by
  intro hEq
  field_simp [hL, hT, hΔv] at hEq
  exact hC hEq

end PhysJS.Clapeyron

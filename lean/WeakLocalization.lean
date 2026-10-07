/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-190`. Bridge. Two-dimensional weak-localization correction.

The catalog equation is

```
Δσ = −(e² / (π h)) ln(τ_φ / τ)        per spin species, 2D, orthogonal class
```

`e` is the elementary charge, `τ` the elastic time, `τ_φ` the dephasing time.
`weak_localization_eq` derives the logarithm and the coefficient from two
premises. The first is the 2D diffusive return probability density
`P(t) = 1 / (4 π D t)`. The second is the Cooperon weight: interference of
time-reversed paths subtracts conductance in proportion to the return
probability integrated between the elastic time and the dephasing time,

```
Δσ = −(2 e² D / (π ℏ)) ∫_τ^{τ_φ} P(t) dt
```

(this weight is convention-dependent, depends on spin counting and symmetry
class, and is taken as a hypothesis, not derived; it is the same for any `D`,
which cancels). The integral `∫_τ^{τ_φ} dt / t = ln(τ_φ / τ)` is proved, and
`h = 2 π ℏ` gives `2 e² D / (π ℏ) · 1 / (4 π D) = e² / (π h)`.

`more_dephasing_more_localization` is the sign and monotonicity: for
`τ_φ > τ` the correction is negative and decreases with `τ_φ`.
`coefficient_not_fixed` separates any other weight from `e² / (π h)`. Not a
derivation of the Cooperon, and the spin-orbit sign flip (antilocalization) is
outside this file.
-/

namespace PhysJS.WeakLocalization

open Real

/-- 2D return probability density at time `t`. -/
noncomputable def returnProb (D t : ℝ) : ℝ := 1 / (4 * π * D * t)

/-- `∫_τ^{τ_φ} P(t) dt = ln(τ_φ / τ) / (4 π D)`. -/
lemma return_integral (D τ τφ : ℝ) (hD : 0 < D) (hτ : 0 < τ) (hτφ : 0 < τφ) :
    ∫ t in τ..τφ, returnProb D t = Real.log (τφ / τ) / (4 * π * D) := by
  have h : ∀ t, returnProb D t = (1 / (4 * π * D)) * t⁻¹ := by
    intro t; unfold returnProb; field_simp
  simp_rw [h]
  rw [intervalIntegral.integral_const_mul, integral_inv_of_pos hτ hτφ]
  ring

/-- Weak-localization correction from the return-probability integral.

`hweight` is the Cooperon weight (convention-dependent premise). `hh` is
`h = 2 π ℏ`.

Kind `bridge` on `PhysJS.WeakLocalization.weak_localization_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
The weight and the symmetry class are hypotheses, not derived. -/
theorem weak_localization_eq (Δσ e D ħ h τ τφ : ℝ)
    (hD : 0 < D) (hħ : 0 < ħ) (hτ : 0 < τ) (hτφ : 0 < τφ)
    (hh : h = 2 * π * ħ)
    (hweight : Δσ = -(2 * e ^ 2 * D / (π * ħ)) * ∫ t in τ..τφ, returnProb D t) :
    Δσ = -(e ^ 2 / (π * h)) * Real.log (τφ / τ) := by
  have hπ : 0 < π := pi_pos
  rw [hweight, return_integral D τ τφ hD hτ hτφ, hh]
  field_simp
  ring

/-- Sign and monotonicity of the correction. -/
theorem more_dephasing_more_localization (e h τ τφ τφ' : ℝ)
    (he : e ≠ 0) (hh : 0 < h) (hτ : 0 < τ) (hlt : τ < τφ) (hlt' : τφ < τφ') :
    -(e ^ 2 / (π * h)) * Real.log (τφ / τ) < 0 ∧
      -(e ^ 2 / (π * h)) * Real.log (τφ' / τ) < -(e ^ 2 / (π * h)) * Real.log (τφ / τ) := by
  have hπ : 0 < π := pi_pos
  have hc : 0 < e ^ 2 / (π * h) := by positivity
  have hτφ : 0 < τφ := by linarith
  have hτφ' : 0 < τφ' := by linarith
  have h1 : 0 < Real.log (τφ / τ) := Real.log_pos ((one_lt_div hτ).2 hlt)
  have h2 : Real.log (τφ / τ) < Real.log (τφ' / τ) :=
    Real.log_lt_log (by positivity) ((div_lt_div_iff_of_pos_right hτ).2 hlt')
  constructor <;> nlinarith

/-- Any other weight gives a different coefficient. -/
theorem coefficient_not_fixed (e h c : ℝ) (he : e ≠ 0) (hh : 0 < h) (hc : c ≠ 1) :
    c * (e ^ 2 / (π * h)) ≠ e ^ 2 / (π * h) := by
  intro hEq
  have hπ : 0 < π := pi_pos
  have hp : e ^ 2 / (π * h) ≠ 0 := by positivity
  apply hc
  exact mul_right_cancel₀ hp (by simpa using hEq : c * (e ^ 2 / (π * h)) = 1 * (e ^ 2 / (π * h)))

end PhysJS.WeakLocalization

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-24`. Förster resonance, as a cross-check.

```
k_FRET = (1/τ_D) (R₀/R)^6
η = R₀^6 / (R₀^6 + R^6) = 1 / (1 + (R/R₀)^6)
η = k_FRET / (k_FRET + 1/τ_D)
```

`η(R₀, R₀) = 1/2` holds for any positive power, so it is not the control.
At `R = 2 R₀` the exponent 4 is not the exponent 6. `η` decreases on
`(0, ∞)`. The dipole–dipole law is a premise. This is not a formalRef.
-/

namespace PhysJS.Fret

/-- Transfer rate `(1/τ_D) (R₀/R)^6`. -/
noncomputable def kFret (τ R0 R : ℝ) : ℝ := (1 / τ) * (R0 / R) ^ 6

/-- Efficiency `R₀^6 / (R₀^6 + R^6)`. -/
noncomputable def eta (R0 R : ℝ) : ℝ := R0 ^ 6 / (R0 ^ 6 + R ^ 6)

/-- The same efficiency with a chosen positive integer power. -/
noncomputable def etaPow (n : ℕ) (R0 R : ℝ) : ℝ := R0 ^ n / (R0 ^ n + R ^ n)

/-- The three readings of the efficiency agree, and `η` falls as `R` grows.

Covers the cross-check of `be-24`, not a derivation of the dipole–dipole law. -/
theorem dictionary (τ R0 R : ℝ) (hτ : 0 < τ) (hR0 : 0 < R0) (hR : 0 < R) :
    eta R0 R = 1 / (1 + (R / R0) ^ 6) ∧
      eta R0 R = kFret τ R0 R / (kFret τ R0 R + 1 / τ) ∧
      ∀ R1 R2 : ℝ, 0 < R1 → R1 < R2 → eta R0 R2 < eta R0 R1 := by
  refine ⟨?_, ?_, ?_⟩
  · unfold eta
    field_simp [hR0.ne', hR.ne']
  · unfold eta kFret
    field_simp [hτ.ne', hR0.ne', hR.ne']
  · intro R1 R2 hR1 hlt
    unfold eta
    have hnum : 0 < R0 ^ 6 := by positivity
    have hden1 : 0 < R0 ^ 6 + R1 ^ 6 := by positivity
    have hden2 : 0 < R0 ^ 6 + R2 ^ 6 := by positivity
    have hpow : R1 ^ 6 < R2 ^ 6 := by
      exact pow_lt_pow_left₀ hlt hR1.le (by norm_num : (6 : ℕ) ≠ 0)
    have hden : R0 ^ 6 + R1 ^ 6 < R0 ^ 6 + R2 ^ 6 := by linarith
    exact div_lt_div_of_pos_left hnum hden1 hden

/-- At `R = 2 R₀`, exponent 4 is not exponent 6. `η(R₀, R₀) = 1/2` is not this control. -/
theorem wrong_dictionary_exponent_four (R0 : ℝ) (hR0 : 0 < R0) :
    etaPow 4 R0 (2 * R0) ≠ etaPow 6 R0 (2 * R0) := by
  unfold etaPow
  intro h
  field_simp [hR0.ne'] at h
  norm_num at h

end PhysJS.Fret

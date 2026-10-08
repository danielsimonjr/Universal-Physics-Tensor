/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-132`. Bridge. Coaxial capacitance per unit length.

The catalog equation is

```
C' = 2 π ε / ln(b / a)
```

`capacitance_per_length` derives it. Gauss's law on a long cylinder gives
the radial field `E = λ / (2 π ε r)` between the inner radius `a` and the
outer radius `b`. The potential difference is the integral of `1/r`.
Capacitance per length is `λ / ΔV`. End fringe is neglected.
`factor_not_one` drops the `2 π`. A parallel-plate `ε A / d` is not this
logarithm.
-/

namespace PhysJS.CoaxialCapacitance

open intervalIntegral

/-- Integral of the coaxial field. The `ln(b/a)` is `∫_a^b dr/r`. -/
theorem voltage_drop (a b lam ε : ℝ) (ha : 0 < a) (hb : 0 < b) (hε : ε ≠ 0) :
    (∫ r in a..b, lam / (2 * Real.pi * ε * r)) =
      (lam / (2 * Real.pi * ε)) * Real.log (b / a) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hcoef : ∀ r, lam / (2 * Real.pi * ε * r) =
      (lam / (2 * Real.pi * ε)) * (1 / r) := by
    intro r
    by_cases hr : r = 0
    · simp [hr]
    · field_simp [hπ, hε, hr]
  rw [integral_congr (fun r _ => hcoef r), integral_const_mul, integral_one_div_of_pos ha hb]

/-- Coaxial capacitance per length. `hV` is the integral of the Gauss field
from `a` to `b`. `hC` is `C' = λ / ΔV`.

Not `ε A / d`. -/
theorem capacitance_per_length (a b lam ε V C : ℝ)
    (ha : 0 < a) (hb : 0 < b) (hab : a ≠ b) (hε : ε ≠ 0) (hlam : lam ≠ 0)
    (hV : V = ∫ r in a..b, lam / (2 * Real.pi * ε * r))
    (hC : C = lam / V) :
    C = 2 * Real.pi * ε / Real.log (b / a) := by
  have hdrop := voltage_drop a b lam ε ha hb hε
  have hlog : Real.log (b / a) ≠ 0 := by
    intro hzero
    have hpos : 0 < b / a := div_pos hb ha
    have hrev := congrArg Real.exp hzero
    rw [Real.exp_log hpos, Real.exp_zero] at hrev
    have hb_eq : b = a := by
      field_simp [ha.ne'] at hrev
      linarith
    exact hab hb_eq.symm
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hVval : V = (lam / (2 * Real.pi * ε)) * Real.log (b / a) := by
    rw [hV, hdrop]
  have hV0 : V ≠ 0 := by
    rw [hVval]
    exact mul_ne_zero (div_ne_zero hlam (mul_ne_zero (mul_ne_zero (by norm_num) hπ) hε)) hlog
  rw [hC, hVval]
  field_simp [hlam, hπ, hε, hlog]

/-- `ε / ln(b/a)` drops `2 π`. -/
theorem factor_not_one (a b ε : ℝ) (ha : 0 < a) (hb : 0 < b) (hab : a ≠ b) (hε : ε ≠ 0) :
    ε / Real.log (b / a) ≠ 2 * Real.pi * ε / Real.log (b / a) := by
  intro hEq
  have hlog : Real.log (b / a) ≠ 0 := by
    intro hzero
    have hpos : 0 < b / a := div_pos hb ha
    have hrev := congrArg Real.exp hzero
    rw [Real.exp_log hpos, Real.exp_zero] at hrev
    have hb_eq : b = a := by
      field_simp [ha.ne'] at hrev
      linarith
    exact hab hb_eq.symm
  rw [div_eq_div_iff hlog hlog] at hEq
  have hπ : (2 : ℝ) * Real.pi ≠ 1 := by
    intro h
    have : Real.pi = 1 / 2 := by
      field_simp at h
      linarith
    have hgt : (3 : ℝ) < Real.pi := Real.pi_gt_three
    linarith
  have hscaled : (1 : ℝ) * (ε * Real.log (b / a)) = (2 * Real.pi) * (ε * Real.log (b / a)) := by
    linarith
  have : (1 : ℝ) = 2 * Real.pi := mul_right_cancel₀ (mul_ne_zero hε hlog) hscaled
  exact hπ this.symm

end PhysJS.CoaxialCapacitance

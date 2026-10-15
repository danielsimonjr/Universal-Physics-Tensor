/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-198`. Bridge. Stromgren radius.

The catalog equation is

```
R_S = (3 Q / (4 π α_B n²))^(1/3)
```

Proved under these hypotheses. A uniform, pure-hydrogen cloud of
(electron = proton) density `n` is ionized inside a sharp sphere of
radius `R`. In steady state the ionizing photon rate `Q` is spent on
recombinations to excited states (case B, coefficient `α_B`):
`Q = (4π/3) R³ n² α_B`. `cube_eq` is `R³ = 3Q/(4π α_B n²)`; `radius_eq`
takes the real cube root. `Q_scaling` is the `Q^(1/3)` law
(`R(8Q) = 2 R`).

Not proved: the value or temperature dependence of `α_B` (atomic
physics, a hypothesis), the case-B premise that recombinations to the
ground state are absorbed on the spot, the sharp boundary, or a
numerical radius. `3/(4π)` comes from the sphere volume, and units alone
do not fix it: `exponent_not_fixed` records that the exponent is not a units fact.
-/

namespace PhysJS.Stromgren

open Real

/-- Ionization balance solved for `R³`. -/
theorem cube_eq (Q R α n : ℝ) (hα : α ≠ 0) (hn : n ≠ 0)
    (hbal : Q = 4 * Real.pi / 3 * R ^ 3 * n ^ 2 * α) :
    R ^ 3 = 3 * Q / (4 * Real.pi * α * n ^ 2) := by
  have hpi : Real.pi ≠ 0 := Real.pi_ne_zero
  rw [eq_div_iff (by positivity), hbal]
  field_simp

/-- Stromgren radius. -/
theorem radius_eq (Q R α n : ℝ) (hR : 0 < R) (hα : 0 < α) (hn : n ≠ 0)
    (hbal : Q = 4 * Real.pi / 3 * R ^ 3 * n ^ 2 * α) :
    R = (3 * Q / (4 * Real.pi * α * n ^ 2)) ^ (1 / 3 : ℝ) := by
  rw [← cube_eq Q R α n hα.ne' hn hbal, ← Real.rpow_natCast, ← Real.rpow_mul hR.le]
  norm_num

/-- `R ∝ Q^(1/3)`: eight times the photon rate doubles the radius. -/
theorem Q_scaling (Q α n : ℝ) (hQ : 0 < Q) (hα : 0 < α) :
    (3 * (8 * Q) / (4 * Real.pi * α * n ^ 2)) ^ (1 / 3 : ℝ) =
      2 * (3 * Q / (4 * Real.pi * α * n ^ 2)) ^ (1 / 3 : ℝ) := by
  have h8 : (8 : ℝ) ^ (1 / 3 : ℝ) = 2 := by
    rw [show (8 : ℝ) = 2 ^ (3 : ℝ) by norm_num, ← Real.rpow_mul (by norm_num)]
    norm_num
  rw [show 3 * (8 * Q) / (4 * Real.pi * α * n ^ 2) =
      8 * (3 * Q / (4 * Real.pi * α * n ^ 2)) by ring]
  by_cases hn : n = 0
  · subst hn
    simp
  · rw [Real.mul_rpow (by norm_num) (by positivity), h8]

/-- Units do not entail the exponent: for a dimensionless group `A > 1`,
the powers `1/3` and `1/2` give different values, so `α n / Q`-type
groups leave the exponent free until the sphere-volume balance fixes it. -/
theorem exponent_not_fixed (A : ℝ) (hA : 1 < A) :
    A ^ (1 / 3 : ℝ) ≠ A ^ (1 / 2 : ℝ) := by
  intro h
  have := Real.rpow_lt_rpow_of_exponent_lt hA (by norm_num : (1 / 3 : ℝ) < 1 / 2)
  linarith

end PhysJS.Stromgren

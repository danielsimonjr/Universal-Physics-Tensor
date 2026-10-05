/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-112`. Bridge. The E×B drift.

Proved under these hypotheses. The charge is steady, so
`q (E + v × B) = 0` with `q ≠ 0`. The field `B` is along `z` and `E`
has no parallel part. The cross product is the component identity
`v × B = (v_y B, −v_x B)`. Then `v_x = E_y / B` and `v_y = −E_x / B`,
which is `(E × B) / B²`. The charge cancels. Reversing the sign of `q`
does not reverse this drift. Polarization drift is not this statement.
-/

namespace PhysJS.ExBDrift

/-- Steady perpendicular drift for `B` along `z`.

`hx` and `hy` are the two components of `E + v × B = 0`. -/
theorem drift_eq (q Ex Ey B vx vy : ℝ) (hq : q ≠ 0) (hB : B ≠ 0)
    (hx : q * Ex + q * vy * B = 0)
    (hy : q * Ey - q * vx * B = 0) :
    vx = Ey / B ∧ vy = -Ex / B := by
  have hx' : Ex + vy * B = 0 := by
    have : q * (Ex + vy * B) = 0 := by linear_combination hx
    exact (mul_eq_zero.mp this).resolve_left hq
  have hy' : Ey - vx * B = 0 := by
    have : q * (Ey - vx * B) = 0 := by linear_combination hy
    exact (mul_eq_zero.mp this).resolve_left hq
  constructor
  · rw [eq_div_iff hB]
    linarith
  · rw [eq_div_iff hB]
    linarith

/-- The same components with the opposite charge have the same solution. -/
theorem charge_sign_cancels (q Ex Ey B vx vy : ℝ) (hq : q ≠ 0) (hB : B ≠ 0)
    (hx : q * Ex + q * vy * B = 0)
    (hy : q * Ey - q * vx * B = 0) :
    (-q) * Ex + (-q) * vy * B = 0 ∧ (-q) * Ey - (-q) * vx * B = 0 ∧
      vx = Ey / B ∧ vy = -Ex / B := by
  have hsol := drift_eq q Ex Ey B vx vy hq hB hx hy
  refine ⟨?_, ?_, hsol⟩
  · linear_combination -hx
  · linear_combination -hy

end PhysJS.ExBDrift

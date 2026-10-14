/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Sqrt
import Mathlib.Tactic

/-!
Shared real inequalities for the rank-1 dispersion bounds.

Each bound is an error of the shape `(s - 1) / (s + 1)` or `√(1 + ·) - 1`.
The lemmas here are the monotonicity steps those bounds share.
-/

namespace PhysJS

open Real

lemma sqrt_one_le_sqrt_one_add_sq (x : ℝ) : 1 ≤ sqrt (1 + x ^ 2) := by
  calc
    (1 : ℝ) = sqrt 1 := by rw [sqrt_one]
    _ ≤ sqrt (1 + x ^ 2) := sqrt_le_sqrt (by nlinarith [sq_nonneg x])

/-- `(t - 1) / (t + 1)` increases for `t ≥ 1`. -/
lemma div_sub_one_mono {a b : ℝ} (ha : 1 ≤ a) (hab : a ≤ b) :
    (a - 1) / (a + 1) ≤ (b - 1) / (b + 1) := by
  have ha1 : 0 < a + 1 := by linarith
  have hb1 : 0 < b + 1 := by linarith
  rw [div_le_div_iff₀ ha1 hb1]
  nlinarith

/-- `(1 - t) / (1 + t)` decreases for `t ≥ 0`. -/
lemma div_one_sub_antitone {a b : ℝ} (ha : 0 ≤ a) (hb : 0 ≤ b) (hab : a ≤ b) :
    (1 - b) / (1 + b) ≤ (1 - a) / (1 + a) := by
  have ha1 : 0 < 1 + a := by linarith
  have hb1 : 0 < 1 + b := by linarith
  rw [div_le_div_iff₀ hb1 ha1]
  nlinarith

end PhysJS

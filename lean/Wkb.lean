/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
Theorems about the catalog's rectangular-barrier formulas. The guard is shared by
`be-26` and `be-26-wkb`. The rate bound applies to `be-26-wkb`, with no biological
correction factor. The statements concern the encoded regime and the scalar formula.
-/

namespace PhysJS.Wkb

/--
`be-26`. Property. The squared catalog guard for the rectangular barrier is equivalent
to a lower bound on width. The parameter `d` is the positive gap between barrier and
particle energy.
-/
theorem guard_iff_width (m d L hbar : ℝ)
    (hm : 0 < m) (hd : 0 < d) (hL : 0 < L) (hh : 0 < hbar) :
    100 * hbar ^ 2 ≤ 8 * m * d * L ^ 2 ↔
      5 * hbar / Real.sqrt (2 * m * d) ≤ L := by
  have hx : 0 < 2 * m * d := by positivity
  have hs := Real.sqrt_pos.2 hx
  rw [div_le_iff₀ hs]
  have hprod : 0 ≤ L * Real.sqrt (2 * m * d) := by positivity
  have hfive : 0 ≤ 5 * hbar := by positivity
  rw [← sq_le_sq₀ hfive hprod, mul_pow, mul_pow, Real.sq_sqrt hx.le]
  constructor <;> intro h <;> nlinarith only [h]

/--
`be-26.bareRateBound`. Property. The guard bounds the bare rectangular-barrier WKB rate
by its value at exponent ten.
-/
theorem bare_rate_bound (m d L hbar nu : ℝ)
    (hm : 0 < m) (hd : 0 < d) (hL : 0 < L) (hh : 0 < hbar)
    (hnu : 0 ≤ nu) (hguard : 100 * hbar ^ 2 ≤ 8 * m * d * L ^ 2) :
    nu * Real.exp (-(2 / hbar * Real.sqrt (2 * m * d) * L)) ≤
      nu * Real.exp (-10) := by
  have hs : 0 < Real.sqrt (2 * m * d) := Real.sqrt_pos.2 (by positivity)
  have hw := (guard_iff_width m d L hbar hm hd hL hh).1 hguard
  have hp := (div_le_iff₀ hs).1 hw
  have hrate : 10 ≤ 2 * (L * Real.sqrt (2 * m * d)) / hbar := by
    apply (le_div_iff₀ hh).2
    linarith only [hp]
  apply mul_le_mul_of_nonneg_left _ hnu
  apply Real.exp_le_exp.mpr
  convert neg_le_neg hrate using 1; ring

end PhysJS.Wkb

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-64`. The Eddington balance cancels `r²`.

The encoded luminosity is `L = 4 π G M m_p c / σ_T`. For `r > 0`, `σ_T > 0`,
and `c > 0`, that luminosity is exactly the one at which the Thomson force on
the electrons equals the gravitational force on the protons. Both forces are
premises. The radius drops out of the comparison. This is not a proof that the
luminosity is a hard cap.
-/

namespace PhysJS.Eddington

open Real

/-- The radiation-pressure balance holds if and only if `L` is the encoded
Eddington luminosity. The factor `r²` cancels.

Covers the derivation step of `be-64`, not a hard cap. -/
theorem balance_iff (L G M mp σT r c : ℝ) (hr : 0 < r) (hσ : 0 < σT) (hc : 0 < c) :
    L * σT / (4 * π * r ^ 2 * c) = G * M * mp / r ^ 2 ↔
      L = 4 * π * G * M * mp * c / σT := by
  have hr0 : r ≠ 0 := hr.ne'
  have hσ0 : σT ≠ 0 := hσ.ne'
  have hc0 : c ≠ 0 := hc.ne'
  have hr2 : r ^ 2 ≠ 0 := pow_ne_zero 2 hr0
  have hden : 4 * π * r ^ 2 * c ≠ 0 :=
    mul_ne_zero (mul_ne_zero (mul_ne_zero four_ne_zero pi_ne_zero) hr2) hc0
  rw [div_eq_div_iff hden hr2]
  constructor
  · intro h
    have hcancel : L * σT = 4 * π * G * M * mp * c := by
      apply mul_right_cancel₀ hr2
      calc
        L * σT * r ^ 2 = G * M * mp * (4 * π * r ^ 2 * c) := h
        _ = 4 * π * G * M * mp * c * r ^ 2 := by ring
    rw [eq_div_iff hσ0]
    exact hcancel
  · intro h
    rw [h, div_mul_cancel₀ _ hσ0]
    ring

/-- A factor of `2` on the luminosity does not satisfy the same balance, once
every constant in the encoded formula is positive. -/
theorem wrong_dictionary_factor_two (G M mp σT r c : ℝ) (hG : 0 < G) (hM : 0 < M)
    (hmp : 0 < mp) (hσ : 0 < σT) (hr : 0 < r) (hc : 0 < c) :
    (2 * (4 * π * G * M * mp * c / σT)) * σT / (4 * π * r ^ 2 * c) ≠
      G * M * mp / r ^ 2 := by
  intro h
  have hL :=
    (balance_iff (2 * (4 * π * G * M * mp * c / σT)) G M mp σT r c hr hσ hc).1 h
  have hpos : 0 < 4 * π * G * M * mp * c / σT := by positivity
  have htwice : 2 * (4 * π * G * M * mp * c / σT) = 4 * π * G * M * mp * c / σT := hL
  nlinarith

end PhysJS.Eddington

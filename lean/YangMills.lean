/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Ring

/-!
`be-53`. Derivation step. The sign of the one-loop coefficient, and the closed form of the running.

`be-53.oneLoop`. Derivation step. `alphaRun_hasDerivAt`.

`b₀ = (11/3) N_c − (2/3) N_f` for SU(`N_c`) fundamentals. For SU(3),
`0 < b₀` if and only if `N_f ≤ 16`. At 16 the value is `1/3`. At 17 it is
negative. The zero of the real function is `33/2`; the sign theorem is the
integer case. A positive `b₀` is asymptotic freedom in this one-loop
truncation. It does not unblock the confrontation that refuses the one-loop
formula as a running procedure.

The running solution is `α(t) = α₀ / (1 + b₀ α₀ t / (2π))` wherever the
denominator is positive. The `β(g)` convention is the same truncation, read
through `α = g² / (4π)`.
-/

namespace PhysJS.YangMills

open Real Filter

/-- One-loop coefficient `b₀ = (11/3) N_c − (2/3) N_f`. -/
def b0 (Nc Nf : ℚ) : ℚ := (11 / 3) * Nc - (2 / 3) * Nf

lemma b0_su3 (Nf : ℚ) : b0 3 Nf = (33 - 2 * Nf) / 3 := by
  unfold b0
  ring

/-- At sixteen flavors the SU(3) coefficient is `1/3`. -/
theorem b0_sixteen : b0 3 16 = 1 / 3 := by
  rw [b0_su3]
  norm_num

/-- At seventeen flavors the SU(3) coefficient is negative. -/
theorem b0_seventeen : b0 3 17 = -1 / 3 := by
  rw [b0_su3]
  norm_num

/-- The real function `(11/3)·3 − (2/3) x` vanishes only at `x = 33/2`. -/
theorem b0_real_zero_iff (x : ℝ) :
    (11 / 3) * (3 : ℝ) - (2 / 3) * x = 0 ↔ x = 33 / 2 := by
  field_simp
  constructor <;> intro h <;> linarith

/-- For SU(3), `b₀` is positive if and only if the number of flavors is at most 16.

Covers the sign half of `be-53`. The reference names this theorem only. -/
theorem b0_pos_iff_nf_le (Nf : ℕ) : 0 < b0 3 (Nf : ℚ) ↔ Nf ≤ 16 := by
  rw [b0_su3]
  have h3 : (0 : ℚ) < 3 := by norm_num
  rw [div_pos_iff_of_pos_right h3]
  constructor
  · intro hpos
    by_contra hgt
    have h17 : 17 ≤ Nf := by omega
    have hNf : (17 : ℚ) ≤ Nf := by exact_mod_cast h17
    have : (33 : ℚ) ≤ 2 * (Nf : ℚ) := by linarith
    linarith
  · intro hle
    have hNf : (Nf : ℚ) ≤ 16 := by exact_mod_cast hle
    linarith

/-- `N_f = 17` fails the positive-`b₀` claim. -/
theorem wrong_dictionary_seventeen : ¬ 0 < b0 3 (17 : ℚ) := by
  intro h
  have hle : (17 : ℕ) ≤ 16 := (b0_pos_iff_nf_le 17).1 h
  omega

/-! ## One-loop running solution -/

/-- Denominator of the one-loop solution, `1 + b₀ α₀ t / (2π)`. -/
noncomputable def denom (b0 α0 t : ℝ) : ℝ := 1 + b0 * α0 * t / (2 * π)

/-- The closed form `α(t) = α₀ / (1 + b₀ α₀ t / (2π))`. -/
noncomputable def alphaRun (b0 α0 t : ℝ) : ℝ := α0 / denom b0 α0 t

lemma denom_eq_linear (b0 α0 t : ℝ) : denom b0 α0 t = 1 + (b0 * α0 / (2 * π)) * t := by
  unfold denom
  ring

lemma alphaRun_eq_mul_inv (b0 α0 t : ℝ) : alphaRun b0 α0 t = α0 * (denom b0 α0 t)⁻¹ := by
  unfold alphaRun
  rw [div_eq_mul_inv]

/-- Where the denominator is positive, the closed form solves
`dα/dt = −(b₀ / (2π)) α²`.

Covers the running solution of `be-53`, not a running procedure past one loop. -/
theorem alphaRun_hasDerivAt (b0 α0 t : ℝ) (hden : 0 < denom b0 α0 t) :
    HasDerivAt (alphaRun b0 α0) (-(b0 / (2 * π)) * alphaRun b0 α0 t ^ 2) t := by
  have hne : denom b0 α0 t ≠ 0 := hden.ne'
  have hπ : (π : ℝ) ≠ 0 := pi_ne_zero
  have hlin : HasDerivAt (fun s => 1 + (b0 * α0 / (2 * π)) * s) (b0 * α0 / (2 * π)) t :=
    (hasDerivAt_const_mul (x := t) (b0 * α0 / (2 * π))).const_add 1
  have hD : HasDerivAt (denom b0 α0) (b0 * α0 / (2 * π)) t := by
    refine hlin.congr_of_eventuallyEq ?_
    filter_upwards with s
    exact denom_eq_linear b0 α0 s
  have hinv := hD.inv hne
  have hmul := hinv.const_mul α0
  have hrun : HasDerivAt (alphaRun b0 α0)
      (α0 * (-(b0 * α0 / (2 * π)) / denom b0 α0 t ^ 2)) t := by
    refine hmul.congr_of_eventuallyEq ?_
    filter_upwards with s
    rw [alphaRun_eq_mul_inv, Pi.inv_apply]
  refine hrun.congr_deriv ?_
  rw [alphaRun_eq_mul_inv]
  field_simp [hne, hπ]

/-- With `α = g² / (4π)` and `g ≠ 0`, the one-loop `β(g)` is the logarithmic
derivative `dα/d ln μ = (g / (2π)) β(g)`. -/
theorem beta_alpha_iff (b0 g β : ℝ) (hg : g ≠ 0) :
    let α := g ^ 2 / (4 * π)
    β = -b0 * g ^ 3 / (16 * π ^ 2) ↔ (g / (2 * π)) * β = -b0 * α ^ 2 / (2 * π) := by
  intro α
  have hπ : (π : ℝ) ≠ 0 := pi_ne_zero
  have h2 : (2 : ℝ) ≠ 0 := two_ne_zero
  have hg2 : g / (2 * π) ≠ 0 := div_ne_zero hg (mul_ne_zero h2 hπ)
  constructor
  · intro h
    rw [h]
    unfold α
    field_simp [hπ, hg]
    ring
  · intro h
    have hmul := congrArg (fun z => z * ((2 * π) / g)) h
    have hcancel : (g / (2 * π)) * ((2 * π) / g) = 1 := by
      field_simp [hπ, hg]
    have hβ : β = -b0 * α ^ 2 / (2 * π) * ((2 * π) / g) := by
      calc
        β = 1 * β := by ring
        _ = (g / (2 * π)) * ((2 * π) / g) * β := by rw [hcancel]
        _ = (g / (2 * π)) * β * ((2 * π) / g) := by ring
        _ = -b0 * α ^ 2 / (2 * π) * ((2 * π) / g) := by rw [h]
    rw [hβ]
    unfold α
    field_simp [hπ, hg]
    ring

end PhysJS.YangMills

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-186`. Bridge. Ginzburg–Landau depairing current density.

The catalog equation is

```
J_d = Φ₀ / (3 √3 π μ₀ λ² ξ)
```

`Φ₀` is the flux quantum, `λ` the penetration depth, `ξ` the Ginzburg–Landau
coherence length. `depairing_eq` derives it. In the Ginzburg–Landau regime a
uniform film carrying phase gradient `q` has condensate fraction
`|ψ|² / ψ∞² = 1 − ξ² q²` and supercurrent

```
J(q) = (Φ₀ / (2 π μ₀ λ²)) q (1 − ξ² q²)
```

(this form of `J(q)` is the premise). `J` is zero at `q = 0` and at
`q = 1/ξ` and has a single maximum on `q ≥ 0`. The theorem proves that
`dJ/dq = 0` at `q* = 1 / (√3 ξ)`, that `J(q) ≤ J(q*)` for every `q ≥ 0`
(from `(s − t)² (s + 2t) ≥ 0` with `t = 1/√3`), and that `J(q*)` is the
catalog expression. `depairing_critical_field` ties it to the thermodynamic
critical field: with `B_c = Φ₀ / (2 √2 π λ ξ)` the depairing current is
`(2 √2 / (3 √3)) B_c / (μ₀ λ)`.

The form of `J(q)` and `B_c` are Ginzburg–Landau inputs and are not derived
here. Premises: GL regime near `T_c`, film narrower than `λ`, no vortices.
`exponent_needed` shows `λ² ξ` is not `λ ξ²`.
-/

namespace PhysJS.DepairingCurrent

open Real

/-- GL supercurrent at phase gradient `q`. -/
noncomputable def current (Φ0 μ0 lam ξ q : ℝ) : ℝ :=
  Φ0 / (2 * π * μ0 * lam ^ 2) * (q * (1 - ξ ^ 2 * q ^ 2))

/-- The location of the maximum, `1 / (√3 ξ)`. -/
noncomputable def qStar (ξ : ℝ) : ℝ := 1 / (√3 * ξ)

lemma sqrt3_sq : √3 ^ 2 = 3 := Real.sq_sqrt (by norm_num)

/-- The slope of `J` vanishes at `q*`. -/
lemma hasDerivAt_current (Φ0 μ0 lam ξ q : ℝ) :
    HasDerivAt (fun q => current Φ0 μ0 lam ξ q)
      (Φ0 / (2 * π * μ0 * lam ^ 2) * (1 - 3 * ξ ^ 2 * q ^ 2)) q := by
  unfold current
  have h1 : HasDerivAt (fun q : ℝ => q * (1 - ξ ^ 2 * q ^ 2))
      (1 * (1 - ξ ^ 2 * q ^ 2) + q * (-(ξ ^ 2 * (2 * q))) ) q := by
    have h2 : HasDerivAt (fun q : ℝ => 1 - ξ ^ 2 * q ^ 2) (-(ξ ^ 2 * (2 * q))) q := by
      have h0 : HasDerivAt (fun q : ℝ => ξ ^ 2 * q ^ 2) (ξ ^ 2 * ((2 : ℕ) * q ^ (2 - 1))) q :=
        (hasDerivAt_pow 2 q).const_mul (ξ ^ 2)
      have h0' : HasDerivAt (fun q : ℝ => 1 - ξ ^ 2 * q ^ 2)
          (0 - ξ ^ 2 * ((2 : ℕ) * q ^ (2 - 1))) q := HasDerivAt.sub (hasDerivAt_const q (1 : ℝ)) h0
      exact h0'.congr_deriv (by simp)
    exact (hasDerivAt_id q).mul h2
  convert h1.const_mul (Φ0 / (2 * π * μ0 * lam ^ 2)) using 1
  ring

theorem slope_zero_at_qStar (Φ0 μ0 lam ξ : ℝ) (hξ : 0 < ξ) :
    HasDerivAt (fun q => current Φ0 μ0 lam ξ q) 0 (qStar ξ) := by
  have h := hasDerivAt_current Φ0 μ0 lam ξ (qStar ξ)
  have hs : 1 - 3 * ξ ^ 2 * qStar ξ ^ 2 = 0 := by
    unfold qStar
    have h3 : √3 ≠ 0 := by positivity
    field_simp
    rw [sqrt3_sq]; ring
  rw [hs, mul_zero] at h
  exact h

/-- The maximum value. -/
theorem current_qStar (Φ0 μ0 lam ξ : ℝ) (hξ : 0 < ξ) (hμ : 0 < μ0) (hlam : 0 < lam) :
    current Φ0 μ0 lam ξ (qStar ξ) = Φ0 / (3 * √3 * π * μ0 * lam ^ 2 * ξ) := by
  unfold current qStar
  have h3 : √3 ≠ 0 := by positivity
  have hπ : π ≠ 0 := pi_ne_zero
  field_simp
  simp only [sqrt3_sq]
  ring

/-- No other phase gradient carries more current. -/
theorem current_le (Φ0 μ0 lam ξ q : ℝ) (hΦ : 0 ≤ Φ0) (hξ : 0 < ξ) (hμ : 0 < μ0)
    (hlam : 0 < lam) (hq : 0 ≤ q) :
    current Φ0 μ0 lam ξ q ≤ current Φ0 μ0 lam ξ (qStar ξ) := by
  have hK : 0 ≤ Φ0 / (2 * π * μ0 * lam ^ 2) := by positivity
  unfold current
  apply mul_le_mul_of_nonneg_left _ hK
  have h3 : 0 < √3 := by positivity
  set t := 1 / √3 with ht
  have ht0 : 0 < t := by positivity
  have ht2 : 3 * t ^ 2 = 1 := by
    rw [ht]; field_simp; rw [sqrt3_sq]
  have hs : 0 ≤ ξ * q := by positivity
  have hqs : qStar ξ = t / ξ := by
    unfold qStar; rw [ht]; field_simp
  rw [hqs]
  have key : 0 ≤ (ξ * q - t) ^ 2 * (ξ * q + 2 * t) := by positivity
  have hxq : q * (1 - ξ ^ 2 * q ^ 2) = (ξ * q - (ξ * q) ^ 3) / ξ := by
    field_simp
  have hr : t / ξ * (1 - ξ ^ 2 * (t / ξ) ^ 2) = (t - t ^ 3) / ξ := by
    field_simp
  rw [hxq, hr]
  apply div_le_div_of_nonneg_right _ hξ.le
  have : t - t ^ 3 - (ξ * q - (ξ * q) ^ 3) = (ξ * q - t) ^ 2 * (ξ * q + 2 * t) + 0 := by
    nlinarith [ht2]
  nlinarith [key, ht2]

/-- Depairing current density from the GL supercurrent.

`hJ` says the depairing density is the largest GL supercurrent over the
phase gradients `q ≥ 0`, reached at `q*`. -/
theorem depairing_eq (Jd Φ0 μ0 lam ξ : ℝ) (hΦ : 0 ≤ Φ0) (hξ : 0 < ξ) (hμ : 0 < μ0)
    (hlam : 0 < lam)
    (hJ : Jd = current Φ0 μ0 lam ξ (qStar ξ)) :
    Jd = Φ0 / (3 * √3 * π * μ0 * lam ^ 2 * ξ) ∧
      (∀ q, 0 ≤ q → current Φ0 μ0 lam ξ q ≤ Jd) ∧
      HasDerivAt (fun q => current Φ0 μ0 lam ξ q) 0 (qStar ξ) := by
  refine ⟨?_, ?_, slope_zero_at_qStar Φ0 μ0 lam ξ hξ⟩
  · rw [hJ]; exact current_qStar Φ0 μ0 lam ξ hξ hμ hlam
  · intro q hq
    rw [hJ]; exact current_le Φ0 μ0 lam ξ q hΦ hξ hμ hlam hq

/-- Relation to the thermodynamic critical field `B_c = Φ₀ / (2 √2 π λ ξ)`. -/
theorem depairing_critical_field (Jd Bc Φ0 μ0 lam ξ : ℝ) (hξ : 0 < ξ) (hμ : 0 < μ0)
    (hlam : 0 < lam)
    (hJ : Jd = Φ0 / (3 * √3 * π * μ0 * lam ^ 2 * ξ))
    (hBc : Bc = Φ0 / (2 * √2 * π * lam * ξ)) :
    Jd = (2 * √2 / (3 * √3)) * (Bc / (μ0 * lam)) := by
  have h2 : √2 ≠ 0 := by positivity
  have h3 : √3 ≠ 0 := by positivity
  have hπ : π ≠ 0 := pi_ne_zero
  rw [hJ, hBc]
  field_simp

/-- `λ² ξ` is not `λ ξ²`, so the exponents of the two lengths matter. -/
theorem exponent_needed (Φ0 μ0 lam ξ : ℝ) (hΦ : Φ0 ≠ 0) (hμ : 0 < μ0) (hlam : 0 < lam)
    (hξ : 0 < ξ) (hne : lam ≠ ξ) :
    Φ0 / (3 * √3 * π * μ0 * lam ^ 2 * ξ) ≠ Φ0 / (3 * √3 * π * μ0 * lam * ξ ^ 2) := by
  intro h
  have h3 : 0 < √3 := by positivity
  have hπ : 0 < π := pi_pos
  have h1 : 0 < 3 * √3 * π * μ0 * lam ^ 2 * ξ := by positivity
  have h2 : 0 < 3 * √3 * π * μ0 * lam * ξ ^ 2 := by positivity
  rw [div_eq_div_iff h1.ne' h2.ne'] at h
  have := mul_left_cancel₀ hΦ h
  have hc : 0 < 3 * √3 * π * μ0 * lam * ξ := by positivity
  have : (3 * √3 * π * μ0 * lam * ξ) * (lam - ξ) = 0 := by linear_combination -this
  rcases mul_eq_zero.mp this with h' | h'
  · exact hc.ne' h'
  · exact hne (by linarith)

end PhysJS.DepairingCurrent

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Arctan
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.DerivHyp
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-97`. Bridge. Ambegaokar–Baratoff product at zero temperature.

The catalog equation is

```
I_c R_n = π Δ / (2 e)
```

`e` is the elementary charge. `integrand_matches_sech` is the chain rule for
the coherence-factor integrand under `E = Δ cosh t`:

```
Δ / (E √(E² − Δ²)) · dE/dt = sech t
```

`integral_sech` evaluates `∫₀^T sech = arctan(sinh T)`, and the limit
`T → ∞` is `π/2`. The tunnel Hamiltonian, identical gaps, and zero
temperature are the hypothesis that `e I_c R_n` is `Δ` times that improper
integral. The finite-temperature factor `tanh(Δ / (2 k_B T))` is not this row.
-/

namespace PhysJS.AmbegaokarBaratoff

open Real Filter Topology intervalIntegral MeasureTheory Set

theorem hasDerivAt_arctan_sinh (t : ℝ) :
    HasDerivAt (fun s => Real.arctan (Real.sinh s)) (1 / Real.cosh t) t := by
  have hcomp := (Real.hasDerivAt_arctan (Real.sinh t)).comp t (Real.hasDerivAt_sinh t)
  have hsq : 1 + Real.sinh t ^ 2 = Real.cosh t ^ 2 := by
    have h := Real.cosh_sq_sub_sinh_sq t
    linarith
  have hc : Real.cosh t ≠ 0 := (Real.cosh_pos t).ne'
  have hcoeff : (1 / (1 + Real.sinh t ^ 2)) * Real.cosh t = 1 / Real.cosh t := by
    rw [hsq]
    field_simp [hc]
  exact hcomp.congr_deriv hcoeff

theorem integral_sech (T : ℝ) :
    ∫ t in (0 : ℝ)..T, (1 / Real.cosh t) = Real.arctan (Real.sinh T) := by
  have hint : IntervalIntegrable (fun t : ℝ => 1 / Real.cosh t) volume 0 T :=
    ((continuous_const.div Real.continuous_cosh) fun t => (Real.cosh_pos t).ne').intervalIntegrable
      0 T
  have h := intervalIntegral.integral_eq_sub_of_hasDerivAt
    (f := fun s => Real.arctan (Real.sinh s))
    (f' := fun t => 1 / Real.cosh t)
    (fun t _ => hasDerivAt_arctan_sinh t) hint
  simpa [Real.sinh_zero, Real.arctan_zero] using h

lemma one_le_cosh (x : ℝ) : 1 ≤ Real.cosh x := by
  have hsq : 1 ≤ Real.cosh x ^ 2 := by
    have h := Real.cosh_sq_sub_sinh_sq x
    nlinarith [sq_nonneg (Real.sinh x)]
  have hc : 0 ≤ Real.cosh x := (Real.cosh_pos x).le
  nlinarith [sq_nonneg (Real.cosh x - 1)]

lemma sinh_ge_id (x : ℝ) (hx : 0 ≤ x) : x ≤ Real.sinh x := by
  have hint1 : IntervalIntegrable (fun _ : ℝ => (1 : ℝ)) volume 0 x :=
    continuous_const.intervalIntegrable 0 x
  have hintc : IntervalIntegrable Real.cosh volume 0 x :=
    Real.continuous_cosh.intervalIntegrable 0 x
  have hder : ∀ t ∈ Set.uIcc (0 : ℝ) x, HasDerivAt Real.sinh (Real.cosh t) t :=
    fun t _ => Real.hasDerivAt_sinh t
  have hintsinh := intervalIntegral.integral_eq_sub_of_hasDerivAt hder hintc
  have hmono : ∫ t in (0 : ℝ)..x, (1 : ℝ) ≤ ∫ t in (0 : ℝ)..x, Real.cosh t :=
    intervalIntegral.integral_mono_on hx hint1 hintc fun t _ => one_le_cosh t
  have hone : ∫ t in (0 : ℝ)..x, (1 : ℝ) = x := by
    simp [intervalIntegral.integral_const, smul_eq_mul]
  rw [Real.sinh_zero, sub_zero] at hintsinh
  linarith

lemma tendsto_sinh_atTop : Tendsto Real.sinh atTop atTop := by
  refine tendsto_atTop_mono' atTop ?_ tendsto_id
  filter_upwards [eventually_ge_atTop (0 : ℝ)] with x hx
  exact sinh_ge_id x hx

theorem tendsto_integral_sech :
    Tendsto (fun T : ℝ => ∫ t in (0 : ℝ)..T, (1 / Real.cosh t)) atTop (𝓝 (Real.pi / 2)) := by
  have harctan : Tendsto Real.arctan atTop (𝓝 (Real.pi / 2)) :=
    Real.tendsto_arctan_atTop.mono_right nhdsWithin_le_nhds
  have hcomp : Tendsto (fun T : ℝ => Real.arctan (Real.sinh T)) atTop (𝓝 (Real.pi / 2)) :=
    harctan.comp tendsto_sinh_atTop
  have heq : (fun T : ℝ => ∫ t in (0 : ℝ)..T, (1 / Real.cosh t)) =
      fun T => Real.arctan (Real.sinh T) := by
    funext T
    exact integral_sech T
  rw [heq]
  exact hcomp

/-- Pullback of the gap integrand along `E = Δ cosh t`, for `t > 0`. -/
theorem integrand_matches_sech (Δ t : ℝ) (hΔ : 0 < Δ) (ht : 0 < t) :
    let E := Δ * Real.cosh t
    (Δ / (E * Real.sqrt (E ^ 2 - Δ ^ 2))) * (Δ * Real.sinh t) = 1 / Real.cosh t := by
  intro E
  have hsinh : 0 < Real.sinh t := Real.sinh_pos_iff.mpr ht
  have hdiff : E ^ 2 - Δ ^ 2 = (Δ * Real.sinh t) ^ 2 := by
    dsimp [E]
    have h := Real.cosh_sq_sub_sinh_sq t
    nlinarith [sq_nonneg (Real.cosh t), sq_nonneg (Real.sinh t)]
  have hsqrt : Real.sqrt (E ^ 2 - Δ ^ 2) = Δ * Real.sinh t := by
    rw [hdiff, Real.sqrt_sq (mul_nonneg hΔ.le hsinh.le)]
  have hE : E ≠ 0 := by
    dsimp [E]
    exact mul_ne_zero hΔ.ne' (Real.cosh_pos t).ne'
  rw [hsqrt]
  field_simp [hE, hΔ.ne', hsinh.ne']
  ring

/-- Ambegaokar–Baratoff. `hkernel` is the tunnel reduction: `e I_c R_n` is
the limit of `Δ ∫₀^T sech`.

Kind `bridge` on `PhysJS.AmbegaokarBaratoff.ambegaokar_baratoff`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not the finite-temperature factor. -/
theorem ambegaokar_baratoff (Ic Rn e Δ : ℝ) (he : e ≠ 0)
    (hkernel : Tendsto (fun T : ℝ => Δ * ∫ t in (0 : ℝ)..T, (1 / Real.cosh t)) atTop
      (𝓝 (e * Ic * Rn))) :
    Ic * Rn = Real.pi * Δ / (2 * e) := by
  have hscaled : Tendsto (fun T : ℝ => Δ * ∫ t in (0 : ℝ)..T, (1 / Real.cosh t)) atTop
      (𝓝 (Δ * (Real.pi / 2))) :=
    tendsto_integral_sech.const_mul Δ
  have heq : e * Ic * Rn = Δ * (Real.pi / 2) := tendsto_nhds_unique hkernel hscaled
  field_simp [he] at heq ⊢
  linarith

/-- A factor other than `π/2` is not this product. -/
theorem coefficient_not_fixed (Δ e C : ℝ) (hΔ : Δ ≠ 0) (he : e ≠ 0) (hC : C ≠ Real.pi / 2) :
    C * Δ / e ≠ (Real.pi / 2) * Δ / e := by
  intro hEq
  have hscaled := congrArg (fun z : ℝ => z * e) hEq
  have hleft : (C * Δ / e) * e = C * Δ := by field_simp [he]
  have hright : ((Real.pi / 2) * Δ / e) * e = (Real.pi / 2) * Δ := by field_simp [he]
  rw [hleft, hright] at hscaled
  exact hC (by
    have : C = Real.pi / 2 := mul_right_cancel₀ hΔ hscaled
    linarith)

end PhysJS.AmbegaokarBaratoff

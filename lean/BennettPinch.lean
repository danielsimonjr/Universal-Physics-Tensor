/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-109`. Bridge. The Bennett pinch relation.

`be-109.equalTemperature`. Derivation step. `equal_temperature_current`.

Proved under these hypotheses. The pinch is a steady z-pinch.
Ampère's law for the enclosed current is `B_θ = μ0 I / (2 π r)`.
The axial current density satisfies `dI/dr = 2 π r j_z`. Radial force
balance is `dp/dr = −j_z B_θ`. Off the axis (`r ≠ 0`) those three
relations cancel in the derivative of `π r² p + μ0 I² / (8 π)`, leaving
`2 π r p`. The combination is assumed differentiable through the axis
as well: the `1/r` terms are removable. The fundamental theorem on
`[0, R]`, with `I(0) = 0` and `p(R) = 0`, gives

```
μ0 I(R)² / (8 π) = ∫₀ᴿ 2 π r p(r) dr
```

The integrand is the axisymmetric area element. For a hydrogenic
column, `∫ p dA = N k_B (T_e + T_i)` is the ideal-gas reading of that
integral, a hypothesis. If both temperatures are `T` and `N_e = N_i = N`,
the integral is `2 N k_B T` and `I = √(16 π N k_B T / μ0)` for `I ≥ 0`.
The single-population current `√(8 π N k_B T / μ0)` is the case
`∫ p dA = N k_B T`. It is not the equal-temperature hydrogenic current.
-/

namespace PhysJS.BennettPinch

open MeasureTheory intervalIntegral Set

/-- Off-axis cancellation. The derivative extends through `r = 0` only by a
separate regularity hypothesis, used in `bennett_eq`. -/
theorem balance_to_slope (p enclosed : ℝ → ℝ) (μ0 j B r pr Ir : ℝ)
    (hr : r ≠ 0)
    (hp : HasDerivAt p pr r) (hI : HasDerivAt enclosed Ir r)
    (hAmp : B = μ0 * enclosed r / (2 * Real.pi * r))
    (henc : Ir = 2 * Real.pi * r * j)
    (hforce : pr = -j * B) :
    HasDerivAt (fun s => Real.pi * s ^ 2 * p s + μ0 * (enclosed s) ^ 2 / (8 * Real.pi))
      (2 * Real.pi * r * p r) r := by
  have hsq : HasDerivAt (fun s : ℝ => s ^ 2) (2 * r) r := by
    have hmul := ((hasDerivAt_id r).mul (hasDerivAt_id r)).congr_deriv
      (by ring : (1 : ℝ) * r + r * 1 = 2 * r)
    apply hmul.congr_of_eventuallyEq
    refine Filter.Eventually.of_forall fun s => ?_
    simp only [Pi.mul_apply, id_eq]
    ring
  have hprod : HasDerivAt (fun s => s ^ 2 * p s) (2 * r * p r + r ^ 2 * pr) r :=
    hsq.mul hp
  have hpi : HasDerivAt (fun s => Real.pi * s ^ 2 * p s)
      (Real.pi * (2 * r * p r + r ^ 2 * pr)) r := by
    have h := hprod.const_mul Real.pi
    apply h.congr_of_eventuallyEq
    refine Filter.Eventually.of_forall ?_
    intro s
    ring
  have hI2 : HasDerivAt (fun s => (enclosed s) ^ 2) (2 * enclosed r * Ir) r := by
    have hmul := (hI.mul hI).congr_deriv
      (by ring : Ir * enclosed r + enclosed r * Ir = 2 * enclosed r * Ir)
    apply hmul.congr_of_eventuallyEq
    refine Filter.Eventually.of_forall fun s => ?_
    simp only [Pi.mul_apply]
    ring
  have hmag : HasDerivAt (fun s => μ0 * (enclosed s) ^ 2 / (8 * Real.pi))
      (μ0 * (2 * enclosed r * Ir) / (8 * Real.pi)) r := by
    have h := (hI2.const_mul μ0).div_const (8 * Real.pi)
    apply h.congr_deriv
    field_simp [Real.pi_ne_zero]
  have hsum := hpi.add hmag
  apply hsum.congr_deriv
  rw [hforce, henc, hAmp]
  field_simp [hr, Real.pi_ne_zero]
  ring

/-- Integrated Bennett relation on a column with `I(0) = 0` and `p(R) = 0`.

`hderiv` includes the axis. Off the axis it is `balance_to_slope`. -/
theorem bennett_eq (p enclosed : ℝ → ℝ) (μ0 R : ℝ) (_hR : 0 ≤ R)
    (h0 : enclosed 0 = 0) (hwall : p R = 0)
    (hderiv : ∀ r ∈ uIcc (0 : ℝ) R,
      HasDerivAt (fun s => Real.pi * s ^ 2 * p s + μ0 * (enclosed s) ^ 2 / (8 * Real.pi))
        (2 * Real.pi * r * p r) r)
    (hint : IntervalIntegrable (fun r => 2 * Real.pi * r * p r) volume 0 R) :
    μ0 * (enclosed R) ^ 2 / (8 * Real.pi) =
      ∫ r in (0 : ℝ)..R, 2 * Real.pi * r * p r := by
  have hftc := integral_eq_sub_of_hasDerivAt hderiv hint
  have hF0 : Real.pi * (0 : ℝ) ^ 2 * p 0 + μ0 * (enclosed 0) ^ 2 / (8 * Real.pi) = 0 := by
    rw [h0]
    ring
  have hFR : Real.pi * R ^ 2 * p R + μ0 * (enclosed R) ^ 2 / (8 * Real.pi) =
      μ0 * (enclosed R) ^ 2 / (8 * Real.pi) := by
    rw [hwall]
    ring
  rw [hftc, hFR, hF0, sub_zero]

/-- Hydrogenic reading `∫ p dA = N k_B (T_e + T_i)`. -/
theorem two_temperature (μ0 Iarea N kB Te Ti integral : ℝ)
    (hI : μ0 * Iarea ^ 2 / (8 * Real.pi) = integral)
    (hgas : integral = N * kB * (Te + Ti)) :
    μ0 * Iarea ^ 2 / (8 * Real.pi) = N * kB * (Te + Ti) := by
  rw [hI, hgas]

/-- Equal electron and ion temperatures: the current carries a factor `16`, not `8`. -/
theorem equal_temperature_current (Iarea N kB T μ0 : ℝ)
    (hμ : 0 < μ0) (_harea : 0 ≤ 2 * N * kB * T) (hI : 0 ≤ Iarea)
    (hbal : μ0 * Iarea ^ 2 / (8 * Real.pi) = 2 * N * kB * T) :
    Iarea = Real.sqrt (16 * Real.pi * N * kB * T / μ0) := by
  have hsq : Iarea ^ 2 = 16 * Real.pi * N * kB * T / μ0 := by
    have hmul : μ0 * Iarea ^ 2 = 2 * N * kB * T * (8 * Real.pi) :=
      (div_eq_iff (mul_ne_zero (by norm_num : (8 : ℝ) ≠ 0) Real.pi_ne_zero)).mp hbal
    apply (eq_div_iff hμ.ne').mpr
    have h16 : 2 * N * kB * T * (8 * Real.pi) = 16 * Real.pi * N * kB * T := by ring
    linarith
  rw [← Real.sqrt_sq hI, hsq]

/-- Single-population `∫ p dA = N k_B T` keeps the factor `8`. -/
theorem single_population_current (Iarea N kB T μ0 : ℝ)
    (hμ : 0 < μ0) (_harea : 0 ≤ N * kB * T) (hI : 0 ≤ Iarea)
    (hbal : μ0 * Iarea ^ 2 / (8 * Real.pi) = N * kB * T) :
    Iarea = Real.sqrt (8 * Real.pi * N * kB * T / μ0) := by
  have hsq : Iarea ^ 2 = 8 * Real.pi * N * kB * T / μ0 := by
    have hmul : μ0 * Iarea ^ 2 = N * kB * T * (8 * Real.pi) :=
      (div_eq_iff (mul_ne_zero (by norm_num : (8 : ℝ) ≠ 0) Real.pi_ne_zero)).mp hbal
    apply (eq_div_iff hμ.ne').mpr
    linarith
  rw [← Real.sqrt_sq hI, hsq]

/-- The equal-temperature current is not the single-population current. -/
theorem equal_not_single (N kB T μ0 : ℝ) (h : 0 < N * kB * T / μ0) :
    Real.sqrt (8 * Real.pi * N * kB * T / μ0) ≠
      Real.sqrt (16 * Real.pi * N * kB * T / μ0) := by
  intro hEq
  have hsq := congrArg (fun x => x ^ 2) hEq
  have hfrac : 0 ≤ N * kB * T / μ0 := h.le
  have h8assoc : 8 * Real.pi * N * kB * T / μ0 = 8 * Real.pi * (N * kB * T / μ0) := by ring
  have h16assoc : 16 * Real.pi * N * kB * T / μ0 = 16 * Real.pi * (N * kB * T / μ0) := by ring
  have h8 : 0 ≤ 8 * Real.pi * N * kB * T / μ0 := by
    rw [h8assoc]
    exact mul_nonneg (mul_nonneg (by norm_num) Real.pi_pos.le) hfrac
  have h16 : 0 ≤ 16 * Real.pi * N * kB * T / μ0 := by
    rw [h16assoc]
    exact mul_nonneg (mul_nonneg (by norm_num) Real.pi_pos.le) hfrac
  rw [Real.sq_sqrt h8, Real.sq_sqrt h16] at hsq
  have hpos : 0 < 8 * Real.pi * N * kB * T / μ0 := by
    rw [h8assoc]
    exact mul_pos (mul_pos (by norm_num) Real.pi_pos) h
  have htwice : 2 * (8 * Real.pi * N * kB * T / μ0) = 16 * Real.pi * N * kB * T / μ0 := by ring
  have hzero : 8 * Real.pi * N * kB * T / μ0 = 0 := by linarith
  exact ne_of_gt hpos hzero

end PhysJS.BennettPinch

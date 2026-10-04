/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-95`. Bridge. Ginzburg–Landau type boundary, as the Bogomolnyi point.

The catalog statement is that the interface energy changes sign at

```
κ = λ / ξ = 1 / √2
```

with type II for `κ > 1/√2`. In the normalization whose gradient coefficient
is `1/κ²`, whose quartic is `(1/2)(1 − f²)²`, and whose field term is `B²`,
`density_squares` is the pointwise identity at `κ² = 1/2`:

```
2 (f')² + (1/2) (1 − f²)² + (a f)² + B²
  = (√2 f' − a f)² + (B + (1 − f²)/√2)² − √2 · d/dx [a (1 − f²)]
```

`wall_integral_zero` integrates that identity. Vanishing squares and equal
endpoint values of `a(1 − f²)` make the wall integral zero. `kappa_excess`
is the rest of the κ dependence, `(1/κ² − 2) (f')²`. `type_boundary` is the
sign of a trial wall whose critical-κ integral vanishes: negative when
`κ > 1/√2`, zero on the boundary, positive when `κ < 1/√2`. The positive
side is this trial, not a proof that every minimizer is positive. The GL
density and the first-order profile are hypotheses.
-/

namespace PhysJS.GinzburgLandau

open Real intervalIntegral MeasureTheory Set

/-- At `κ² = 1/2` the density is two squares plus a derivative term. -/
theorem density_squares (f' a f B : ℝ) :
    2 * f' ^ 2 + (1 / 2) * (1 - f ^ 2) ^ 2 + (a * f) ^ 2 + B ^ 2 =
      (Real.sqrt 2 * f' - a * f) ^ 2 +
        (B + (1 / Real.sqrt 2) * (1 - f ^ 2)) ^ 2 +
        Real.sqrt 2 * (2 * a * f * f' - B * (1 - f ^ 2)) := by
  set s : ℝ := Real.sqrt 2
  have hs : s ^ 2 = 2 := Real.sq_sqrt (by norm_num)
  have hs0 : s ≠ 0 := (Real.sqrt_pos.mpr (by norm_num)).ne'
  rw [← hs]
  refine mul_right_cancel₀ (pow_ne_zero 2 hs0) ?_
  have hden : (1 / s ^ 2) * (1 - f ^ 2) ^ 2 * s ^ 2 = (1 - f ^ 2) ^ 2 := by
    calc
      (1 / s ^ 2) * (1 - f ^ 2) ^ 2 * s ^ 2
          = (1 - f ^ 2) ^ 2 * ((1 / s ^ 2) * s ^ 2) := by ring
      _ = (1 - f ^ 2) ^ 2 * 1 := by rw [div_mul_cancel₀ (1 : ℝ) (pow_ne_zero 2 hs0)]
      _ = (1 - f ^ 2) ^ 2 := by ring
  have hunit : (1 / s) * s = 1 := by
    rw [div_eq_mul_inv, mul_assoc, inv_mul_cancel₀ hs0, mul_one]
  have hsq : (B + (1 / s) * (1 - f ^ 2)) ^ 2 * s ^ 2 = (B * s + (1 - f ^ 2)) ^ 2 := by
    calc
      (B + (1 / s) * (1 - f ^ 2)) ^ 2 * s ^ 2
          = ((B + (1 / s) * (1 - f ^ 2)) * s) ^ 2 := by ring
      _ = (B * s + (1 / s) * (1 - f ^ 2) * s) ^ 2 := by ring
      _ = (B * s + (1 - f ^ 2) * ((1 / s) * s)) ^ 2 := by ring
      _ = (B * s + (1 - f ^ 2) * 1) ^ 2 := by rw [hunit]
      _ = (B * s + (1 - f ^ 2)) ^ 2 := by ring
  calc
    (s ^ 2 * f' ^ 2 + (1 / s ^ 2) * (1 - f ^ 2) ^ 2 + (a * f) ^ 2 + B ^ 2) * s ^ 2
        = s ^ 2 * f' ^ 2 * s ^ 2 + (1 / s ^ 2) * (1 - f ^ 2) ^ 2 * s ^ 2 +
            (a * f) ^ 2 * s ^ 2 + B ^ 2 * s ^ 2 := by ring
    _ = s ^ 2 * f' ^ 2 * s ^ 2 + (1 - f ^ 2) ^ 2 + (a * f) ^ 2 * s ^ 2 + B ^ 2 * s ^ 2 := by
          rw [hden]
    _ = (s * f' - a * f) ^ 2 * s ^ 2 + (B * s + (1 - f ^ 2)) ^ 2 +
          s * (s ^ 2 * a * f * f' - B * (1 - f ^ 2)) * s ^ 2 := by
          have hgrad :
              (s * f' - a * f) ^ 2 =
                s ^ 2 * f' ^ 2 - 2 * s * a * f * f' + (a * f) ^ 2 := by ring
          have hfield :
              (B * s + (1 - f ^ 2)) ^ 2 =
                B ^ 2 * s ^ 2 + 2 * B * s * (1 - f ^ 2) + (1 - f ^ 2) ^ 2 := by ring
          have hlast :
              s * (s ^ 2 * a * f * f' - B * (1 - f ^ 2)) * s ^ 2 =
                s ^ 2 * s * (s ^ 2 * a * f * f' - B * (1 - f ^ 2)) := by ring
          rw [hgrad, hfield, hlast, hs]
          ring
    _ = (s * f' - a * f) ^ 2 * s ^ 2 + (B + (1 / s) * (1 - f ^ 2)) ^ 2 * s ^ 2 +
          s * (s ^ 2 * a * f * f' - B * (1 - f ^ 2)) * s ^ 2 := by rw [← hsq]
    _ = ((s * f' - a * f) ^ 2 + (B + (1 / s) * (1 - f ^ 2)) ^ 2 +
          s * (s ^ 2 * a * f * f' - B * (1 - f ^ 2))) * s ^ 2 := by ring

/-- Changing `κ` touches only the gradient coefficient. -/
theorem kappa_excess (κ f' quartic kinetic field : ℝ) (_hκ : κ ≠ 0) :
    (1 / κ ^ 2) * f' ^ 2 + quartic + kinetic + field -
        (2 * f' ^ 2 + quartic + kinetic + field) =
      (1 / κ ^ 2 - 2) * f' ^ 2 := by
  ring

/-- Squares zero and equal endpoints integrate to a zero wall. `hden` is
`density_squares` after the derivative has been named `endpoint'`. -/
theorem wall_integral_zero
    (density squares endpoint endpoint' : ℝ → ℝ) (x1 x2 wall : ℝ)
    (hderiv : ∀ x ∈ Set.uIcc x1 x2, HasDerivAt (fun y => endpoint y) (endpoint' x) x)
    (hden : ∀ x, density x = squares x + (-Real.sqrt 2) * endpoint' x)
    (hsq : ∀ x, squares x = 0)
    (hends : endpoint x1 = endpoint x2)
    (hint : IntervalIntegrable endpoint' volume x1 x2)
    (hwall : wall = ∫ x in x1..x2, density x) :
    wall = 0 := by
  have hzero : wall = (-Real.sqrt 2) * (endpoint x2 - endpoint x1) := by
    rw [hwall, intervalIntegral.integral_congr (fun x _ => hden x)]
    have hsqI : ∫ x in x1..x2, squares x = 0 := by
      rw [intervalIntegral.integral_congr (fun x _ => hsq x), intervalIntegral.integral_zero]
    have hintS : IntervalIntegrable squares volume x1 x2 := by
      rw [show squares = fun _ => (0 : ℝ) from funext hsq]
      exact (continuous_const : Continuous fun _ : ℝ => (0 : ℝ)).intervalIntegrable x1 x2
    rw [integral_add hintS (hint.const_mul (-Real.sqrt 2)), hsqI, zero_add,
      intervalIntegral.integral_const_mul,
      intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv hint]
  rw [hzero, hends, sub_self, mul_zero]

/-- The trial wall changes sign at `κ = 1/√2`.

`hcrit` is the Bogomolnyi wall integral at `κ² = 1/2`. `htrial` adds the
excess `(1/κ² − 2)` times the gradient integral of that same profile.
`0 < gradSq` keeps the profile from being constant.

Kind `bridge` on `PhysJS.GinzburgLandau.type_boundary`, once the catalog
entry exists. The covers line still begins with `derivation-step`. The
positive side is this trial profile, not every minimizer. -/
theorem type_boundary (κ trial gradSq crit : ℝ) (hκ : 0 < κ) (hgrad : 0 < gradSq)
    (hcrit : crit = 0)
    (htrial : trial = crit + (1 / κ ^ 2 - 2) * gradSq) :
    (κ = 1 / Real.sqrt 2 ↔ κ ^ 2 = 1 / 2) ∧
      (trial < 0 ↔ 1 / Real.sqrt 2 < κ) ∧
      (trial = 0 ↔ κ = 1 / Real.sqrt 2) ∧
      (0 < trial ↔ κ < 1 / Real.sqrt 2) := by
  have hs : (Real.sqrt 2) ^ 2 = 2 := Real.sq_sqrt (by norm_num)
  have hs0 : Real.sqrt 2 ≠ 0 := by
    intro h
    have : (Real.sqrt 2) ^ 2 = 0 := by simp [h]
    linarith [hs]
  have hpos2 : 0 < 1 / Real.sqrt 2 := by positivity
  have hsq : (1 / Real.sqrt 2) ^ 2 = 1 / 2 := by
    field_simp [hs0]
    rw [hs]
  have hiff : κ = 1 / Real.sqrt 2 ↔ κ ^ 2 = 1 / 2 := by
    constructor
    · intro h
      rw [h, hsq]
    · intro h
      have hsqEq : κ ^ 2 = (1 / Real.sqrt 2) ^ 2 := by rw [h, hsq]
      have hprod : (κ - 1 / Real.sqrt 2) * (κ + 1 / Real.sqrt 2) = 0 := by
        nlinarith
      rcases mul_eq_zero.mp hprod with h | h
      · linarith
      · have : κ = -(1 / Real.sqrt 2) := by linarith
        linarith [hκ, hpos2]
  have hsign : trial = (1 / κ ^ 2 - 2) * gradSq := by rw [htrial, hcrit, zero_add]
  have hneg : trial < 0 ↔ 1 / κ ^ 2 - 2 < 0 := by
    rw [hsign]
    simpa only [zero_mul] using
      mul_lt_mul_iff_of_pos_right (a := gradSq) (b := 1 / κ ^ 2 - 2) (c := (0 : ℝ)) hgrad
  have hzero : trial = 0 ↔ 1 / κ ^ 2 - 2 = 0 := by
    rw [hsign]
    exact mul_eq_zero_iff_right hgrad.ne'
  have hposT : 0 < trial ↔ 0 < 1 / κ ^ 2 - 2 := by
    rw [hsign]
    simpa only [zero_mul] using
      mul_lt_mul_iff_of_pos_right (a := gradSq) (b := (0 : ℝ)) (c := 1 / κ ^ 2 - 2) hgrad
  have hκ2 : 0 < κ ^ 2 := by positivity
  have hcoeff_neg : 1 / κ ^ 2 - 2 < 0 ↔ 1 / 2 < κ ^ 2 := by
    constructor
    · intro h
      have : 1 / κ ^ 2 < 2 := by linarith
      have : 1 < 2 * κ ^ 2 := by
        field_simp [hκ.ne'] at this
        linarith
      linarith
    · intro h
      have : 1 < 2 * κ ^ 2 := by linarith
      have : 1 / κ ^ 2 < 2 := by
        field_simp [hκ.ne']
        linarith
      linarith
  have hcoeff_zero : 1 / κ ^ 2 - 2 = 0 ↔ κ ^ 2 = 1 / 2 := by
    constructor
    · intro h
      have : 1 / κ ^ 2 = 2 := by linarith
      field_simp [hκ.ne'] at this
      linarith
    · intro h
      rw [h]
      norm_num
  have hcoeff_pos : 0 < 1 / κ ^ 2 - 2 ↔ κ ^ 2 < 1 / 2 := by
    constructor
    · intro h
      have : 2 < 1 / κ ^ 2 := by linarith
      have : 2 * κ ^ 2 < 1 := by
        field_simp [hκ.ne'] at this
        linarith
      linarith
    · intro h
      have : 2 * κ ^ 2 < 1 := by linarith
      have : 2 < 1 / κ ^ 2 := by
        field_simp [hκ.ne']
        linarith
      linarith
  have hgt : 1 / 2 < κ ^ 2 ↔ 1 / Real.sqrt 2 < κ := by
    constructor
    · intro h
      by_contra hle
      have hle' : κ ≤ 1 / Real.sqrt 2 := le_of_not_gt hle
      have : κ ^ 2 ≤ (1 / Real.sqrt 2) ^ 2 := by
        simpa [pow_two] using mul_self_le_mul_self hκ.le hle'
      linarith [hsq]
    · intro h
      have : (1 / Real.sqrt 2) ^ 2 < κ ^ 2 := by
        exact pow_lt_pow_left₀ h hpos2.le (by norm_num : (2 : ℕ) ≠ 0)
      linarith [hsq]
  have hlt : κ ^ 2 < 1 / 2 ↔ κ < 1 / Real.sqrt 2 := by
    constructor
    · intro h
      by_contra hge
      have hge' : 1 / Real.sqrt 2 ≤ κ := le_of_not_gt hge
      have : (1 / Real.sqrt 2) ^ 2 ≤ κ ^ 2 := by
        simpa [pow_two] using mul_self_le_mul_self hpos2.le hge'
      linarith [hsq]
    · intro h
      have : κ ^ 2 < (1 / Real.sqrt 2) ^ 2 := by
        exact pow_lt_pow_left₀ h hκ.le (by norm_num : (2 : ℕ) ≠ 0)
      linarith [hsq]
  refine ⟨hiff, ?_, ?_, ?_⟩
  · rw [hneg, hcoeff_neg, hgt]
  · rw [hzero, hcoeff_zero, hiff]
  · rw [hposT, hcoeff_pos, hlt]

end PhysJS.GinzburgLandau

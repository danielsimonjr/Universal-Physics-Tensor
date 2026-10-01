/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Base

/-!
`be-37`. Derivation step. The radial integral of `1/r`, not a geodesic.

The encoded scalar is

```
Δt = (2 G M / c³) ln(R_far / R_near)
```

It is the integral

```
∫_{R_near}^{R_far} (2 G M / c³) (dr / r)
```

for `0 < R_near < R_far` and `c ≠ 0`. The factor `1` in place of `2` is
half that delay, the same half that `γ = 0` catches in
`PhysJS.Deflection`, once `G ≠ 0` and `M ≠ 0`. `log₁₀` of the radius
ratio is not `ln`. The impact-parameter formula
`(1+γ)(2GM/c³) ln(4 r_e r_r / b²)` and the Cassini measurement are not
this statement.
-/

namespace PhysJS.Shapiro

open Real intervalIntegral

/-- The integral of `(2 G M / c³) / r` is the encoded logarithm.

Covers the derivation step of `be-37`. Not the impact-parameter Shapiro
formula, and not the Cassini measurement. -/
theorem radial_integral (G M c Rnear Rfar : ℝ) (hnear : 0 < Rnear) (hfar : Rnear < Rfar)
    (hc : c ≠ 0) :
    c ^ 3 ≠ 0 ∧
      (∫ r in Rnear..Rfar, (2 * G * M / c ^ 3) / r) =
        (2 * G * M / c ^ 3) * log (Rfar / Rnear) := by
  refine ⟨pow_ne_zero 3 hc, ?_⟩
  have hpos : 0 < Rfar := lt_trans hnear hfar
  rw [integral_congr fun r _ => div_eq_mul_one_div (2 * G * M / c ^ 3) r,
    integral_const_mul, integral_one_div_of_pos hnear hpos]

/-- The factor `1` is not the factor `2`, and `log₁₀` is not `ln`. -/
theorem wrong_dictionary (G M c Rnear Rfar : ℝ) (hnear : 0 < Rnear) (hfar : Rnear < Rfar)
    (hc : c ≠ 0) (hG : G ≠ 0) (hM : M ≠ 0) :
    (∫ r in Rnear..Rfar, (G * M / c ^ 3) / r) ≠
        (2 * G * M / c ^ 3) * log (Rfar / Rnear) ∧
      (2 * G * M / c ^ 3) * logb 10 (Rfar / Rnear) ≠
        (2 * G * M / c ^ 3) * log (Rfar / Rnear) := by
  have hpos : 0 < Rfar := lt_trans hnear hfar
  have hratio : 1 < Rfar / Rnear := (one_lt_div hnear).mpr hfar
  have hlog : log (Rfar / Rnear) ≠ 0 := (log_pos hratio).ne'
  have hc3 : c ^ 3 ≠ 0 := pow_ne_zero 3 hc
  have hpre : 2 * G * M / c ^ 3 ≠ 0 :=
    div_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num : (2 : ℝ) ≠ 0) hG) hM) hc3
  constructor
  · intro h
    rw [integral_congr fun r _ => div_eq_mul_one_div (G * M / c ^ 3) r,
      integral_const_mul, integral_one_div_of_pos hnear hpos] at h
    have hcoef : G * M / c ^ 3 = 2 * G * M / c ^ 3 := mul_right_cancel₀ hlog h
    field_simp [hc3] at hcoef
    norm_num at hcoef
  · intro h
    rw [← log_div_log] at h
    have hbase : log (Rfar / Rnear) / log 10 = log (Rfar / Rnear) :=
      mul_left_cancel₀ hpre h
    have h10 : log (10 : ℝ) ≠ 0 := (log_pos (by norm_num : (1 : ℝ) < 10)).ne'
    field_simp [h10] at hbase
    have hten : (10 : ℝ) = exp 1 := by
      rw [← exp_log (by norm_num : (0 : ℝ) < 10), hbase.symm]
    linarith [exp_one_lt_three]

end PhysJS.Shapiro

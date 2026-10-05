/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-133`. Bridge. Damping ratio of a second-order oscillator.

The catalog equation is

```
ζ = c / (2 √(k m))
```

for `m ẍ + c ẋ + k x = 0`. `damping_ratio` derives it. Constant
coefficients put the characteristic polynomial at

```
s² + (c / m) s + k / m = 0
```

The natural frequency is `ω = √(k/m)`. Matching the linear coefficient
to `2 ζ ω` is the definition of `ζ`. The `2` is that binomial
coefficient. Critical damping is a zero discriminant, and for `c ≥ 0`
that is `ζ = 1`, so `c_crit = 2 √(k m)`. `factor_not_one` drops the `2`.
`√(k/m)` is not this ratio.
-/

namespace PhysJS.DampingRatio

/-- `m √(k/m) = √(k m)` for `m > 0` and `k ≥ 0`. -/
theorem mass_frequency (k m : ℝ) (hm : 0 < m) (hk : 0 ≤ k) :
    m * Real.sqrt (k / m) = Real.sqrt (k * m) := by
  have hdiv : 0 ≤ k / m := div_nonneg hk hm.le
  have hsq : Real.sqrt (m ^ 2) = m := Real.sqrt_sq hm.le
  calc
    m * Real.sqrt (k / m) = Real.sqrt (m ^ 2) * Real.sqrt (k / m) := by rw [hsq]
    _ = Real.sqrt (m ^ 2 * (k / m)) := (Real.sqrt_mul (sq_nonneg m) (k / m)).symm
    _ = Real.sqrt (k * m) := by
      congr 1
      field_simp [hm.ne']

/-- Damping ratio, and critical damping.

`hω` is `ω = √(k/m)`. `hmatch` writes the linear coefficient as `2 ζ ω`.
The discriminant of `s² + (c/m) s + k/m` vanishes if and only if `ζ = 1`.

Kind `bridge` on `PhysJS.DampingRatio.damping_ratio`, once the catalog
entry exists. The covers line still begins with `derivation-step`. Not
`√(k/m)` and not the factor `1`. -/
theorem damping_ratio (c k m ζ ω : ℝ) (hm : 0 < m) (hk : 0 < k) (hc : 0 ≤ c)
    (hω : ω = Real.sqrt (k / m)) (hmatch : 2 * ζ * ω = c / m) :
    ζ = c / (2 * Real.sqrt (k * m)) ∧
      ((c / m) ^ 2 - 4 * (k / m) = 0 ↔ ζ = 1) := by
  have hωpos : 0 < ω := by
    rw [hω]
    exact Real.sqrt_pos.mpr (div_pos hk hm)
  have hprod : m * ω = Real.sqrt (k * m) := by
    rw [hω]
    exact mass_frequency k m hm hk.le
  have hζ : ζ = c / (2 * Real.sqrt (k * m)) := by
    have hden : 2 * m * ω ≠ 0 :=
      mul_ne_zero (mul_ne_zero (by norm_num) hm.ne') hωpos.ne'
    have hscaled : 2 * ζ * ω * m = c := by
      have h := hmatch
      field_simp [hm.ne'] at h
      linarith
    calc
      ζ = c / (2 * m * ω) := by
        rw [eq_div_iff hden]
        have hcomm : ζ * (2 * m * ω) = 2 * ζ * ω * m := by ring
        linarith
      _ = c / (2 * Real.sqrt (k * m)) := by rw [mul_assoc, hprod]
  refine ⟨hζ, ?_⟩
  have hω2 : ω ^ 2 = k / m := by
    rw [hω]
    exact Real.sq_sqrt (div_nonneg hk.le hm.le)
  have hdisc : (c / m) ^ 2 - 4 * (k / m) = 4 * ω ^ 2 * (ζ ^ 2 - 1) := by
    have hc_over : c / m = 2 * ζ * ω := hmatch.symm
    rw [hc_over]
    field_simp [hm.ne']
    rw [hω2]
    field_simp [hm.ne']
    ring
  constructor
  · intro hzero
    have hfac : 4 * ω ^ 2 * (ζ ^ 2 - 1) = 0 := by linarith
    have h4 : (4 : ℝ) * ω ^ 2 ≠ 0 := mul_ne_zero (by norm_num) (pow_ne_zero 2 hωpos.ne')
    have hsq : ζ ^ 2 = 1 := by
      have : ζ ^ 2 - 1 = 0 := (mul_eq_zero.mp hfac).resolve_left h4
      linarith
    have hζ0 : 0 ≤ ζ := by
      have hcoef : 0 ≤ c / m := div_nonneg hc hm.le
      have hlin : 0 ≤ 2 * ζ * ω := by linarith
      have h2ω : 0 < 2 * ω := by positivity
      have hcomm : ζ * (2 * ω) = 2 * ζ * ω := by ring
      exact le_of_mul_le_mul_right (by simpa [zero_mul, hcomm] using hlin) h2ω
    rcases sq_eq_one_iff.mp hsq with hpos | hneg
    · exact hpos
    · have : ζ < 0 := by linarith
      linarith
  · intro hζ1
    rw [hdisc, hζ1]
    ring

/-- Dropping the `2` is not the damping ratio when `c ≠ 0`. -/
theorem factor_not_one (c k m : ℝ) (hc : c ≠ 0) (hkm : 0 < k * m) :
    c / Real.sqrt (k * m) ≠ c / (2 * Real.sqrt (k * m)) := by
  intro hEq
  have hsqrt : Real.sqrt (k * m) ≠ 0 := (Real.sqrt_pos.mpr hkm).ne'
  have hden2 : (2 : ℝ) * Real.sqrt (k * m) ≠ 0 := mul_ne_zero (by norm_num) hsqrt
  rw [div_eq_div_iff hsqrt hden2] at hEq
  have : c * Real.sqrt (k * m) = 0 := by
    have hsub : c * (2 * Real.sqrt (k * m)) - c * Real.sqrt (k * m) = 0 := by linarith
    have hfac : c * (2 * Real.sqrt (k * m)) - c * Real.sqrt (k * m) =
        c * Real.sqrt (k * m) := by ring
    linarith
  exact mul_ne_zero hc hsqrt this

end PhysJS.DampingRatio

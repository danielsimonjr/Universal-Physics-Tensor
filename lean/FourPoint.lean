/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-84`. Bridge. Collinear four-point sheet resistance.

The catalog equation is

```
R_s = (π / ln 2) (V / I)
```

for an infinite thin sheet and four equally spaced collinear probes.
`sheet_eq` derives it. A point source on a homogeneous sheet sends current
`I` through every circle, so the radial field is `(I R_s) / (2 π r)` and
the potential drop is the integral of `1/r`. Probes sit at `0`, `s`, `2 s`,
and `3 s`. Current `I` enters at `0` and leaves at `3 s`. The inner pair
reads `V`. Each contact contributes `(I R_s / (2 π)) ln 2`, and Laplace's
equation is linear, so the drops add. `unequal_not_equal` moves the sink
to `4 s`. The factor is then `2 π / ln 3`, not `π / ln 2`. This is not
`PhysJS.Crossing`, the conformal four-point function.
-/

namespace PhysJS.FourPoint

open Real intervalIntegral

/-- Radial drop of a sheet current `a · I` between two radii. -/
theorem radial_drop (a I Rs r1 r2 : ℝ) (hr1 : 0 < r1) (hr2 : 0 < r2) :
    (∫ r in r1..r2, (a * I * Rs) / (2 * Real.pi * r)) =
      (a * I * Rs / (2 * Real.pi)) * Real.log (r2 / r1) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hcoef : ∀ r, (a * I * Rs) / (2 * Real.pi * r) =
      ((a * I * Rs) / (2 * Real.pi)) * (1 / r) := by
    intro r
    by_cases hr : r = 0
    · simp [hr]
    · field_simp [hπ, hr]
  rw [integral_congr (fun r _ => hcoef r), integral_const_mul, integral_one_div_of_pos hr1 hr2]

/-- Equally spaced contacts. The source at `0` drops from `s` to `2 s`.
The sink at `3 s` is `2 s` from the first voltage probe and `s` from the
second, and its injected current is `−I`, so it contributes the same
logarithm. -/
theorem inner_voltage (s I Rs : ℝ) (hs : 0 < s) :
    (∫ r in s..(2 * s), (I * Rs) / (2 * Real.pi * r)) +
        (∫ r in s..(2 * s), (I * Rs) / (2 * Real.pi * r)) =
      (I * Rs / Real.pi) * Real.log 2 := by
  have h2s : 0 < 2 * s := by linarith
  have hsource := radial_drop 1 I Rs s (2 * s) hs h2s
  have hsink := radial_drop 1 I Rs s (2 * s) hs h2s
  have hlog : Real.log ((2 * s) / s) = Real.log 2 := by
    congr 1
    field_simp [hs.ne']
  rw [show (1 : ℝ) * I * Rs = I * Rs by ring] at hsource
  rw [hsource, hlog]
  ring

/-- Collinear four-point probe. `hV` is superposition of the source at `0`
and the sink at `3 s` on the inner pair.

Not
`PhysJS.Crossing.antisymmetry`. -/
theorem sheet_eq (s I Rs V : ℝ) (hs : 0 < s) (hI : I ≠ 0)
    (hV : V = (∫ r in s..(2 * s), (I * Rs) / (2 * Real.pi * r)) +
      (∫ r in s..(2 * s), (I * Rs) / (2 * Real.pi * r))) :
    Rs = (Real.pi / Real.log 2) * (V / I) := by
  have hsum := inner_voltage s I Rs hs
  have hlog : Real.log 2 ≠ 0 := (Real.log_pos (by norm_num : (1 : ℝ) < 2)).ne'
  rw [hV, hsum]
  field_simp [hI, hlog]

/-- Sink at `4 s` instead of `3 s`. The inner drops are `ln 2` and
`ln (3/2)`, so `2 π / ln 3` is the factor and `π / ln 2` is not. -/
theorem unequal_not_equal (s I Rs : ℝ) (hs : 0 < s) (hI : I ≠ 0) (hRs : Rs ≠ 0) :
    let Vsource := ∫ r in s..(2 * s), (I * Rs) / (2 * Real.pi * r)
    let Vsink := ∫ r in (2 * s)..(3 * s), (I * Rs) / (2 * Real.pi * r)
    (Real.pi / Real.log 2) * ((Vsource + Vsink) / I) ≠ Rs := by
  intro Vsource Vsink
  have h2s : 0 < 2 * s := by linarith
  have h3s : 0 < 3 * s := by linarith
  have hsource := radial_drop 1 I Rs s (2 * s) hs h2s
  have hsink := radial_drop 1 I Rs (2 * s) (3 * s) h2s h3s
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hlog2 : Real.log 2 ≠ 0 := (Real.log_pos (by norm_num : (1 : ℝ) < 2)).ne'
  have hlog3 : Real.log 3 ≠ 0 := (Real.log_pos (by norm_num : (1 : ℝ) < 3)).ne'
  have hsrc : Vsource = (I * Rs / (2 * Real.pi)) * Real.log 2 := by
    simpa [Vsource, show (1 : ℝ) * I * Rs = I * Rs by ring,
      show (2 * s) / s = (2 : ℝ) by field_simp [hs.ne']] using hsource
  have hsnk : Vsink = (I * Rs / (2 * Real.pi)) * Real.log (3 / 2) := by
    have hratio : (3 * s) / (2 * s) = 3 / 2 := by field_simp [hs.ne']
    simpa [Vsink, show (1 : ℝ) * I * Rs = I * Rs by ring, hratio] using hsink
  have hsum : Vsource + Vsink = (I * Rs / (2 * Real.pi)) * Real.log 3 := by
    rw [hsrc, hsnk]
    have hlogs : Real.log 2 + Real.log (3 / 2) = Real.log 3 := by
      have hmul := Real.log_mul (by norm_num : (2 : ℝ) ≠ 0) (by norm_num : (3 : ℝ) / 2 ≠ 0)
      have hprod : (2 : ℝ) * (3 / 2) = 3 := by ring
      rw [hprod] at hmul
      linarith
    calc
      (I * Rs / (2 * Real.pi)) * Real.log 2 + (I * Rs / (2 * Real.pi)) * Real.log (3 / 2)
          = (I * Rs / (2 * Real.pi)) * (Real.log 2 + Real.log (3 / 2)) := by ring
      _ = (I * Rs / (2 * Real.pi)) * Real.log 3 := by rw [hlogs]
  intro hEq
  rw [hsum] at hEq
  have hform : (Real.pi / Real.log 2) * (((I * Rs / (2 * Real.pi)) * Real.log 3) / I) =
      Rs * Real.log 3 / (2 * Real.log 2) := by
    field_simp [hπ, hI]
  rw [hform] at hEq
  have hscale : Real.log 3 = 2 * Real.log 2 := by
    have hden : 2 * Real.log 2 ≠ 0 := mul_ne_zero (by norm_num) hlog2
    rw [div_eq_iff hden] at hEq
    exact mul_left_cancel₀ hRs hEq
  have hlogs : Real.log 3 = 2 * Real.log 2 := hscale
  have h4 : 2 * Real.log 2 = Real.log 4 := by
    have hmul := Real.log_mul (by norm_num : (2 : ℝ) ≠ 0) (by norm_num : (2 : ℝ) ≠ 0)
    have hprod : (2 : ℝ) * 2 = 4 := by norm_num
    rw [hprod] at hmul
    linarith
  have hne : Real.log 3 ≠ Real.log 4 := by
    intro hlog
    have h3 : Real.exp (Real.log 3) = 3 := Real.exp_log (by norm_num)
    have h4exp : Real.exp (Real.log 4) = 4 := Real.exp_log (by norm_num)
    have : (3 : ℝ) = 4 := by rw [← h3, ← h4exp, hlog]
    norm_num at this
  exact hne (by rw [hlogs, h4])

end PhysJS.FourPoint

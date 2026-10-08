/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-162`. Bridge. Cold-air Otto efficiency.

The catalog equation is

```
η = 1 − r^(1 − γ)
```

`otto_eq` derives it from two isentropic legs at constant `γ`,
`T2 / T1 = T3 / T4 = r^(γ − 1)`, and the constant-volume heats
`Q_in = c_v (T3 − T2)`, `Q_out = c_v (T4 − T1)`. The ratio of those heats
is `r^(1 − γ)`. A temperature-dependent heat capacity is not this row.
-/

namespace PhysJS.Otto

/-- Cold-air standard efficiency.

`h2` and `h3` are the isentropic temperature ratios. `hη` is
`η = 1 − Q_out / Q_in`. -/
theorem otto_eq (η r γ T1 T2 T3 T4 cv Qin Qout : ℝ)
    (hr : 0 < r) (hcv : cv ≠ 0) (hspan : T3 - T2 ≠ 0)
    (h2 : T2 = T1 * r ^ (γ - 1))
    (h3 : T3 = T4 * r ^ (γ - 1))
    (hQin : Qin = cv * (T3 - T2))
    (hQout : Qout = cv * (T4 - T1))
    (hη : η = 1 - Qout / Qin) :
    η = 1 - r ^ (1 - γ) := by
  have hdiff : T3 - T2 = (T4 - T1) * r ^ (γ - 1) := by
    rw [h2, h3]
    ring
  have hrpow : r ^ (γ - 1) ≠ 0 := (Real.rpow_pos_of_pos hr _).ne'
  have hTdiff : T4 - T1 ≠ 0 := by
    intro hzero
    apply hspan
    rw [hdiff, hzero, zero_mul]
  have hratio : Qout / Qin = r ^ (1 - γ) := by
    rw [hQin, hQout, hdiff]
    have hstep : (cv * (T4 - T1)) / (cv * ((T4 - T1) * r ^ (γ - 1))) =
        1 / r ^ (γ - 1) := by
      field_simp [hcv, hTdiff, hrpow]
    rw [hstep, one_div, ← Real.rpow_neg hr.le]
    exact congrArg (fun z => r ^ z) (by ring)
  rw [hη, hratio]

/-- The compression ratio `r^(γ − 1)` is not the efficiency deficit. -/
theorem exponent_needed (r γ : ℝ) (hr : 1 < r) (hγ : 1 < γ) :
    r ^ (γ - 1) ≠ r ^ (1 - γ) := by
  intro hEq
  have hr0 : 0 < r := lt_trans zero_lt_one hr
  have hmul := congrArg (fun z => z * r ^ (γ - 1)) hEq
  have hleft : r ^ (γ - 1) * r ^ (γ - 1) = r ^ ((γ - 1) + (γ - 1)) := by
    rw [← Real.rpow_add hr0]
  have hright : r ^ (1 - γ) * r ^ (γ - 1) = r ^ ((1 - γ) + (γ - 1)) := by
    rw [← Real.rpow_add hr0]
  rw [hleft, hright] at hmul
  have hone : (1 - γ) + (γ - 1) = 0 := by ring
  have htwo : (γ - 1) + (γ - 1) = 2 * (γ - 1) := by ring
  rw [hone, htwo, Real.rpow_zero] at hmul
  have hpos : 0 < γ - 1 := by linarith
  have hgt : (1 : ℝ) < r ^ (2 * (γ - 1)) := by
    have hexp : 0 < 2 * (γ - 1) := by linarith
    exact Real.one_lt_rpow hr hexp
  linarith

end PhysJS.Otto

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-128`. Bridge. Ideal boost converter in continuous conduction.

The catalog equation is

```
V_out / V_in = 1 / (1 − D)
```

`boost_ratio` derives it. The switches are ideal, the input and output
voltages are constant over a period, and the inductor current does not
reach zero. On for a fraction `D` of the period the inductor sees `V_in`.
Off, it sees `V_in − V_out`. Volt-second balance sets the period average
to zero. `buck_not_boost` is the buck root `D`. No real duty makes those
two ratios agree.
-/

namespace PhysJS.BoostConverter

/-- Ideal boost. `hbal` is volt-second balance:
`V_in D + (V_in − V_out) (1 − D) = 0`.

Not
the buck ratio `D`. -/
theorem boost_ratio (Vin Vout D : ℝ) (hVin : Vin ≠ 0) (hD : D ≠ 1)
    (hbal : Vin * D + (Vin - Vout) * (1 - D) = 0) :
    Vout / Vin = 1 / (1 - D) := by
  have hden : (1 : ℝ) - D ≠ 0 := sub_ne_zero.mpr (Ne.symm hD)
  have hsum : Vin - Vout * (1 - D) = 0 := by
    have hrewrite : Vin * D + (Vin - Vout) * (1 - D) = Vin - Vout * (1 - D) := by ring
    linarith
  have hprod : Vout * (1 - D) = Vin := by linarith
  exact (div_eq_div_iff hVin hden).mpr (by linarith)

/-- The buck ratio `D` is not `1/(1−D)` for any real duty other than the
excluded `D = 1`, where the boost denominator vanishes. -/
theorem buck_not_boost (D : ℝ) (hD : D ≠ 1) : D ≠ 1 / (1 - D) := by
  intro hEq
  have hden : (1 : ℝ) - D ≠ 0 := sub_ne_zero.mpr (Ne.symm hD)
  have hmul : D * (1 - D) = 1 := by
    field_simp [hden] at hEq
    linarith
  have hquad : D ^ 2 - D + 1 = 0 := by
    have hsub : D - D ^ 2 = 1 := by linarith
    linarith
  have hpos : 0 < (D - 1 / 2) ^ 2 + 3 / 4 := by
    have : (0 : ℝ) ≤ (D - 1 / 2) ^ 2 := sq_nonneg _
    linarith
  have hrewrite : (D - 1 / 2) ^ 2 + 3 / 4 = D ^ 2 - D + 1 := by ring
  linarith

end PhysJS.BoostConverter

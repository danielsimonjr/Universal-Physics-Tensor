/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-174`. Bridge. Quarter-bridge strain gauge.

The catalog equation is

```
V_out / V_ex = x / (4 + 2 x),    x = GF ε = ΔR / R
```

A Wheatstone bridge has two voltage dividers across the excitation `V_ex`.
Three arms are fixed at `R`. The fourth is the gauge, `R_g = R (1 + x)`.
`bridge_eq` derives the ratio from Kirchhoff's current law for each
divider: the reference divider has the same two resistances and reads
`V_ex / 2`, and the gauge divider reads `V_ex (1 + x) / (2 + x)`. Their
difference is `V_ex x / (4 + 2 x)`.

`small_signal` proves the slope at `x = 0` is `1/4`, so the familiar
`V_out / V_ex ≈ x / 4` is the tangent. `nonlinearity_eq` proves the
exact deficit `x / 4 − x / (4 + 2 x) = x² / (4 (2 + x))`, the
non-linearity the small-signal rule hides. `ratio_ne_quarter` separates the
pure `x / 4`.

Premises: three equal fixed resistors, no lead-wire resistance, no
self-heating, ideal voltage source, no load on the output.
-/

namespace PhysJS.QuarterBridge

/-- Quarter bridge from the two dividers.

`Ia` and `Ib` are the divider currents. The output is the difference of the
two midpoint voltages. `hRg` is `R_g = R (1 + x)` with `x = GF ε`.

Kind `bridge` on `PhysJS.QuarterBridge.bridge_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a
half or full bridge, and not lead-wire compensation. -/
theorem bridge_eq (R Rg x Vex Ia Ib Va Vb Vout : ℝ) (hR : 0 < R) (hx : 0 < 1 + x)
    (hRg : Rg = R * (1 + x))
    (hIa : Ia * (R + R) = Vex) (hVa : Va = Ia * R)
    (hIb : Ib * (Rg + R) = Vex) (hVb : Vb = Ib * Rg)
    (hout : Vout = Vb - Va) :
    Va = Vex / 2 ∧ Vb = Vex * (1 + x) / (2 + x) ∧
      Vout = Vex * (x / (4 + 2 * x)) := by
  have hden : 0 < 2 + x := by linarith
  have hRg' : Rg + R = R * (2 + x) := by rw [hRg]; ring
  have hIa' : Ia = Vex / (2 * R) := by
    field_simp
    linarith
  have hIb' : Ib = Vex / (R * (2 + x)) := by
    rw [hRg'] at hIb
    field_simp
    linarith
  have hVa' : Va = Vex / 2 := by
    rw [hVa, hIa']
    field_simp
  have hVb' : Vb = Vex * (1 + x) / (2 + x) := by
    rw [hVb, hIb', hRg]
    field_simp
  refine ⟨hVa', hVb', ?_⟩
  have h2 : 2 + x ≠ 0 := hden.ne'
  have h4 : 4 + 2 * x ≠ 0 := by linarith
  have e : 4 + 2 * x = 2 * (2 + x) := by ring
  rw [hout, hVb', hVa', e]
  field_simp
  ring

/-- The slope of `x / (4 + 2 x)` at `x = 0` is `1 / 4`. -/
theorem small_signal :
    HasDerivAt (fun x : ℝ => x / (4 + 2 * x)) (1 / 4) 0 := by
  have hnum : HasDerivAt (fun x : ℝ => x) 1 0 := hasDerivAt_id 0
  have hden : HasDerivAt (fun x : ℝ => 4 + 2 * x) 2 0 := by
    simpa using ((hasDerivAt_id (0 : ℝ)).const_mul 2).const_add 4
  have h := hnum.div hden (by norm_num)
  refine h.congr_deriv ?_
  norm_num

/-- The tangent `x / 4` overstates the exact ratio by `x² / (4 (2 + x))`. -/
theorem nonlinearity_eq (x : ℝ) (hx : 0 < 2 + x) :
    x / 4 - x / (4 + 2 * x) = x ^ 2 / (4 * (2 + x)) := by
  have h4 : 4 + 2 * x ≠ 0 := by linarith
  have h2 : 2 + x ≠ 0 := by linarith
  have e : 4 + 2 * x = 2 * (2 + x) := by ring
  rw [e]
  field_simp
  ring

/-- Off `x = 0` the exact ratio is not `x / 4`. -/
theorem ratio_ne_quarter (x : ℝ) (hx : 0 < 2 + x) (h0 : x ≠ 0) :
    x / (4 + 2 * x) ≠ x / 4 := by
  intro h
  have h1 := nonlinearity_eq x hx
  rw [h, sub_self] at h1
  have hpos : x ^ 2 / (4 * (2 + x)) = 0 := h1.symm
  have : 0 < x ^ 2 / (4 * (2 + x)) := by positivity
  linarith

end PhysJS.QuarterBridge

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-127`. Bridge. MOSFET subthreshold swing.

The catalog equation is

```
S = ln(10) (k_B T / e) (1 + C_d / C_ox)
```

in volts per decade of drain current. `e` is the elementary charge. The
`ln` is `Real.log`. `swing_eq` derives it. Weak-inversion current is
exponential in the surface potential, the Boltzmann factor of charge `e`.
The gate and the depletion layer divide that potential. One decade is a
factor `10` in current, and `ln(10)` converts the natural exponent.
`body_factor_needed` drops `C_d`. This is not the ideal-diode current of
`be-82`.
-/

namespace PhysJS.SubthresholdSwing

/-- Subthreshold swing. `hboltz` is the Boltzmann current,
`ln(I2/I1) = e (ψ2 − ψ1) / (k_B T)`. `hdiv` is the capacitive divider
`ψ2 − ψ1 = C_ox / (C_ox + C_d) · (Vg2 − Vg1)`. `hdecade` is one decade.

Not
`be-82`. -/
theorem swing_eq (S I1 I2 ψ1 ψ2 Vg1 Vg2 e kB T Cd Cox : ℝ)
    (he : e ≠ 0) (hkT : kB * T ≠ 0) (hCox : Cox ≠ 0) (hsum : Cox + Cd ≠ 0) (_hI1 : I1 ≠ 0)
    (hboltz : Real.log (I2 / I1) = e * (ψ2 - ψ1) / (kB * T))
    (hdiv : ψ2 - ψ1 = Cox / (Cox + Cd) * (Vg2 - Vg1))
    (hdecade : I2 / I1 = 10)
    (hS : S = Vg2 - Vg1) :
    S = Real.log 10 * (kB * T / e) * (1 + Cd / Cox) := by
  have hlog : Real.log (I2 / I1) = Real.log 10 := by rw [hdecade]
  rw [hboltz, hdiv, ← hS] at hlog
  have hclear : e * Cox * S = Real.log 10 * (kB * T) * (Cox + Cd) := by
    rw [div_eq_iff hkT] at hlog
    have hmul := congrArg (fun y => y * (Cox + Cd)) hlog
    have hleft : e * (Cox / (Cox + Cd) * S) * (Cox + Cd) = e * Cox * S := by
      field_simp [hsum]
    rw [hleft] at hmul
    linarith
  have hbody : (Cox + Cd) / Cox = 1 + Cd / Cox := by
    field_simp [hCox]
  have hgoal : S * e = Real.log 10 * (kB * T) * (1 + Cd / Cox) := by
    have hscaled : S * e * Cox = Real.log 10 * (kB * T) * (Cox + Cd) := by linarith
    calc
      S * e = Real.log 10 * (kB * T) * (Cox + Cd) / Cox := by
        rw [eq_div_iff hCox]
        exact hscaled
      _ = Real.log 10 * (kB * T) * ((Cox + Cd) / Cox) := by ring
      _ = Real.log 10 * (kB * T) * (1 + Cd / Cox) := by rw [hbody]
  calc
    S = Real.log 10 * (kB * T) * (1 + Cd / Cox) / e := by
      rw [eq_div_iff he]
      exact hgoal
    _ = Real.log 10 * (kB * T / e) * (1 + Cd / Cox) := by ring

/-- The ideal swing `ln(10) k_B T / e` drops the body factor. It is not the
swing when `C_d ≠ 0`. -/
theorem body_factor_needed (kB T e Cd Cox : ℝ)
    (he : e ≠ 0) (hkT : kB * T ≠ 0) (hCox : Cox ≠ 0) (hCd : Cd ≠ 0) :
    Real.log 10 * (kB * T / e) * (1 + Cd / Cox) ≠ Real.log 10 * (kB * T / e) := by
  intro hEq
  have hlog : Real.log 10 ≠ 0 := (Real.log_pos (by norm_num : (1 : ℝ) < 10)).ne'
  have hvt : kB * T / e ≠ 0 := div_ne_zero hkT he
  have hpre : Real.log 10 * (kB * T / e) ≠ 0 := mul_ne_zero hlog hvt
  have hdiff : Real.log 10 * (kB * T / e) * (Cd / Cox) = 0 := by
    have hsub : Real.log 10 * (kB * T / e) * (1 + Cd / Cox) -
        Real.log 10 * (kB * T / e) = 0 := by linarith
    have hfac : Real.log 10 * (kB * T / e) * (1 + Cd / Cox) -
        Real.log 10 * (kB * T / e) =
        Real.log 10 * (kB * T / e) * (Cd / Cox) := by ring
    linarith
  have hcd : Cd / Cox = 0 := (mul_eq_zero.mp hdiff).resolve_left hpre
  rcases div_eq_zero_iff.mp hcd with h | h
  · exact hCd h
  · exact hCox h

end PhysJS.SubthresholdSwing

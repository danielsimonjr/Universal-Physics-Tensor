/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-212`. Bridge. Kelvin equation for the vapor pressure over a droplet.

The catalog equation is

```
ln(P / P₀) = 2 γ V_m / (r k_B T)
```

with `V_m` the volume per molecule. The derivation has two steps.

1. `laplace_eq`: a spherical interface of surface tension `γ` in mechanical
   equilibrium obeys the virtual-work balance
   `ΔP dV/dr = γ dA/dr`, with `V = 4π r³/3` and `A = 4π r²` (both derivatives
   are proved), so `ΔP = 2 γ / r`.
2. `kelvin_poynting_eq`: equality of chemical potentials, with an incompressible
   liquid `μ_l(P_l) = μ_l(P₀) + V_m (P_l − P₀)`, an ideal vapor
   `μ_v(P) = μ_v(P₀) + k_B T ln(P/P₀)`, saturation `μ_l(P₀) = μ_v(P₀)` and
   `P_l = P + 2 γ / r`, gives the exact relation
   `k_B T ln(P / P₀) = 2 γ V_m / r + V_m (P − P₀)`.
   `kelvin_eq` is the catalog form once the Poynting term `V_m (P − P₀)` is
   dropped, which is an explicit *hypothesis* (it is a relative correction of
   order `V_m P₀ / k_B T`, about 10⁻⁶ for water at 298 K, but it is not zero).

Scope: spherical interface, bulk surface tension (no curvature correction),
ideal vapor, incompressible liquid, single component. `vapor_pressure_raised`
and `log_ratio_halves` record the sign and the `1/r` scaling.
-/

namespace PhysJS.KelvinDroplet

open Real

/-- Volume of a sphere. -/
noncomputable def vol (r : ℝ) : ℝ := 4 / 3 * π * r ^ 3

/-- Area of a sphere. -/
noncomputable def area (r : ℝ) : ℝ := 4 * π * r ^ 2

lemma hasDerivAt_vol (r : ℝ) : HasDerivAt vol (4 * π * r ^ 2) r := by
  have := (hasDerivAt_pow 3 r).const_mul (4 / 3 * π)
  refine this.congr_deriv ?_
  push_cast
  ring

lemma hasDerivAt_area (r : ℝ) : HasDerivAt area (8 * π * r) r := by
  have := (hasDerivAt_pow 2 r).const_mul (4 * π)
  refine this.congr_deriv ?_
  push_cast
  ring

/-- Young–Laplace pressure from the virtual-work balance of a sphere.

`hwork`: `ΔP V'(r) = γ A'(r)`. -/
theorem laplace_eq (ΔP γ r : ℝ) (hr : 0 < r)
    (hwork : ΔP * deriv vol r = γ * deriv area r) : ΔP = 2 * γ / r := by
  rw [(hasDerivAt_vol r).deriv, (hasDerivAt_area r).deriv] at hwork
  have hπ : π ≠ 0 := Real.pi_ne_zero
  have hr0 : r ≠ 0 := hr.ne'
  rw [eq_div_iff hr0]
  have hne : 4 * π * r ≠ 0 := by positivity
  apply mul_left_cancel₀ hne
  linear_combination hwork

/-- Kelvin equation with the Poynting term kept exactly.

`hμ`: the chemical potentials of liquid (at `P_l`) and vapor (at `P`) are equal.
`hliq`, `hvap`: incompressible liquid and ideal vapor. `hsat`: saturation at
`P₀`. `hPl`: `P_l = P + 2γ/r`. -/
theorem kelvin_poynting_eq (μl μv μl0 μv0 Pl P P0 Vm γ r kB T : ℝ)
    (hr : 0 < r)
    (hμ : μl = μv)
    (hliq : μl = μl0 + Vm * (Pl - P0))
    (hvap : μv = μv0 + kB * T * Real.log (P / P0))
    (hsat : μl0 = μv0)
    (hPl : Pl = P + 2 * γ / r) :
    kB * T * Real.log (P / P0) = 2 * γ * Vm / r + Vm * (P - P0) := by
  have h : kB * T * Real.log (P / P0) = Vm * (Pl - P0) := by linarith
  rw [h, hPl]
  field_simp
  ring

/-- Kelvin equation: the catalog form, with the Poynting term dropped as a
hypothesis `hneglect : V_m (P − P₀) = 0`.

Bulk surface
tension and an ideal vapor; the Poynting correction is a stated hypothesis. -/
theorem kelvin_eq (μl μv μl0 μv0 Pl P P0 Vm γ r kB T : ℝ)
    (_hP : 0 < P) (_hP0 : 0 < P0) (hr : 0 < r) (hkT : 0 < kB * T)
    (hμ : μl = μv)
    (hliq : μl = μl0 + Vm * (Pl - P0))
    (hvap : μv = μv0 + kB * T * Real.log (P / P0))
    (hsat : μl0 = μv0)
    (hPl : Pl = P + 2 * γ / r)
    (hneglect : Vm * (P - P0) = 0) :
    Real.log (P / P0) = 2 * γ * Vm / (r * (kB * T)) := by
  have h := kelvin_poynting_eq μl μv μl0 μv0 Pl P P0 Vm γ r kB T hr hμ hliq hvap hsat hPl
  rw [hneglect, add_zero] at h
  have hkT0 : kB * T ≠ 0 := hkT.ne'
  have hr0 : r ≠ 0 := hr.ne'
  rw [eq_div_iff (mul_ne_zero hr0 hkT0)]
  field_simp at h
  linarith

/-- The whole chain: virtual work gives the Laplace pressure, the chemical
potentials give the Kelvin equation. -/
theorem kelvin_laplace_eq (μl μv μl0 μv0 Pl P P0 Vm γ ΔP r kB T : ℝ)
    (hP : 0 < P) (hP0 : 0 < P0) (hr : 0 < r) (hkT : 0 < kB * T)
    (hwork : ΔP * deriv vol r = γ * deriv area r)
    (hμ : μl = μv)
    (hliq : μl = μl0 + Vm * (Pl - P0))
    (hvap : μv = μv0 + kB * T * Real.log (P / P0))
    (hsat : μl0 = μv0)
    (hPl : Pl = P + ΔP)
    (hneglect : Vm * (P - P0) = 0) :
    Real.log (P / P0) = 2 * γ * Vm / (r * (kB * T)) := by
  have hΔ := laplace_eq ΔP γ r hr hwork
  exact kelvin_eq μl μv μl0 μv0 Pl P P0 Vm γ r kB T hP hP0 hr hkT hμ hliq hvap hsat
    (by rw [hPl, hΔ]) hneglect

/-- Sign: positive tension, volume and radius raise the vapor pressure. -/
theorem vapor_pressure_raised (P P0 Vm γ r kB T : ℝ) (hP : 0 < P) (hP0 : 0 < P0)
    (hr : 0 < r) (hkT : 0 < kB * T) (hVm : 0 < Vm) (hγ : 0 < γ)
    (h : Real.log (P / P0) = 2 * γ * Vm / (r * (kB * T))) : P0 < P := by
  have hpos : 0 < Real.log (P / P0) := by
    rw [h]; positivity
  have := (Real.log_pos_iff (div_pos hP hP0).le).mp hpos
  rw [lt_div_iff₀ hP0] at this
  linarith

/-- Control: doubling the radius halves the logarithm of the pressure ratio
(a `1/r` law, not `1/r²`). -/
theorem log_ratio_halves (γ Vm r kB T : ℝ) (hr : r ≠ 0) :
    2 * γ * Vm / ((2 * r) * (kB * T)) = (1 / 2) * (2 * γ * Vm / (r * (kB * T))) := by
  by_cases h : kB * T = 0
  · simp [h]
  · field_simp

end PhysJS.KelvinDroplet

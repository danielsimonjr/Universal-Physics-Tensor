/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Clapeyron
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

open MeasureTheory

/-!
`be-152`. Bridge. The integrated Clausius–Clapeyron equation.

The catalog equation is

```
ln(P2 / P1) = −(ΔH / R) (1/T2 − 1/T1)
```

`ideal_vapor_slope` calls `PhysJS.Clapeyron.slope_eq`, the coexistence
slope of `be-71`, and substitutes the ideal-vapor closure `Δv = R T / P`
with the liquid volume already absorbed into that difference. The
logarithmic derivative is then `d ln P / dT = ΔH / (R T²)`. `integrated_eq`
integrates that slope at constant `ΔH`. A liquid volume that is not folded
into `Δv`, and a temperature-dependent latent heat, are not this row. This
is not a second proof of `be-71`.
-/

namespace PhysJS.ClausiusClapeyron

/-- Ideal vapor turns the Clapeyron slope into `d ln P / dT = L / (R T²)`.

This calls `PhysJS.Clapeyron.slope_eq`. `hideal` is `v2 − v1 = R T / P`. -/
theorem ideal_vapor_slope (g1 g2 P : ℝ → ℝ) (s1 s2 v1 v2 L R T0 : ℝ)
    (hcoex : g1 = g2)
    (h1 : HasDerivAt g1 (-s1 + v1 * deriv P T0) T0)
    (h2 : HasDerivAt g2 (-s2 + v2 * deriv P T0) T0)
    (hΔv : v2 - v1 ≠ 0) (hT : 0 < T0) (hL : L = T0 * (s2 - s1))
    (hR : R ≠ 0) (hPne : P T0 ≠ 0)
    (hP' : DifferentiableAt ℝ P T0)
    (hideal : v2 - v1 = R * T0 / P T0) :
    HasDerivAt (fun t => Real.log (P t)) (L / (R * T0 ^ 2)) T0 := by
  have hs :=
    PhysJS.Clapeyron.slope_eq g1 g2 P s1 s2 v1 v2 L T0 hcoex h1 h2 hΔv hT.ne' hL
  have hlog := (hP'.hasDerivAt).log hPne
  refine hlog.congr_deriv ?_
  rw [hs, hideal]
  field_simp [hT.ne', hR, hPne]

/-- Constant latent heat integrates the ideal-vapor slope.

`hslope` is `ideal_vapor_slope` at every temperature between `T1` and `T2`.
Both temperatures are positive, so the segment does not contain `0`.

Kind `bridge` on `PhysJS.ClausiusClapeyron.integrated_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. -/
theorem integrated_eq (P : ℝ → ℝ) (L R T1 T2 : ℝ)
    (hR : R ≠ 0) (hT1 : 0 < T1) (hT2 : 0 < T2) (hP1 : 0 < P T1) (hP2 : 0 < P T2)
    (hslope : ∀ t ∈ Set.uIcc T1 T2,
      HasDerivAt (fun u => Real.log (P u)) (L / (R * t ^ 2)) t) :
    Real.log (P T2 / P T1) = -(L / R) * (T2⁻¹ - T1⁻¹) := by
  let f : ℝ → ℝ := fun t => Real.log (P t) + (L / R) * t⁻¹
  have hpos : ∀ t ∈ Set.uIcc T1 T2, 0 < t := by
    intro t ht
    rcases Set.mem_uIcc.mp ht with ⟨hlo, _⟩ | ⟨hlo, _⟩
    · exact lt_of_lt_of_le hT1 hlo
    · exact lt_of_lt_of_le hT2 hlo
  have hf : ∀ t ∈ Set.uIcc T1 T2, HasDerivAt f 0 t := by
    intro t ht
    have ht0 : t ≠ 0 := (hpos t ht).ne'
    have hinv : HasDerivAt (fun u : ℝ => u⁻¹) (-(t ^ 2)⁻¹) t := hasDerivAt_inv ht0
    have hscaled := hinv.const_mul (L / R)
    have hlog := hslope t ht
    have hsum := hlog.add hscaled
    refine hsum.congr_deriv ?_
    rw [inv_eq_one_div]
    field_simp [hR, ht0]
    ring
  have hint : IntervalIntegrable (fun _ : ℝ => (0 : ℝ)) volume T1 T2 :=
    intervalIntegrable_const
  have hsub := intervalIntegral.integral_eq_sub_of_hasDerivAt hf hint
  have hflat : f T2 = f T1 := by
    have hconst : ∫ _t in T1..T2, (0 : ℝ) = 0 := by simp
    have hsub' : (0 : ℝ) = f T2 - f T1 := hconst ▸ hsub
    linarith
  have hlogs : Real.log (P T2) - Real.log (P T1) = -(L / R) * (T2⁻¹ - T1⁻¹) := by
    have hft : f T2 - f T1 = 0 := by linarith
    simp only [f] at hft
    linarith
  rw [Real.log_div hP2.ne' hP1.ne']
  exact hlogs

end PhysJS.ClausiusClapeyron

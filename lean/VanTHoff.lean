/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.GibbsIsotherm
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-149`. Bridge. The van 't Hoff equation.

The catalog equation is

```
d ln K / dT = ΔH° / (R T²)
```

`vant_hoff` differentiates the Gibbs isotherm at constant `ΔH°` and `ΔS°`.
`equilibrium_log` is `PhysJS.GibbsIsotherm.gibbs_eq`: `ΔG° = −R T ln K`
rearranges to `ln K = −ΔG° / (R T)`. The closure `ΔG° = ΔH° − T ΔS°` then
gives `ln K = −ΔH° / (R T) + ΔS° / R`. The temperature derivative of that
expression is the van 't Hoff slope. `ΔH°` and `ΔS°` are constant on the
interval. A van 't Hoff plot is not this row.
-/

namespace PhysJS.VanTHoff

/-- The Gibbs isotherm is `ln K = −ΔG° / (R T)`.

This is `PhysJS.GibbsIsotherm.gibbs_eq`, rearranged. -/
theorem equilibrium_log {ι : Type*} (s : Finset ι) (ν μ μ0 a : ι → ℝ) (R T K dG : ℝ)
    (hT : T ≠ 0) (hR : R ≠ 0) (hK : 0 < K)
    (hact : ∀ i ∈ s, 0 < a i)
    (hμ : ∀ i ∈ s, μ i = μ0 i + R * T * Real.log (a i))
    (hlogK : Real.log K = ∑ i ∈ s, ν i * Real.log (a i))
    (hdG : dG = ∑ i ∈ s, ν i * μ0 i)
    (hequil : ∑ i ∈ s, ν i * μ i = 0) :
    Real.log K = -dG / (R * T) :=
  (PhysJS.GibbsIsotherm.gibbs_eq s ν μ μ0 a R T K dG hT hR hK hact hμ hlogK hdG hequil).2.1

/-- Constant enthalpy and entropy turn the isotherm into `−ΔH°/(R T) + ΔS°/R`. -/
theorem enthalpy_log (K : ℝ → ℝ) (dG : ℝ → ℝ) (dH dS R T : ℝ)
    (hT : T ≠ 0) (hR : R ≠ 0) (hK : 0 < K T)
    (hgibbs : Real.log (K T) = -dG T / (R * T))
    (hthermo : dG T = dH - T * dS) :
    Real.log (K T) = -dH / (R * T) + dS / R := by
  rw [hgibbs, hthermo]
  field_simp [hR, hT]
  ring

/-- van 't Hoff slope.

`hlog` is `enthalpy_log` at every nonzero temperature: the Gibbs isotherm
at `ΔG° = ΔH° − T ΔS°`, with both `ΔH°` and `ΔS°` constant.

Not a
second proof of `be-150`. -/
theorem vant_hoff (K : ℝ → ℝ) (dH dS R T : ℝ)
    (hR : R ≠ 0) (hT : T ≠ 0)
    (hlog : ∀ t, t ≠ 0 → Real.log (K t) = -dH / (R * t) + dS / R) :
    HasDerivAt (fun t => Real.log (K t)) (dH / (R * T ^ 2)) T := by
  have hfun : (fun t => Real.log (K t)) =ᶠ[nhds T]
      ((fun t => -dH / (R * t)) + fun _ => dS / R) := by
    filter_upwards [eventually_ne_nhds hT] with t ht
    simpa using hlog t ht
  have hscaled0 := (hasDerivAt_inv hT).const_mul (-dH / R)
  have hform : (fun t => -dH / (R * t)) = fun t => (-dH / R) * t⁻¹ := by
    funext t
    field_simp
  have hscaled : HasDerivAt (fun t => -dH / (R * t)) (dH / (R * T ^ 2)) T := by
    rw [hform]
    refine hscaled0.congr_deriv ?_
    field_simp [hR, hT]
  have hconst : HasDerivAt (fun _ : ℝ => dS / R) 0 T := hasDerivAt_const T (dS / R)
  exact ((hscaled.add hconst).congr_of_eventuallyEq hfun).congr_deriv (by simp)

end PhysJS.VanTHoff

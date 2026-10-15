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

`vant_hoff` derives the slope from the reacting species at every nonzero
temperature `t`: ideal chemical potentials `μ_i(t) = μ_i°(t) + R t ln a_i(t)`,
`ln K(t) = Σ ν_i ln a_i(t)`, `ΔG°(t) = Σ ν_i μ_i°(t)`, the equilibrium
condition `Σ ν_i μ_i(t) = 0`, and the closure `ΔG°(t) = ΔH° − t ΔS°` with
`ΔH°` and `ΔS°` constant. `equilibrium_log` is `PhysJS.GibbsIsotherm.gibbs_eq`
at each `t`: `ln K = −ΔG° / (R t)`. `enthalpy_log` turns that into
`ln K = −ΔH° / (R t) + ΔS° / R`, and `slope_of_log` differentiates it at `T`.
The integrated form is derived, not assumed. A van 't Hoff plot is not this
row.
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
    (hT : T ≠ 0) (hR : R ≠ 0)
    (hgibbs : Real.log (K T) = -dG T / (R * T))
    (hthermo : dG T = dH - T * dS) :
    Real.log (K T) = -dH / (R * T) + dS / R := by
  rw [hgibbs, hthermo]
  field_simp [hR, hT]
  ring

/-- The derivative of `ln K = −ΔH°/(R t) + ΔS°/R` at `T` is `ΔH°/(R T²)`.

`hlog` is the integrated form; `vant_hoff` derives it rather than assuming
it. -/
theorem slope_of_log (K : ℝ → ℝ) (dH dS R T : ℝ)
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

/-- van 't Hoff slope, from the species' chemical potentials.

At every nonzero temperature `t` the activities `a t i` are positive, each
chemical potential is ideal, `ln K(t)` is the activity quotient, `ΔG°(t)` is
the standard-potential sum, the reaction is at equilibrium, and
`ΔG°(t) = ΔH° − t ΔS°` with `ΔH°` and `ΔS°` constant. `equilibrium_log`
(`PhysJS.GibbsIsotherm.gibbs_eq` at `t`) and `enthalpy_log` give
`ln K(t) = −ΔH°/(R t) + ΔS°/R`; `slope_of_log` differentiates it.

Not a second proof of `be-150`: the isotherm at each `t` is that theorem. -/
theorem vant_hoff {ι : Type*} (s : Finset ι) (ν : ι → ℝ) (μ μ0 a : ℝ → ι → ℝ)
    (K dG : ℝ → ℝ) (dH dS R T : ℝ)
    (hR : R ≠ 0) (hT : T ≠ 0)
    (hK : ∀ t, t ≠ 0 → 0 < K t)
    (hact : ∀ t, t ≠ 0 → ∀ i ∈ s, 0 < a t i)
    (hμ : ∀ t, t ≠ 0 → ∀ i ∈ s, μ t i = μ0 t i + R * t * Real.log (a t i))
    (hlogK : ∀ t, t ≠ 0 → Real.log (K t) = ∑ i ∈ s, ν i * Real.log (a t i))
    (hdG : ∀ t, t ≠ 0 → dG t = ∑ i ∈ s, ν i * μ0 t i)
    (hequil : ∀ t, t ≠ 0 → ∑ i ∈ s, ν i * μ t i = 0)
    (hthermo : ∀ t, t ≠ 0 → dG t = dH - t * dS) :
    HasDerivAt (fun t => Real.log (K t)) (dH / (R * T ^ 2)) T := by
  refine slope_of_log K dH dS R T hR hT fun t ht => ?_
  exact enthalpy_log K dG dH dS R t ht hR
    (equilibrium_log s ν (μ t) (μ0 t) (a t) R t (K t) (dG t) ht hR (hK t ht)
      (hact t ht) (hμ t ht) (hlogK t ht) (hdG t ht) (hequil t ht))
    (hthermo t ht)

end PhysJS.VanTHoff

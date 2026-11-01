/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.GibbsIsotherm
import Mathlib.Analysis.Calculus.Deriv.Basic
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
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
temperature `t`, via the Gibbs–Helmholtz route and constant-`ΔH°` closure.
`slope_sign`, `two_temperature`, and `delta_cp_counterexample` record sign,
integrated, and Kirchhoff `ΔH(T) = ΔH₀ + ΔC_p (T − T₀)` counterexamples.
A van 't Hoff plot is not this row.
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

theorem gibbs_helmholtz_slope (K : ℝ → ℝ) (dG dH : ℝ → ℝ) (R T : ℝ)
    (hR : R ≠ 0) (hT : T ≠ 0)
    (hlog : ∀ t, t ≠ 0 → Real.log (K t) = -dG t / (R * t))
    (hGH : HasDerivAt (fun t => dG t / t) (-dH T / T ^ 2) T) :
    HasDerivAt (fun t => Real.log (K t)) (dH T / (R * T ^ 2)) T := by
  have hfun : (fun t => Real.log (K t)) =ᶠ[nhds T] fun t => -dG t / (R * t) := by
    filter_upwards [eventually_ne_nhds hT] with t ht
    simpa using hlog t ht
  have hquot : HasDerivAt (fun t => -dG t / (R * t)) (dH T / (R * T ^ 2)) T := by
    have hscale := hGH.const_mul (-1 / R)
    have hform : (fun t => -dG t / (R * t)) = fun t => (-1 / R) * (dG t / t) := by
      funext t; field_simp
    rw [hform]
    refine hscale.congr_deriv ?_; field_simp [hR, hT]
  exact hquot.congr_of_eventuallyEq hfun

theorem gibbs_helmholtz_constant (dG : ℝ → ℝ) (dH dS T : ℝ) (hT : T ≠ 0)
    (hthermo : ∀ t, t ≠ 0 → dG t = dH - t * dS) :
    HasDerivAt (fun t => dG t / t) (-dH / T ^ 2) T := by
  have hfun : (fun t => dG t / t) =ᶠ[nhds T] fun t => dH / t - dS := by
    filter_upwards [eventually_ne_nhds hT] with t ht
    rw [hthermo t ht]; field_simp [ht]
  have h1 : HasDerivAt (fun t => dH / t) (-dH / T ^ 2) T := by
    have h := (hasDerivAt_inv hT).const_mul dH
    convert h using 1; field_simp [hT]; ring
  have h2 : HasDerivAt (fun _ : ℝ => dS) 0 T := hasDerivAt_const T dS
  exact ((h1.sub h2).congr_of_eventuallyEq hfun).congr_deriv (by simp)

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

theorem slope_sign (dH R T : ℝ) (hR : 0 < R) (hT : 0 < T) :
    (0 < dH ↔ 0 < dH / (R * T ^ 2)) ∧ (dH < 0 ↔ dH / (R * T ^ 2) < 0) := by
  have hden : 0 < R * T ^ 2 := mul_pos hR (sq_pos_of_ne_zero hT.ne')
  constructor
  · exact ⟨fun h => div_pos h hden, fun h => by
      rcases (div_pos_iff.1 h) with ⟨ha, hb⟩ | ⟨ha, hb⟩
      · exact ha
      · exfalso; linarith [hden, hb]⟩
  · constructor
    · intro h; exact div_neg_of_neg_of_pos h hden
    · intro h
      rcases (div_neg_iff.1 h) with ⟨ha, hb⟩ | ⟨ha, hb⟩
      · exfalso; linarith [hden, hb]
      · exact ha

theorem two_temperature (K : ℝ → ℝ) (dH dS R T1 T2 : ℝ)
    (hR : R ≠ 0) (hT1 : T1 ≠ 0) (hT2 : T2 ≠ 0)
    (hK1 : 0 < K T1) (hK2 : 0 < K T2)
    (hlog : ∀ t, t ≠ 0 → Real.log (K t) = -dH / (R * t) + dS / R) :
    Real.log (K T2 / K T1) = dH / R * (1 / T1 - 1 / T2) := by
  rw [Real.log_div (ne_of_gt hK2) (ne_of_gt hK1), hlog T2 hT2, hlog T1 hT1]
  have : (-dH / (R * T2) + dS / R) - (-dH / (R * T1) + dS / R) =
      dH / R * (1 / T1 - 1 / T2) := by
    field_simp [hR, hT1, hT2]; ring
  simpa using this

/-- Kirchhoff enthalpy `ΔH(T) = ΔH₀ + ΔC_p (T − T₀)`. -/
noncomputable def kirchhoffEnthalpy (dH0 dCp T0 T : ℝ) : ℝ :=
  dH0 + dCp * (T - T0)

/-- Variable `ΔC_p` makes the slope differ from the constant-`ΔH₀` reference. -/
theorem delta_cp_slope_ne_constant_reference (dH0 dCp R T0 T : ℝ)
    (hR : R ≠ 0) (hT : T ≠ 0) (hCp : dCp ≠ 0) (hTT0 : T ≠ T0) :
    kirchhoffEnthalpy dH0 dCp T0 T / (R * T ^ 2) ≠ dH0 / (R * T ^ 2) := by
  unfold kirchhoffEnthalpy
  intro h
  have hden : R * T ^ 2 ≠ 0 := mul_ne_zero hR (pow_ne_zero 2 hT)
  have heq : dH0 + dCp * (T - T0) = dH0 := (div_left_inj' hden).mp h
  have hprod : dCp * (T - T0) = 0 := by linarith [heq]
  rcases mul_eq_zero.mp hprod with h0 | h1
  · exact hCp h0
  · exact hTT0 (sub_eq_zero.mp h1)

/-- The constant-`ΔH₀` integrated form cannot hold if the slope uses Kirchhoff `ΔH(T)`. -/
theorem delta_cp_counterexample (K : ℝ → ℝ) (dH0 dS R T0 T dCp : ℝ)
    (hR : R ≠ 0) (hT : T ≠ 0) (hCp : dCp ≠ 0) (hTT0 : T ≠ T0)
    (hlog : ∀ t, t ≠ 0 → Real.log (K t) = -dH0 / (R * t) + dS / R) :
    ¬ HasDerivAt (fun t => Real.log (K t))
        (kirchhoffEnthalpy dH0 dCp T0 T / (R * T ^ 2)) T := by
  have hconst := slope_of_log K dH0 dS R T hR hT hlog
  intro hvar
  exact delta_cp_slope_ne_constant_reference dH0 dCp R T0 T hR hT hCp hTT0
    (hvar.unique hconst)

theorem slope_unit_enthalpy (R : ℝ) (hR : R ≠ 0) :
    R / (R * (1 : ℝ) ^ 2) = 1 := by
  field_simp [hR]

theorem slope_exothermic (R T : ℝ) (hR : R ≠ 0) (hT : T ≠ 0) :
    (-R) / (R * T ^ 2) = -1 / T ^ 2 := by
  field_simp [hR, hT]

theorem vant_hoff_constant {ι : Type*} (s : Finset ι) (ν : ι → ℝ) (μ μ0 a : ℝ → ι → ℝ)
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
  let dHfun : ℝ → ℝ := fun _ => dH
  refine gibbs_helmholtz_slope K dG dHfun R T hR hT (fun t ht => ?_) ?_
  · exact equilibrium_log s ν (μ t) (μ0 t) (a t) R t (K t) (dG t) ht hR (hK t ht)
      (hact t ht) (hμ t ht) (hlogK t ht) (hdG t ht) (hequil t ht)
  · simpa [dHfun] using gibbs_helmholtz_constant dG dH dS T hT hthermo

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
    HasDerivAt (fun t => Real.log (K t)) (dH / (R * T ^ 2)) T :=
  vant_hoff_constant s ν μ μ0 a K dG dH dS R T hR hT hK hact hμ hlogK hdG hequil hthermo

end PhysJS.VanTHoff

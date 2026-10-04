/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-77`. Bridge. Hagen–Poiseuille flow, and the laminar Darcy number.

The catalog equations are

```
Q = π R⁴ ΔP / (8 μ L)
f_D Re = 64
```

`flow_eq` integrates them. Steady flow in a straight circular pipe, fully
developed, with a constant axial pressure gradient `G = dP/dz` and a
Newtonian viscosity, is the radial balance

```
d/dr (r du/dr) = (G / μ) r
```

written so that it still makes sense on the axis. `axial_slope` integrates
that once. The axis condition `du/dr = 0` at `r = 0` kills the singular
solution. No-slip `u(R) = 0` integrates it again: `parabolic_profile` is
`u(r) = (G / (4 μ)) (r² − R²)`. The pressure drop is `G = −ΔP / L`.

The volume flow is the integral `Q = ∫₀ᴿ u(r) 2 π r dr`, not a second
formula. That integral is `π R⁴ ΔP / (8 μ L)`. The Darcy friction factor
`f_D = (ΔP / L) D / (ρ v² / 2)`, with `D = 2 R` and `Q = v π R²`, then
satisfies `f_D Re = 64` for `Re = ρ v D / μ`. The `64` is this integral.
A square duct is a different eigenvalue of the same balance, and this file
does not claim it.

`fanning_not_darcy` keeps the same profile and the wall shear
`τ = μ |du/dr|`, and uses the Fanning normalization `τ / (ρ v² / 2)`.
That product is `16`, not `64`. `coefficient_not_fixed` separates any other
factor from `8`.
-/

namespace PhysJS.HagenPoiseuille

open Real Set MeasureTheory intervalIntegral

/-- A function whose derivative vanishes everywhere is constant. -/
lemma eq_of_deriv_zero (f : ℝ → ℝ) (hf : ∀ y, HasDerivAt f 0 y) (a b : ℝ) : f a = f b := by
  by_cases hab : a = b
  · rw [hab]
  have hlt : min a b < max a b := by
    cases le_total a b with
    | inl hle =>
      rw [min_eq_left hle, max_eq_right hle]
      exact lt_of_le_of_ne hle hab
    | inr hle =>
      rw [min_eq_right hle, max_eq_left hle]
      exact lt_of_le_of_ne hle (Ne.symm hab)
  have hcont : ContinuousOn f (Icc (min a b) (max a b)) :=
    fun y _ => (hf y).continuousAt.continuousWithinAt
  have hff : ∀ y ∈ Ioo (min a b) (max a b), HasDerivAt f 0 y := fun y _ => hf y
  obtain ⟨_, _, hslope⟩ := exists_hasDerivAt_eq_slope f (fun _ => (0 : ℝ)) hlt hcont hff
  have hspan : max a b - min a b ≠ 0 := sub_ne_zero.mpr hlt.ne'
  have hflat : f (max a b) = f (min a b) := by
    have hzero : (f (max a b) - f (min a b)) / (max a b - min a b) = 0 := hslope.symm
    rw [div_eq_zero_iff] at hzero
    rcases hzero with h | h
    · linarith
    · exact absurd h hspan
  cases le_total a b with
  | inl hle => simpa [min_eq_left hle, max_eq_right hle] using hflat.symm
  | inr hle => simpa [min_eq_right hle, max_eq_left hle] using hflat

/-- `f' = c · id` and `f 0 = 0` integrate to `(c / 2) x²`. The `2` is this integral. -/
theorem integrate_linear (f : ℝ → ℝ) (c x : ℝ) (hf : ∀ y, HasDerivAt f (c * y) y)
    (h0 : f 0 = 0) : f x = (c / 2) * x ^ 2 := by
  by_cases hx : x = 0
  · simp [hx, h0]
  let g : ℝ → ℝ := fun y => f y - (c / 2) * y ^ 2
  have hg : ∀ y, HasDerivAt g 0 y := by
    intro y
    have hsq : HasDerivAt (fun t => t ^ 2) (2 * y) y := by
      simpa using hasDerivAt_pow 2 y
    have hE : HasDerivAt (fun t => (c / 2) * t ^ 2) (c * y) y := by
      have hmul := hsq.const_mul (c / 2)
      simpa using hmul.congr_deriv (by ring : (c / 2) * (2 * y) = c * y)
    exact ((hf y).sub hE).congr_deriv (by ring)
  have hconst := eq_of_deriv_zero g hg x 0
  have hg0 : g 0 = 0 := by simp [g, h0]
  have hgx : g x = 0 := hconst.trans hg0
  have hsub : f x - (c / 2) * x ^ 2 = 0 := by simpa [g] using hgx
  linarith

/-- One integration of the axial balance. `hderiv` is `d/dr (r du/dr) = (G/μ) r`.
`haxis` is `du/dr = 0` on the centerline, so the solution stays bounded. -/
theorem axial_slope (slope : ℝ → ℝ) (G μ : ℝ) (hμ : μ ≠ 0)
    (hderiv : ∀ s, HasDerivAt (fun t => t * slope t) ((G / μ) * s) s) (haxis : slope 0 = 0) :
    ∀ r, slope r = (G / (2 * μ)) * r := by
  intro r
  have hprod :=
    integrate_linear (fun t => t * slope t) (G / μ) r hderiv (by simp)
  by_cases hr : r = 0
  · simp [hr, haxis]
  have hmul : r * slope r = r * ((G / (2 * μ)) * r) := by
    calc
      r * slope r = (G / μ) / 2 * r ^ 2 := by simpa [div_eq_mul_inv] using hprod
      _ = (G / (2 * μ)) * r ^ 2 := by field_simp [hμ]
      _ = r * ((G / (2 * μ)) * r) := by ring
  exact mul_left_cancel₀ hr hmul

/-- No-slip integrates the linear slope. `G` is `dP/dz`. -/
theorem parabolic_profile (u slope : ℝ → ℝ) (G μ R r : ℝ) (hμ : μ ≠ 0)
    (hslope : ∀ s, slope s = (G / (2 * μ)) * s) (hvel : ∀ s, HasDerivAt u (slope s) s)
    (hwall : u R = 0) : u r = (G / (4 * μ)) * (r ^ 2 - R ^ 2) := by
  let parabola : ℝ → ℝ := fun s => (G / (4 * μ)) * s ^ 2
  let g : ℝ → ℝ := u - parabola
  have hg : ∀ s, HasDerivAt g 0 s := by
    intro s
    have hsq : HasDerivAt (fun t => t ^ 2) (2 * s) s := by
      simpa using hasDerivAt_pow 2 s
    have hcoeff : (G / (4 * μ)) * (2 * s) = (G / (2 * μ)) * s := by
      field_simp [hμ]
      ring
    have hP : HasDerivAt parabola ((G / (2 * μ)) * s) s := by
      have hmul := hsq.const_mul (G / (4 * μ))
      simpa [parabola] using hmul.congr_deriv hcoeff
    have hu : HasDerivAt u ((G / (2 * μ)) * s) s := by
      simpa [hslope s] using hvel s
    exact (hu.sub hP).congr_deriv (by ring)
  have hconst := eq_of_deriv_zero g hg r R
  have hwall' : g R = -parabola R := by simp [g, hwall]
  have hr : u r = parabola r + g R := by
    have : u r - parabola r = g R := by simpa [g] using hconst
    linarith
  rw [hr, hwall']
  simp only [parabola]
  ring

/-- The flux integral of the parabola. `0 ≤ R` is the pipe. -/
theorem flux_of_parabola (G μ R : ℝ) (hμ : μ ≠ 0) (_hR : 0 ≤ R) :
    (∫ r in (0 : ℝ)..R, ((G / (4 * μ)) * (r ^ 2 - R ^ 2)) * (2 * Real.pi * r)) =
      -(Real.pi * R ^ 4 * G) / (8 * μ) := by
  have hpoly : ∀ r, ((G / (4 * μ)) * (r ^ 2 - R ^ 2)) * (2 * Real.pi * r) =
      (G * Real.pi / (2 * μ)) * (r ^ 3 - R ^ 2 * r) := by
    intro r
    field_simp [hμ]
    ring
  rw [integral_congr (fun r _ => hpoly r), intervalIntegral.integral_const_mul]
  have hint1 : IntervalIntegrable (fun r : ℝ => r ^ 3) volume 0 R :=
    (continuous_id.pow 3).intervalIntegrable 0 R
  have hint2 : IntervalIntegrable (fun r : ℝ => R ^ 2 * r) volume 0 R :=
    (continuous_const.mul continuous_id).intervalIntegrable 0 R
  rw [intervalIntegral.integral_sub hint1 hint2, integral_pow, intervalIntegral.integral_const_mul,
    integral_id]
  have h0 : (0 : ℝ) ^ 4 = 0 := by norm_num
  have h02 : (0 : ℝ) ^ 2 = 0 := by norm_num
  rw [h0, h02]
  field_simp [hμ]
  ring

/-- Hagen–Poiseuille, and `f_D Re = 64` for that profile.

`hderiv` is the axial balance, `haxis` the centerline, `hvel` says `slope`
is `du/dr`, and `hwall` is no-slip. `hgrad` is `G = −ΔP/L`. `hQ` is the
volume flux of that profile. `hD`, `hv`, `hfD`, and `hRe` are the Darcy
definitions; they are not a second pipe solution.

Kind `bridge` on `PhysJS.HagenPoiseuille.flow_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not a square
duct, and not the Fanning number `16`. -/
theorem flow_eq
    (u slope : ℝ → ℝ)
    (G μ R ΔP L Q D v ρ fD Re : ℝ)
    (hμ : μ ≠ 0) (hL : L ≠ 0) (hR : 0 < R) (hρ : ρ ≠ 0) (hv0 : v ≠ 0)
    (hderiv : ∀ s, HasDerivAt (fun t => t * slope t) ((G / μ) * s) s)
    (haxis : slope 0 = 0)
    (hvel : ∀ s, HasDerivAt u (slope s) s)
    (hwall : u R = 0)
    (hgrad : G = -ΔP / L)
    (hQ : Q = ∫ r in (0 : ℝ)..R, u r * (2 * Real.pi * r))
    (hD : D = 2 * R)
    (hv : Q = v * Real.pi * R ^ 2)
    (hfD : fD = (ΔP / L) * D / (ρ * v ^ 2 / 2))
    (hRe : Re = ρ * v * D / μ) :
    Q = Real.pi * R ^ 4 * ΔP / (8 * μ * L) ∧ fD * Re = 64 := by
  have hslope := axial_slope slope G μ hμ hderiv haxis
  have hpar_r : ∀ r, u r = (G / (4 * μ)) * (r ^ 2 - R ^ 2) :=
    fun r => parabolic_profile u slope G μ R r hμ hslope hvel hwall
  have hflux := flux_of_parabola G μ R hμ hR.le
  have hQval : Q = -(Real.pi * R ^ 4 * G) / (8 * μ) := by
    rw [hQ, integral_congr (fun r _ => by rw [hpar_r r]), hflux]
  have hdrop : Q = Real.pi * R ^ 4 * ΔP / (8 * μ * L) := by
    rw [hQval, hgrad]
    field_simp [hμ, hL]
  refine ⟨hdrop, ?_⟩
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hmean : v = ΔP * R ^ 2 / (8 * μ * L) := by
    have hQpos : Q = v * Real.pi * R ^ 2 := by exact hv
    rw [hdrop] at hQpos
    field_simp [hμ, hL, hπ, hR.ne'] at hQpos ⊢
    linarith
  have hgradP : ΔP / L = 8 * μ * v / R ^ 2 := by
    rw [hmean]
    field_simp [hμ, hL, hR.ne']
  rw [hfD, hRe, hD, hgradP]
  field_simp [hμ, hρ, hv0, hR.ne']
  ring

/-- The same parabola with the Fanning normalization is `16`, not `64`.

`τ` is `μ` times the wall slope, with the sign dropped. `fF` divides that
shear by `ρ v² / 2`. -/
theorem fanning_not_darcy (μ R ΔP L v ρ τ fF Re : ℝ)
    (hμ : μ ≠ 0) (hL : L ≠ 0) (hR : 0 < R) (hρ : ρ ≠ 0) (hv : v ≠ 0)
    (hmean : v = ΔP * R ^ 2 / (8 * μ * L))
    (hτ : τ = ΔP * R / (2 * L))
    (hfF : fF = τ / (ρ * v ^ 2 / 2))
    (hRe : Re = ρ * v * (2 * R) / μ) :
    fF * Re = 16 ∧ fF * Re ≠ 64 := by
  have hgrad : ΔP / L = 8 * μ * v / R ^ 2 := by
    rw [hmean]
    field_simp [hμ, hL, hR.ne']
  have h16 : fF * Re = 16 := by
    rw [hfF, hRe, hτ]
    have hsplit : ΔP * R / (2 * L) = (ΔP / L) * R / 2 := by ring
    rw [hsplit, hgrad]
    field_simp [hμ, hρ, hv, hR.ne', hL]
    norm_num
  exact ⟨h16, by simp [h16]⟩

/-- Replacing `8` by any other factor misses the flux, once the rest is nonzero. -/
theorem coefficient_not_fixed (R ΔP μ L C : ℝ) (hR : R ≠ 0) (hΔ : ΔP ≠ 0) (hμ : μ ≠ 0)
    (hL : L ≠ 0) (hC : C ≠ 8) :
    Real.pi * R ^ 4 * ΔP / (C * μ * L) ≠ Real.pi * R ^ 4 * ΔP / (8 * μ * L) := by
  intro hEq
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hnum : Real.pi * R ^ 4 * ΔP ≠ 0 :=
    mul_ne_zero (mul_ne_zero hπ (pow_ne_zero 4 hR)) hΔ
  have hden : (8 : ℝ) * μ * L ≠ 0 := mul_ne_zero (mul_ne_zero (by norm_num) hμ) hL
  by_cases hC0 : C = 0
  · have hzero : C * μ * L = 0 := by simp [hC0]
    rw [hzero, div_zero] at hEq
    exact hnum ((div_eq_zero_iff.mp hEq.symm).resolve_right hden)
  have hdenC : C * μ * L ≠ 0 := mul_ne_zero (mul_ne_zero hC0 hμ) hL
  rw [div_eq_div_iff hdenC hden] at hEq
  have hscaled : C * μ * L = (8 : ℝ) * μ * L := by
    apply mul_left_cancel₀ hnum
    linarith
  apply hC
  apply mul_right_cancel₀ (mul_ne_zero hμ hL)
  linarith

end PhysJS.HagenPoiseuille

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.Order.Ring.Abs
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.Order.Filter.AtTopBot.Field
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.GCongr
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import Mathlib.Topology.Order.Basic

/-!
`be-143`. Bridge. AC Drude conductivity, the real Lorentzian.

The catalog equation is

```
Re σ(ω) = σ₀ / (1 + ω² τ²),    σ₀ = n e² τ / m
```

`ac_drude` derives the Lorentzian as the in-phase Fourier component of the
causal relaxation `(σ₀ / τ) exp(−t / τ)`. The antiderivative of
`exp(−a s) cos(b s)` is proved, and the improper integral from `0` to `∞`
is the limit of the compact integrals. Its value at `a = 1/τ` and `b = ω`,
multiplied by `σ₀ / τ`, is `σ₀ / (1 + ω² τ²)`. The DC monomial
`σ₀ = n e² τ / m` stays an input. The `1` in the denominator is the DC
piece: dropping it is a different conductivity. `τ > 0`. This is not the
cross-field ratio of `be-123`.
-/

namespace PhysJS.AcDrude

open Real intervalIntegral MeasureTheory Filter Topology

/-- Antiderivative of `exp(−a s) cos(b s)`. -/
noncomputable def fourierAntideriv (a b s : ℝ) : ℝ :=
  Real.exp (-a * s) * (b * Real.sin (b * s) - a * Real.cos (b * s)) / (a ^ 2 + b ^ 2)

theorem hasDerivAt_fourierAntideriv (a b s : ℝ) (hD : a ^ 2 + b ^ 2 ≠ 0) :
    HasDerivAt (fun t => fourierAntideriv a b t) (Real.exp (-a * s) * Real.cos (b * s)) s := by
  have hexp : HasDerivAt (fun t => Real.exp (-a * t)) (Real.exp (-a * s) * -a) s := by
    have hlin : HasDerivAt (fun t => -a * t) (-a) s := by
      simpa using (hasDerivAt_id s).const_mul (-a)
    exact hlin.exp
  have hsin : HasDerivAt (fun t => Real.sin (b * t)) (Real.cos (b * s) * b) s := by
    have hlin : HasDerivAt (fun t => b * t) b s := by
      simpa using (hasDerivAt_id s).const_mul b
    exact hlin.sin
  have hcos : HasDerivAt (fun t => Real.cos (b * t)) (-Real.sin (b * s) * b) s := by
    have hlin : HasDerivAt (fun t => b * t) b s := by
      simpa using (hasDerivAt_id s).const_mul b
    exact hlin.cos
  have hv : HasDerivAt (fun t => b * Real.sin (b * t) - a * Real.cos (b * t))
      (b * (Real.cos (b * s) * b) - a * (-Real.sin (b * s) * b)) s :=
    (hsin.const_mul b).sub (hcos.const_mul a)
  have hdiv := (hexp.mul hv).div_const (a ^ 2 + b ^ 2)
  have hfun : (fun t => fourierAntideriv a b t) =
      fun t => Real.exp (-a * t) * (b * Real.sin (b * t) - a * Real.cos (b * t)) /
        (a ^ 2 + b ^ 2) := by
    ext t
    rfl
  rw [hfun]
  exact hdiv.congr_deriv (by field_simp [hD]; ring)

theorem abs_fourierAntideriv_le (a b R : ℝ) (ha : 0 < a) :
    |fourierAntideriv a b R| ≤
      Real.exp (-a * R) * (|a| + |b|) / (a ^ 2 + b ^ 2) := by
  have hD : 0 < a ^ 2 + b ^ 2 := by
    have ha2 : 0 < a ^ 2 := sq_pos_of_pos ha
    linarith [sq_nonneg b]
  have hv : |b * Real.sin (b * R) - a * Real.cos (b * R)| ≤ |a| + |b| := by
    calc
      |b * Real.sin (b * R) - a * Real.cos (b * R)|
          = |b * Real.sin (b * R) + -(a * Real.cos (b * R))| := by rw [sub_eq_add_neg]
      _ ≤ |b * Real.sin (b * R)| + |-(a * Real.cos (b * R))| := abs_add_le _ _
      _ = |b| * |Real.sin (b * R)| + |a| * |Real.cos (b * R)| := by
        rw [abs_neg, abs_mul, abs_mul]
      _ ≤ |b| * 1 + |a| * 1 := by
        gcongr
        · exact abs_le.mpr ⟨neg_one_le_sin (b * R), sin_le_one (b * R)⟩
        · exact abs_le.mpr ⟨neg_one_le_cos (b * R), cos_le_one (b * R)⟩
      _ = |a| + |b| := by ring
  unfold fourierAntideriv
  rw [abs_div, abs_of_pos hD, abs_mul, abs_of_pos (Real.exp_pos _)]
  exact div_le_div_of_nonneg_right (mul_le_mul_of_nonneg_left hv (Real.exp_pos _).le) hD.le

theorem tendsto_fourierAntideriv (a b : ℝ) (ha : 0 < a) :
    Tendsto (fun R => fourierAntideriv a b R) atTop (nhds 0) := by
  have hD : 0 < a ^ 2 + b ^ 2 := by
    have ha2 : 0 < a ^ 2 := sq_pos_of_pos ha
    linarith [sq_nonneg b]
  have hexp : Tendsto (fun R : ℝ => Real.exp (-a * R)) atTop (nhds 0) :=
    Real.tendsto_exp_atBot.comp ((tendsto_const_mul_atBot_of_neg (neg_lt_zero.mpr ha)).mpr tendsto_id)
  have hupper : Tendsto (fun R : ℝ =>
      Real.exp (-a * R) * (|a| + |b|) / (a ^ 2 + b ^ 2)) atTop (nhds 0) := by
    have hmul := hexp.mul (tendsto_const_nhds (x := |a| + |b|))
    have hdiv := hmul.div_const (a ^ 2 + b ^ 2)
    simpa [div_eq_mul_inv, mul_assoc] using hdiv
  have hlower : Tendsto (fun R : ℝ =>
      -(Real.exp (-a * R) * (|a| + |b|) / (a ^ 2 + b ^ 2))) atTop (nhds 0) := by
    simpa using hupper.neg
  refine tendsto_of_tendsto_of_tendsto_of_le_of_le hlower hupper ?_ ?_
  · intro R
    have hbound := abs_fourierAntideriv_le a b R ha
    exact (abs_le.mp hbound).1
  · intro R
    have hbound := abs_fourierAntideriv_le a b R ha
    exact (abs_le.mp hbound).2

/-- The cosine transform of `exp(−a s)` is `a / (a² + b²)`. -/
theorem cosine_transform (a b : ℝ) (ha : 0 < a) :
    Tendsto (fun R => ∫ s in (0 : ℝ)..R, Real.exp (-a * s) * Real.cos (b * s))
      atTop (nhds (a / (a ^ 2 + b ^ 2))) := by
  have hD : a ^ 2 + b ^ 2 ≠ 0 := by
    have ha2 : 0 < a ^ 2 := sq_pos_of_pos ha
    exact (ne_of_gt (by linarith [sq_nonneg b] : 0 < a ^ 2 + b ^ 2))
  have hcont : Continuous (fun s : ℝ => Real.exp (-a * s) * Real.cos (b * s)) :=
    (Real.continuous_exp.comp (continuous_const.mul continuous_id)).mul
      (Real.continuous_cos.comp (continuous_const.mul continuous_id))
  have hFTC : ∀ R, 0 ≤ R →
      (∫ s in (0 : ℝ)..R, Real.exp (-a * s) * Real.cos (b * s)) =
        fourierAntideriv a b R - fourierAntideriv a b 0 := by
    intro R hR
    have hderiv : ∀ s ∈ Set.uIcc (0 : ℝ) R,
        HasDerivAt (fun t => fourierAntideriv a b t)
          (Real.exp (-a * s) * Real.cos (b * s)) s :=
      fun s _ => hasDerivAt_fourierAntideriv a b s hD
    exact intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv (hcont.intervalIntegrable 0 R)
  have hF0 : fourierAntideriv a b 0 = -a / (a ^ 2 + b ^ 2) := by
    simp [fourierAntideriv, Real.exp_zero, Real.sin_zero, Real.cos_zero]
  have hlim := tendsto_fourierAntideriv a b ha
  have hshift : Tendsto (fun R => fourierAntideriv a b R - fourierAntideriv a b 0) atTop
      (nhds (0 - fourierAntideriv a b 0)) := hlim.sub tendsto_const_nhds
  have hlimval : 0 - fourierAntideriv a b 0 = a / (a ^ 2 + b ^ 2) := by
    rw [hF0]
    field_simp [hD]
    ring
  rw [hlimval] at hshift
  refine hshift.congr' ?_
  filter_upwards [eventually_ge_atTop (0 : ℝ)] with R hR
  exact (hFTC R hR).symm

theorem lorentz_scale (τ ω : ℝ) (hτ : τ ≠ 0) :
    ((1 / τ) / ((1 / τ) ^ 2 + ω ^ 2)) = τ / (1 + ω ^ 2 * τ ^ 2) := by
  field_simp [hτ]

/-- AC Drude conductivity.

`hσ0` is the DC monomial `n e² τ / m`. The limit is the in-phase part of
`(σ₀ / τ) exp(−s / τ)`.

Kind `bridge` on `PhysJS.AcDrude.ac_drude`, once the catalog entry exists.
The covers line still begins with `derivation-step`. Not `be-123`. -/
theorem ac_drude (σ0 n e m τ ω : ℝ) (hτ : 0 < τ) (hm : m ≠ 0)
    (hσ0 : σ0 = n * e ^ 2 * τ / m) :
    Tendsto (fun R => ∫ s in (0 : ℝ)..R,
        (σ0 / τ) * Real.exp (-s / τ) * Real.cos (ω * s))
      atTop (nhds (σ0 / (1 + ω ^ 2 * τ ^ 2))) ∧
      σ0 / (1 + ω ^ 2 * τ ^ 2) = (n * e ^ 2 * τ / m) / (1 + ω ^ 2 * τ ^ 2) := by
  have _ := hm
  have hτ0 : τ ≠ 0 := hτ.ne'
  have hcos := cosine_transform (1 / τ) ω (by positivity)
  have hscaled : Tendsto (fun R => ∫ s in (0 : ℝ)..R,
      (σ0 / τ) * (Real.exp (-(1 / τ) * s) * Real.cos (ω * s))) atTop
      (nhds ((σ0 / τ) * ((1 / τ) / ((1 / τ) ^ 2 + ω ^ 2)))) := by
    have hmul := hcos.const_mul (σ0 / τ)
    refine hmul.congr ?_
    intro R
    rw [intervalIntegral.integral_const_mul]
  have hkernel : (fun R => ∫ s in (0 : ℝ)..R,
      (σ0 / τ) * Real.exp (-s / τ) * Real.cos (ω * s)) =
      fun R => ∫ s in (0 : ℝ)..R,
        (σ0 / τ) * (Real.exp (-(1 / τ) * s) * Real.cos (ω * s)) := by
    funext R
    congr 1
    funext s
    rw [show -s / τ = -(1 / τ) * s by field_simp [hτ0]]
    ring
  have hvalue : (σ0 / τ) * ((1 / τ) / ((1 / τ) ^ 2 + ω ^ 2)) =
      σ0 / (1 + ω ^ 2 * τ ^ 2) := by
    rw [lorentz_scale τ ω hτ0]
    field_simp [hτ0]
  refine ⟨?_, ?_⟩
  · rw [hvalue] at hscaled
    simpa [hkernel] using hscaled
  · rw [hσ0]

/-- Dropping the DC `1` is not the Lorentzian. -/
theorem dc_not_omitted (σ0 ω τ : ℝ) (hσ : σ0 ≠ 0) :
    σ0 / (ω ^ 2 * τ ^ 2) ≠ σ0 / (1 + ω ^ 2 * τ ^ 2) := by
  intro hEq
  by_cases h0 : ω ^ 2 * τ ^ 2 = 0
  · have hleft : σ0 / (ω ^ 2 * τ ^ 2) = 0 := by simp [h0]
    have hright : σ0 / (1 + ω ^ 2 * τ ^ 2) = σ0 := by simp [h0]
    rw [hleft, hright] at hEq
    exact hσ hEq.symm
  · have hden : 1 + ω ^ 2 * τ ^ 2 ≠ 0 := by
      intro h
      have hneg : ω ^ 2 * τ ^ 2 = -1 := by linarith
      have hnn : 0 ≤ ω ^ 2 * τ ^ 2 := mul_nonneg (sq_nonneg ω) (sq_nonneg τ)
      linarith
    rw [div_eq_div_iff h0 hden] at hEq
    have hscale : 1 + ω ^ 2 * τ ^ 2 = ω ^ 2 * τ ^ 2 := mul_left_cancel₀ hσ hEq
    linarith

end PhysJS.AcDrude

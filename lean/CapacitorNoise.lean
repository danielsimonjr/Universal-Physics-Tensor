/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Gaussian.GaussianIntegral
import Mathlib.Probability.Distributions.Gaussian.Real
import Mathlib.Probability.Moments.Variance
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-87`. Bridge. Capacitor equilibrium noise.

The catalog equation is

```
⟨v²⟩ = k_B T / C
```

from one quadratic term of classical equipartition. `noise_eq` derives it.
The capacitor defines `dU/dV = C V` with `U(0) = 0`, so the stored energy
is `U = (C / 2) V²`. The equilibrium measure is the normalized Boltzmann
weight of that energy. Its integral is the Gaussian integral, and the
normalized density is `gaussianPDFReal` of mean `0` and variance `k_B T / C`.
Mathlib's variance of that law is the mean square. The two halves cancel:
`(C / 2) ⟨v²⟩ = (1 / 2) k_B T`. `three_halves_not_quadratic` is the kinetic
`(3/2) k_B T` spread over one capacitor. `half_needed` drops the `1/2` in
the energy and gets a different variance.
-/

namespace PhysJS.CapacitorNoise

open Real MeasureTheory ProbabilityTheory Set

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

/-- `dU/dV = C V` and `U(0) = 0` integrate to `(C / 2) V²`. -/
theorem stored_energy (U : ℝ → ℝ) (C V : ℝ) (hU : ∀ y, HasDerivAt U (C * y) y) (h0 : U 0 = 0) :
    U V = (C / 2) * V ^ 2 := by
  by_cases hV : V = 0
  · simp [hV, h0]
  let g : ℝ → ℝ := fun y => U y - (C / 2) * y ^ 2
  have hg : ∀ y, HasDerivAt g 0 y := by
    intro y
    have hsq : HasDerivAt (fun t => t ^ 2) (2 * y) y := by
      simpa using hasDerivAt_pow 2 y
    have hE : HasDerivAt (fun t => (C / 2) * t ^ 2) (C * y) y := by
      exact (hsq.const_mul (C / 2)).congr_deriv (by ring)
    exact ((hU y).sub hE).congr_deriv (by ring)
  have hconst := eq_of_deriv_zero g hg V 0
  have hg0 : g 0 = 0 := by simp [g, h0]
  have hgx : g V = 0 := hconst.trans hg0
  have hsub : U V - (C / 2) * V ^ 2 = 0 := by simpa [g] using hgx
  linarith

theorem partition_function (C kB T : ℝ) (hC : 0 < C) (hkT : 0 < kB * T) :
    (∫ x : ℝ, Real.exp (-((C / 2) * x ^ 2) / (kB * T))) =
      Real.sqrt (2 * Real.pi * (kB * T / C)) := by
  have _hT : 0 < kB * T := hkT
  have hfun : (fun x : ℝ => Real.exp (-((C / 2) * x ^ 2) / (kB * T))) =
      fun x => Real.exp (-(C / (2 * kB * T)) * x ^ 2) := by
    ext x
    congr 1
    field_simp [hC.ne', hkT.ne']
  rw [hfun, integral_gaussian]
  have : Real.pi / (C / (2 * kB * T)) = 2 * Real.pi * (kB * T / C) := by
    field_simp [hC.ne', hkT.ne']
  rw [this]

theorem boltzmann_is_gaussian (C kB T x : ℝ) (hC : 0 < C) (hkT : 0 < kB * T) :
    Real.exp (-((C / 2) * x ^ 2) / (kB * T)) /
        Real.sqrt (2 * Real.pi * (kB * T / C)) =
      gaussianPDFReal (0 : ℝ) (Real.toNNReal (kB * T / C)) x := by
  let v : ℝ := kB * T / C
  have hv : 0 ≤ v := by
    unfold v
    positivity
  have hcoe : ((Real.toNNReal v) : ℝ) = v := by
    rw [Real.toNNReal_of_nonneg hv]
    rfl
  have harg : -((C / 2) * x ^ 2) / (kB * T) = -x ^ 2 / (2 * v) := by
    unfold v
    field_simp [hC.ne', hkT.ne']
  unfold gaussianPDFReal
  rw [hcoe, sub_zero, harg]
  ring

/-- Equilibrium mean square of one capacitor. The energy derivative and the
Boltzmann weight are the premises; the variance is the Gaussian one.

Kind `bridge` on `PhysJS.CapacitorNoise.noise_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not
`(3/2) k_B T`. -/
theorem noise_eq (U : ℝ → ℝ) (C kB T : ℝ) (hC : 0 < C) (hk : 0 < kB) (hT : 0 < T)
    (hU : ∀ y, HasDerivAt U (C * y) y) (h0 : U 0 = 0) :
    (∀ V, U V = (C / 2) * V ^ 2) ∧
      (∫ x, x ^ 2 ∂gaussianReal (0 : ℝ) (Real.toNNReal (kB * T / C))) = kB * T / C ∧
      (C / 2) * (kB * T / C) = (1 / 2) * kB * T := by
  refine ⟨fun V => stored_energy U C V hU h0, ?_, ?_⟩
  · have hv : 0 ≤ kB * T / C := div_nonneg (mul_nonneg hk.le hT.le) hC.le
    let vnn := Real.toNNReal (kB * T / C)
    have hvnn : (vnn : ℝ) = kB * T / C := by
      unfold vnn
      rw [Real.toNNReal_of_nonneg hv]
      rfl
    have hvar := variance_id_gaussianReal (μ := (0 : ℝ)) (v := vnn)
    have hmean := integral_id_gaussianReal (μ := (0 : ℝ)) (v := vnn)
    have hsq := variance_of_integral_eq_zero (X := id) (μ := gaussianReal (0 : ℝ) vnn)
      measurable_id.aemeasurable (by simp [hmean])
    have : (∫ ω, id ω ^ 2 ∂gaussianReal (0 : ℝ) vnn) = (vnn : ℝ) := by
      rw [← hsq]
      exact hvar
    simp [vnn, hvnn, id_eq] at this
    exact this
  · field_simp [hC.ne']

/-- Three kinetic halves are not one capacitor. -/
theorem three_halves_not_quadratic (C kB T : ℝ) (hC : C ≠ 0) (hkT : kB * T ≠ 0) :
    (3 / 2) * kB * T / C ≠ kB * T / C := by
  intro hEq
  field_simp [hC] at hEq
  apply hkT
  have hzero : (3 : ℝ) * kB * T - 2 * kB * T = 0 := sub_eq_zero.mpr hEq
  have hfac : (3 : ℝ) * kB * T - 2 * kB * T = kB * T := by ring
  rw [hfac] at hzero
  exact hzero

/-- Dropping the energy half replaces `k_B T / C` by `k_B T / (2 C)`. -/
theorem half_needed (C kB T : ℝ) (hC : 0 < C) (hkT : 0 < kB * T) :
    (∫ x : ℝ, Real.exp (-(C * x ^ 2) / (kB * T))) =
        Real.sqrt (Real.pi * (kB * T / C)) ∧
      kB * T / (2 * C) ≠ kB * T / C := by
  refine ⟨?_, ?_⟩
  · have hfun : (fun x : ℝ => Real.exp (-(C * x ^ 2) / (kB * T))) =
        fun x => Real.exp (-(C / (kB * T)) * x ^ 2) := by
      ext x
      congr 1
      field_simp [hC.ne', hkT.ne']
    rw [hfun, integral_gaussian]
    have : Real.pi / (C / (kB * T)) = Real.pi * (kB * T / C) := by
      field_simp [hC.ne', hkT.ne']
    rw [this]
  · intro hEq
    field_simp [hC.ne', hkT.ne'] at hEq
    linarith

end PhysJS.CapacitorNoise

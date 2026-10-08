/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-91`. Bridge. Einstein oscillators, and the Dulong–Petit limit.

The catalog equation is

```
C_V = 3 N k_B (θ_E / T)² exp(θ_E / T) / (exp(θ_E / T) − 1)²
```

and the high-temperature limit is `3 N k_B`. `einstein_heat` differentiates
the Planck oscillator. Three independent oscillators per atom, each of energy
`k_B θ_E / (exp(θ_E / T) − 1)`, are the hypothesis. The zero-point `k_B θ_E / 2`
is constant, so it does not contribute. `dulong_petit` is the limit
`x² e^x / (e^x − 1)² → 1` as `x → 0⁺`, read at `x = θ_E / T`. One oscillator
tends to `N k_B`, not `3 N k_B`.
-/

namespace PhysJS.EinsteinSolid

open Real Filter Topology Set

/-- Derivative of one Planck oscillator, zero-point omitted. -/
theorem hasDerivAt_oscillator (kB θ T : ℝ) (hT : T ≠ 0)
    (hden : Real.exp (θ / T) ≠ 1) :
    HasDerivAt (fun t => kB * θ / (Real.exp (θ / t) - 1))
      (kB * (θ / T) ^ 2 * Real.exp (θ / T) / (Real.exp (θ / T) - 1) ^ 2) T := by
  have hden' : Real.exp (θ / T) - 1 ≠ 0 := sub_ne_zero.mpr hden
  have hinv : HasDerivAt (fun t : ℝ => t⁻¹) (-(T ^ 2)⁻¹) T := hasDerivAt_inv hT
  have hlin : HasDerivAt (fun t => θ / t) (-θ / T ^ 2) T := by
    have hmul := hinv.const_mul θ
    convert hmul using 1
    · funext t
      simp [div_eq_mul_inv]
    · field_simp [hT]
  have hexp : HasDerivAt (fun t => Real.exp (θ / t))
      (Real.exp (θ / T) * (-θ / T ^ 2)) T := hlin.exp
  have hsub : HasDerivAt (fun t => Real.exp (θ / t) - 1)
      (Real.exp (θ / T) * (-θ / T ^ 2)) T := by
    convert hexp.sub (hasDerivAt_const T 1) using 1
    ring
  have hrec : HasDerivAt (fun t => (Real.exp (θ / t) - 1)⁻¹)
      (-(Real.exp (θ / T) * (-θ / T ^ 2)) / (Real.exp (θ / T) - 1) ^ 2) T :=
    hsub.inv hden'
  have hmul := hrec.const_mul (kB * θ)
  convert hmul using 1
  · funext t
    simp [div_eq_mul_inv]
  · field_simp [hden']

/-- Einstein heat capacity. `hC` says `C` is the temperature derivative of
three Planck oscillators per atom.

Not one oscillator. -/
theorem einstein_heat (N kB θ T C : ℝ) (hT : T ≠ 0) (hden : Real.exp (θ / T) ≠ 1)
    (hC : HasDerivAt (fun t => 3 * N * (kB * θ / (Real.exp (θ / t) - 1))) C T) :
    C = 3 * N * kB * (θ / T) ^ 2 * Real.exp (θ / T) /
      (Real.exp (θ / T) - 1) ^ 2 := by
  have hmul := (hasDerivAt_oscillator kB θ T hT hden).const_mul (3 * N)
  have htot : HasDerivAt (fun t => 3 * N * (kB * θ / (Real.exp (θ / t) - 1)))
      (3 * N * kB * (θ / T) ^ 2 * Real.exp (θ / T) / (Real.exp (θ / T) - 1) ^ 2) T := by
    convert hmul using 1
    ring
  exact hC.unique htot

/-- A constant zero-point energy has derivative zero. -/
theorem zero_point_drops (kB θ T : ℝ) :
    HasDerivAt (fun _ : ℝ => kB * θ / 2) 0 T := by
  simpa using hasDerivAt_const T (kB * θ / 2)

lemma tendsto_einstein_kernel :
    Tendsto (fun x : ℝ => x ^ 2 * Real.exp x / (Real.exp x - 1) ^ 2) (𝓝[>] (0 : ℝ)) (𝓝 1) := by
  have hslope : Tendsto (slope Real.exp 0) (𝓝[≠] (0 : ℝ)) (𝓝 1) := by
    simpa [Real.exp_zero] using (Real.hasDerivAt_exp 0).tendsto_slope
  have hsub : 𝓝[>] (0 : ℝ) ≤ 𝓝[≠] (0 : ℝ) :=
    nhdsWithin_mono 0 fun x hx => ne_of_gt hx
  have hquot : Tendsto (fun x : ℝ => (Real.exp x - 1) / x) (𝓝[>] 0) (𝓝 1) := by
    have hrewrite : slope Real.exp 0 = fun x => (x - 0)⁻¹ * (Real.exp x - Real.exp 0) := by
      funext x
      simp [slope, sub_eq_add_neg]
    rw [hrewrite, Real.exp_zero] at hslope
    refine (hslope.mono_left hsub).congr' ?_
    filter_upwards with x
    simp [div_eq_mul_inv, mul_comm, sub_zero]
  have hinv : Tendsto (fun x : ℝ => x / (Real.exp x - 1)) (𝓝[>] 0) (𝓝 1) := by
    have hcont : ContinuousAt (fun y : ℝ => y⁻¹) (1 : ℝ) := continuousAt_inv₀ (by norm_num)
    have hcomp : Tendsto (fun x => ((Real.exp x - 1) / x)⁻¹) (𝓝[>] 0) (𝓝 ((1 : ℝ)⁻¹)) :=
      hcont.tendsto.comp hquot
    rw [inv_one] at hcomp
    refine hcomp.congr' ?_
    filter_upwards [self_mem_nhdsWithin] with x hx
    have hx0 : x ≠ 0 := ne_of_gt hx
    have hexp : Real.exp x - 1 ≠ 0 := by
      intro h
      have : Real.exp x = 1 := by linarith
      exact hx0 (Real.exp_injective (by simpa [Real.exp_zero] using this))
    field_simp [hx0, hexp]
  have hsq : Tendsto (fun x : ℝ => (x / (Real.exp x - 1)) ^ 2) (𝓝[>] 0) (𝓝 1) := by
    have hmul := hinv.mul hinv
    rw [mul_one] at hmul
    simpa [pow_two] using hmul
  have hexp : Tendsto Real.exp (𝓝[>] (0 : ℝ)) (𝓝 1) := by
    simpa [Real.exp_zero] using (continuous_exp.tendsto 0).mono_left (nhdsWithin_le_nhds)
  have hmul := hexp.mul hsq
  rw [mul_one] at hmul
  refine hmul.congr' ?_
  filter_upwards [self_mem_nhdsWithin] with x hx
  have hx0 : x ≠ 0 := ne_of_gt hx
  have hexp0 : Real.exp x - 1 ≠ 0 := by
    intro h
    have : Real.exp x = 1 := by linarith
    exact hx0 (Real.exp_injective (by simpa [Real.exp_zero] using this))
  field_simp [hexp0]

/-- High-temperature limit `3 N k_B`. The kernel tends to `1` as `θ/T → 0⁺`. -/
theorem dulong_petit (N kB θ : ℝ) (hθ : 0 < θ) :
    Tendsto (fun T : ℝ => 3 * N * kB *
        ((θ / T) ^ 2 * Real.exp (θ / T) / (Real.exp (θ / T) - 1) ^ 2))
      atTop (𝓝 (3 * N * kB)) := by
  have hdiv : Tendsto (fun T : ℝ => θ / T) atTop (𝓝 0) := by
    simpa [div_eq_mul_inv] using tendsto_inv_atTop_zero.const_mul θ
  have hpos : ∀ᶠ T in atTop, 0 < θ / T := by
    filter_upwards [eventually_gt_atTop (0 : ℝ)] with T hT
    exact div_pos hθ hT
  have hwithin : Tendsto (fun T : ℝ => θ / T) atTop (𝓝[>] 0) :=
    tendsto_nhdsWithin_iff.mpr ⟨hdiv, hpos⟩
  have hker := tendsto_einstein_kernel.comp hwithin
  have hmul := hker.const_mul (3 * N * kB)
  simpa using hmul

/-- One oscillator tends to `N k_B`, not `3 N k_B`, when `N k_B ≠ 0`. -/
theorem one_oscillator_not_three (N kB : ℝ) (hN : N ≠ 0) (hk : kB ≠ 0) :
    N * kB ≠ 3 * N * kB := by
  intro h
  apply hN
  have : N * kB * 1 = N * kB * 3 := by
    calc
      N * kB * 1 = N * kB := by ring
      _ = 3 * N * kB := h
      _ = N * kB * 3 := by ring
  exact mul_right_cancel₀ hk (by linarith)

end PhysJS.EinsteinSolid

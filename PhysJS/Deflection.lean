/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.JapaneseBracket
import Mathlib.Analysis.SpecialFunctions.Pow.Deriv
import Mathlib.LinearAlgebra.Dimension.StrongRankCondition
import Mathlib.MeasureTheory.Integral.IntegralEqImproper
import Mathlib.MeasureTheory.Measure.Haar.NormedSpace

/-!
`be-51`. Derivation step. The weak-field line integral, not a geodesic.

The catalog encodes `α = 4 G M / (b c²)`, which is the case `γ = 1`.
Physlib does not supply the orbit. The premise is

```
(1 + γ) / c² · ∫_ℝ G M b / (b² + z²)^{3/2} dz = 2 (1 + γ) G M / (b c²)
```

The antiderivative is `z / (b² √(b² + z²))`. At `γ = 1` the right-hand
side is the encoded angle. `γ = 0` is half of that angle.
-/

namespace PhysJS.Deflection

open Real MeasureTheory Filter Module
open scoped Topology

/-- Antiderivative `z / (b² √(b² + z²))` of `(b² + z²)^{−3/2}`. -/
noncomputable def antideriv (b z : ℝ) : ℝ :=
  z / (b ^ 2 * √(b ^ 2 + z ^ 2))

lemma antideriv_neg (b z : ℝ) : antideriv b (-z) = -antideriv b z := by
  unfold antideriv
  rw [neg_sq]
  exact neg_div (b ^ 2 * √(b ^ 2 + z ^ 2)) z

lemma antideriv_of_pos {b z : ℝ} (hb : 0 < b) (hz : 0 < z) :
    antideriv b z = 1 / (b ^ 2 * √(b ^ 2 / z ^ 2 + 1)) := by
  have hL : b ^ 2 * √(b ^ 2 + z ^ 2) ≠ 0 := by positivity
  have hR : b ^ 2 * √(b ^ 2 / z ^ 2 + 1) ≠ 0 := by positivity
  unfold antideriv
  rw [div_eq_div_iff hL hR, one_mul]
  calc
    z * (b ^ 2 * √(b ^ 2 / z ^ 2 + 1)) = b ^ 2 * (z * √(b ^ 2 / z ^ 2 + 1)) := by ring
    _ = b ^ 2 * √(b ^ 2 + z ^ 2) := by
      congr 1
      apply (sq_eq_sq₀ (by positivity) (sqrt_nonneg _)).mp
      rw [mul_pow, sq_sqrt (by positivity), sq_sqrt (by positivity)]
      field_simp

lemma tendsto_antideriv_atTop {b : ℝ} (hb : 0 < b) :
    Tendsto (antideriv b) atTop (𝓝 (1 / b ^ 2)) := by
  apply Tendsto.congr' (f₁ := fun z => 1 / (b ^ 2 * √(b ^ 2 / z ^ 2 + 1)))
  · filter_upwards [eventually_gt_atTop (0 : ℝ)] with z hz
    exact (antideriv_of_pos hb hz).symm
  · have hinv : Tendsto (fun z : ℝ => b ^ 2 / z ^ 2) atTop (𝓝 0) := by
      simpa [div_eq_mul_inv] using
        ((tendsto_pow_atTop (by decide : (2 : ℕ) ≠ 0)).inv_tendsto_atTop).const_mul (b ^ 2)
    have hsum : Tendsto (fun z : ℝ => b ^ 2 / z ^ 2 + 1) atTop (𝓝 (0 + 1)) :=
      hinv.add tendsto_const_nhds
    have hsqrt : Tendsto (fun z : ℝ => √(b ^ 2 / z ^ 2 + 1)) atTop (𝓝 (√(1 : ℝ))) :=
      (continuous_sqrt.tendsto (1 : ℝ)).comp (by simpa using hsum)
    have hden : Tendsto (fun z : ℝ => b ^ 2 * √(b ^ 2 / z ^ 2 + 1)) atTop
        (𝓝 (b ^ 2 * √(1 : ℝ))) := hsqrt.const_mul (b ^ 2)
    simpa [div_eq_mul_inv, sqrt_one, mul_one] using
      hden.inv₀ (by positivity : b ^ 2 * √(1 : ℝ) ≠ 0)

lemma tendsto_antideriv_atBot {b : ℝ} (hb : 0 < b) :
    Tendsto (antideriv b) atBot (𝓝 (-(1 / b ^ 2))) := by
  have h : Tendsto (fun z => antideriv b (-z)) atTop (𝓝 (-(1 / b ^ 2))) := by
    simpa [antideriv_neg] using (tendsto_antideriv_atTop hb).neg
  simpa [Function.comp_def, neg_neg] using h.comp tendsto_neg_atBot_atTop

lemma hasDerivAt_antideriv {b z : ℝ} (hb : b ≠ 0) :
    HasDerivAt (antideriv b) ((b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ))) z := by
  have hu : 0 < b ^ 2 + z ^ 2 := by
    have : 0 < b ^ 2 := sq_pos_of_ne_zero hb
    positivity
  have hfun : antideriv b =
      fun y => (b ^ 2)⁻¹ * (y * (b ^ 2 + y ^ 2) ^ (-(1 / 2 : ℝ))) := by
    funext y
    have hy : 0 ≤ b ^ 2 + y ^ 2 := by positivity
    unfold antideriv
    rw [sqrt_eq_rpow, div_eq_mul_inv, mul_inv, ← rpow_neg hy]
    ring
  rw [hfun]
  have hcoef : ((2 : ℕ) : ℝ) * z ^ (2 - 1) = 2 * z := by
    rw [show (2 : ℕ) - 1 = 1 by decide, pow_one]
    norm_num
  have hbase : HasDerivAt (fun y : ℝ => y ^ 2 + b ^ 2) (2 * z) z := by
    have h := (hasDerivAt_pow 2 z).add_const (b ^ 2)
    rw [hcoef] at h
    exact h
  have hv := hbase.rpow_const (p := -(1 / 2 : ℝ)) (Or.inl (by simpa [add_comm] using hu.ne'))
  have hall := ((hasDerivAt_id z).mul hv).const_mul (b ^ 2)⁻¹
  have hcomm : ∀ y : ℝ, y ^ 2 + b ^ 2 = b ^ 2 + y ^ 2 := fun y => by ring
  simp_rw [hcomm] at hall
  convert hall using 1
  · funext y
    simp [id]
  set u := b ^ 2 + z ^ 2
  have hu0 : 0 < u := by simpa [u] using hu
  have hexp : -(1 / 2 : ℝ) - 1 = -(3 / 2 : ℝ) := by ring
  have hcoeff : (2 * z) * -(1 / 2 : ℝ) = -z := by ring
  have hsplit : u ^ (-(1 / 2 : ℝ)) = u ^ (-(3 / 2 : ℝ)) * u := by
    have : -(1 / 2 : ℝ) = -(3 / 2 : ℝ) + 1 := by ring
    rw [this, rpow_add hu0, rpow_one]
  simp only [id_eq]
  rw [hexp, hcoeff]
  calc
    u ^ (-(3 / 2 : ℝ))
        = (b ^ 2)⁻¹ * (b ^ 2 * u ^ (-(3 / 2 : ℝ))) := by field_simp
    _ = (b ^ 2)⁻¹ * ((u - z ^ 2) * u ^ (-(3 / 2 : ℝ))) := by
        congr 1
        have : u - z ^ 2 = b ^ 2 := by simp [u]
        rw [← this]
    _ = (b ^ 2)⁻¹ * (u ^ (-(3 / 2 : ℝ)) * u + -(z ^ 2) * u ^ (-(3 / 2 : ℝ))) := by
        congr 1
        ring
    _ = (b ^ 2)⁻¹ * (1 * u ^ (-(1 / 2 : ℝ)) + z * (-z * u ^ (-(3 / 2 : ℝ)))) := by
        congr 1
        rw [one_mul, ← hsplit]
        have : z * (-z * u ^ (-(3 / 2 : ℝ))) = -(z ^ 2) * u ^ (-(3 / 2 : ℝ)) := by ring
        rw [this]

lemma rayleigh_scale {b z : ℝ} (hb : 0 < b) :
    (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ)) =
      b ^ (-3 : ℝ) * ((1 : ℝ) + ‖z / b‖ ^ 2) ^ (-(3 : ℝ) / 2) := by
  have hb2 : 0 < b ^ 2 := by positivity
  have hw : 0 ≤ (1 : ℝ) + (z / b) ^ 2 := by positivity
  calc
    (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ))
        = (b ^ 2 * (1 + (z / b) ^ 2)) ^ (-(3 / 2 : ℝ)) := by
          congr 1
          field_simp
    _ = (b ^ 2) ^ (-(3 / 2 : ℝ)) * (1 + (z / b) ^ 2) ^ (-(3 / 2 : ℝ)) :=
          mul_rpow hb2.le hw
    _ = b ^ (-3 : ℝ) * (1 + ‖z / b‖ ^ 2) ^ (-(3 : ℝ) / 2) := by
          have hpow : (b ^ 2) ^ (-(3 / 2 : ℝ)) = b ^ (-3 : ℝ) := by
            rw [← rpow_natCast b 2, ← rpow_mul hb.le]
            norm_num
          rw [hpow, Real.norm_eq_abs, sq_abs]
          have : -(3 / 2 : ℝ) = (-3 : ℝ) / 2 := by ring
          rw [this]

lemma integrable_rayleigh {b : ℝ} (hb : 0 < b) :
    Integrable fun z : ℝ => (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ)) := by
  have hbase : Integrable fun x : ℝ => ((1 : ℝ) + ‖x‖ ^ 2) ^ (-(3 : ℝ) / 2) :=
    integrable_rpow_neg_one_add_norm_sq (μ := volume) (by simp [finrank_self])
  have hscale : Integrable fun z : ℝ => ((1 : ℝ) + ‖b⁻¹ * z‖ ^ 2) ^ (-(3 : ℝ) / 2) :=
    hbase.comp_mul_left' (inv_ne_zero hb.ne')
  refine (hscale.const_mul (b ^ (-3 : ℝ))).congr (Eventually.of_forall fun z => ?_)
  change b ^ (-3 : ℝ) * ((1 : ℝ) + ‖b⁻¹ * z‖ ^ 2) ^ ((-3 : ℝ) / 2) =
    (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ))
  rw [inv_mul_eq_div]
  exact (rayleigh_scale hb).symm

lemma integral_kernel {b : ℝ} (hb : 0 < b) :
    ∫ z : ℝ, (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ)) = 2 / b ^ 2 := by
  rw [integral_of_hasDerivAt_of_tendsto (fun z => hasDerivAt_antideriv hb.ne')
      (integrable_rayleigh hb) (tendsto_antideriv_atBot hb) (tendsto_antideriv_atTop hb)]
  ring

lemma integrand_eq (G M b z : ℝ) (hb : 0 < b) :
    G * M * b / (b ^ 2 + z ^ 2) ^ (3 / 2 : ℝ) =
      (G * M * b) * (b ^ 2 + z ^ 2) ^ (-(3 / 2 : ℝ)) := by
  have hu : 0 ≤ b ^ 2 + z ^ 2 := by positivity
  rw [div_eq_mul_inv, ← rpow_neg hu]

lemma integral_mass (G M b : ℝ) (hb : 0 < b) :
    ∫ z : ℝ, G * M * b / (b ^ 2 + z ^ 2) ^ (3 / 2 : ℝ) = 2 * G * M / b := by
  simp_rw [integrand_eq G M b _ hb, integral_const_mul, integral_kernel hb]
  field_simp

/-- The weak-field line integral. At `γ = 1` the value is the encoded angle
`4 G M / (b c²)`.

Covers the derivation step of `be-51`. Not a geodesic. -/
theorem line_integral (γ G M b c : ℝ) (hb : 0 < b) (hc : c ≠ 0) :
    (1 + γ) / c ^ 2 * ∫ z : ℝ, G * M * b / (b ^ 2 + z ^ 2) ^ (3 / 2 : ℝ) =
      2 * (1 + γ) * G * M / (b * c ^ 2) ∧
      (1 + (1 : ℝ)) / c ^ 2 * ∫ z : ℝ, G * M * b / (b ^ 2 + z ^ 2) ^ (3 / 2 : ℝ) =
        4 * G * M / (b * c ^ 2) := by
  constructor
  · rw [integral_mass G M b hb]
    field_simp
  · rw [integral_mass G M b hb]
    field_simp
    ring

/-- `γ = 0` is half the encoded angle, so it is not that angle. -/
theorem wrong_dictionary_gamma_zero (G M b c : ℝ) (hb : 0 < b) (hc : c ≠ 0)
    (hGM : G * M ≠ 0) :
    (1 + (0 : ℝ)) / c ^ 2 * ∫ z : ℝ, G * M * b / (b ^ 2 + z ^ 2) ^ (3 / 2 : ℝ) ≠
      4 * G * M / (b * c ^ 2) := by
  rw [(line_integral 0 G M b c hb hc).1]
  intro h
  rw [div_left_inj' (mul_ne_zero hb.ne' (pow_ne_zero 2 hc))] at h
  have : G * M = 0 := by nlinarith
  exact hGM this

end PhysJS.Deflection

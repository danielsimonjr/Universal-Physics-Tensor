/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.MeanValue
import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Log.Basic
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring
import Mathlib.Topology.Order.IntermediateValue

/-!
`be-166`. Bridge. Wien's displacement law.

The wavelength density is proportional to `spectral(h c / (λ k_B T))`, where

```
spectral(x) = x⁵ / (e^x − 1)
```

`hasDerivAt_spectral` is the quotient rule: the derivative vanishes for
`x > 0` exactly when `5 − x = 5 exp(−x)`. `root_unique` proves that
equation has a unique positive root and that the root lies in `(4, 5)`.
The decimal `x ≈ 4.9651` is not evaluated. `wienAux 0 = 0` as well; that
root is extraneous because the spectrum derivative is stated for `x > 0`.
`wien_eq` is the displacement constant `b k_B x = h c` built from the
positive root, and `wavelength_critical` is the chain rule back to `λ`.
-/

namespace PhysJS.WienDisplacement

open Real Set

/-- Dimensionless spectrum `x⁵ / (e^x − 1)`, up to a factor independent of `x`. -/
noncomputable def spectral (x : ℝ) : ℝ :=
  x ^ 5 / (exp x - 1)

/-- `5 − x − 5 e^{−x}`. -/
noncomputable def wienAux (x : ℝ) : ℝ :=
  5 - x - 5 * exp (-x)

lemma continuous_wienAux : Continuous wienAux := by
  unfold wienAux
  exact (continuous_const.sub continuous_id).sub
    (continuous_const.mul (continuous_exp.comp continuous_neg))

lemma hasDerivAt_wienAux (x : ℝ) : HasDerivAt wienAux (-1 + 5 * exp (-x)) x := by
  unfold wienAux
  have hsub0 := (hasDerivAt_const x (5 : ℝ)).sub (hasDerivAt_id x)
  have hsub1 : HasDerivAt (fun t : ℝ => (5 : ℝ) - t) (0 - 1) x := by
    refine hsub0.congr_of_eventuallyEq ?_
    filter_upwards with t
    simp
  have hsub := hsub1.congr_deriv (by ring : (0 : ℝ) - 1 = -1)
  have hinner : HasDerivAt (fun t : ℝ => -t) (-1) x := (hasDerivAt_id x).neg
  have hexp : HasDerivAt (fun t : ℝ => exp (-t)) (exp (-x) * -1) x := hinner.exp
  have hmul : HasDerivAt (fun t : ℝ => (5 : ℝ) * exp (-t)) (5 * (exp (-x) * -1)) x :=
    hexp.const_mul 5
  refine (hsub.sub hmul).congr_deriv ?_
  ring

lemma wienAux_zero : wienAux 0 = 0 := by
  simp [wienAux, exp_zero]

lemma exp_four_gt_sixteen : (16 : ℝ) < exp 4 := by
  have h2 : (2 : ℝ) < exp 1 := exp_one_gt_two
  have hpow : (2 : ℝ) ^ 4 < exp 1 ^ 4 :=
    pow_lt_pow_left₀ h2 (by norm_num) (by decide : (4 : ℕ) ≠ 0)
  have hexp : exp 1 ^ 4 = exp 4 := by
    rw [← exp_nat_mul]
    ring_nf
  have h16 : (16 : ℝ) = 2 ^ 4 := by norm_num
  linarith

lemma wienAux_four_pos : 0 < wienAux 4 := by
  have hden : 0 < exp 4 := exp_pos _
  have hlt : 5 / exp 4 < 1 := by
    rw [div_lt_one hden]
    linarith [exp_four_gt_sixteen]
  have hform : wienAux 4 = 1 - 5 / exp 4 := by
    unfold wienAux
    rw [exp_neg, div_eq_mul_inv]
    ring
  linarith

lemma wienAux_five_neg : wienAux 5 < 0 := by
  unfold wienAux
  have : 0 < 5 * exp (-(5 : ℝ)) := mul_pos (by norm_num) (exp_pos _)
  linarith

lemma log_five_pos : 0 < log 5 := by
  have h5 : (1 : ℝ) < 5 := by norm_num
  exact (log_pos_iff (by norm_num)).2 h5

lemma log_five_lt_four : log 5 < 4 := by
  have h5 : (0 : ℝ) < 5 := by norm_num
  have hlt : exp (log 5) < exp 4 := by
    rw [exp_log h5]
    linarith [exp_four_gt_sixteen]
  exact (exp_lt_exp).mp hlt

lemma deriv_neg_iff (x : ℝ) : -1 + 5 * exp (-x) < 0 ↔ log 5 < x := by
  have h5 : (0 : ℝ) < 5 := by norm_num
  constructor
  · intro hlt
    have hexp : exp (-x) < 1 / 5 := by
      have h5ne : (5 : ℝ) ≠ 0 := by norm_num
      have h := hlt
      field_simp [h5ne] at h
      linarith
    have hlog : -x < log (1 / 5) := (lt_log_iff_exp_lt (by positivity)).2 hexp
    rw [log_div (by norm_num) h5.ne', log_one, zero_sub] at hlog
    linarith
  · intro hx
    have hexp : exp (-x) < exp (-log 5) := (exp_lt_exp).2 (by linarith : -x < -log 5)
    have hexp' : (exp x)⁻¹ < (exp (log 5))⁻¹ := by
      simpa [exp_neg] using hexp
    rw [exp_log h5] at hexp'
    have hmul : (5 : ℝ) * (exp x)⁻¹ < 1 := by
      have h := mul_lt_mul_of_pos_left hexp' h5
      simpa using h
    rw [exp_neg]
    linarith

lemma aux_pos_on_low (x : ℝ) (hx : 0 < x) (hxle : x ≤ 4) : 0 < wienAux x := by
  have hlog4 : log 5 < 4 := log_five_lt_four
  by_cases hcase : x ≤ log 5
  · have hmono : StrictMonoOn wienAux (Icc 0 (log 5)) := by
      refine strictMonoOn_of_deriv_pos (convex_Icc _ _) continuous_wienAux.continuousOn ?_
      intro z hz
      rw [interior_Icc] at hz
      rw [(hasDerivAt_wienAux z).deriv]
      have hlt : z < log 5 := hz.2
      have hnot : ¬ (-1 + 5 * exp (-z) < 0) := (deriv_neg_iff z).not.mpr (not_lt.mpr hlt.le)
      have hne : -1 + 5 * exp (-z) ≠ 0 := by
        intro hzero
        have h5 : (0 : ℝ) < 5 := by norm_num
        have hinv : exp (-z) = 1 / 5 := by
          have h5ne : (5 : ℝ) ≠ 0 := by norm_num
          field_simp [h5ne] at hzero
          linarith
        have hlogz : -z = log (1 / 5) := by
          apply exp_injective
          rw [exp_log (by positivity), hinv]
        rw [log_div (by norm_num) h5.ne', log_one, zero_sub] at hlogz
        linarith
      exact lt_of_le_of_ne (not_lt.mp hnot) hne.symm
    have hgt := hmono ⟨le_rfl, log_five_pos.le⟩ ⟨hx.le, hcase⟩ hx
    rw [wienAux_zero] at hgt
    exact hgt
  · have hge : log 5 ≤ x := le_of_not_ge hcase
    have hanti : StrictAntiOn wienAux (Icc (log 5) 4) := by
      refine strictAntiOn_of_deriv_neg (convex_Icc _ _) continuous_wienAux.continuousOn ?_
      intro z hz
      rw [interior_Icc] at hz
      rw [(hasDerivAt_wienAux z).deriv]
      exact (deriv_neg_iff z).2 hz.1
    have hxmem : x ∈ Icc (log 5) 4 := ⟨hge, hxle⟩
    have h4mem : (4 : ℝ) ∈ Icc (log 5) 4 := ⟨hlog4.le, le_refl _⟩
    by_cases hx4 : x = 4
    · simpa [hx4] using wienAux_four_pos
    · have hlt : x < 4 := lt_of_le_of_ne hxle hx4
      have hdrop := hanti hxmem h4mem hlt
      linarith [wienAux_four_pos, hdrop]

lemma strictAnti_past_four : StrictAntiOn wienAux (Ici 4) := by
  refine strictAntiOn_of_deriv_neg (convex_Ici (4 : ℝ)) continuous_wienAux.continuousOn ?_
  intro x hx
  rw [interior_Ici] at hx
  rw [(hasDerivAt_wienAux x).deriv]
  exact (deriv_neg_iff x).2 (lt_trans log_five_lt_four hx)

lemma hasDerivAt_spectral (x : ℝ) (hx : 0 < x) :
    HasDerivAt spectral (x ^ 4 * exp x * wienAux x / (exp x - 1) ^ 2) x := by
  have hden : exp x - 1 ≠ 0 := by
    have hgt : 1 < exp x := (one_lt_exp_iff).2 hx
    linarith
  have hexp : exp x ≠ 0 := (exp_pos _).ne'
  have hnum : HasDerivAt (fun t : ℝ => t ^ 5) (5 * x ^ 4) x := by
    simpa using hasDerivAt_pow 5 x
  have hden0 := (hasDerivAt_exp x).sub (hasDerivAt_const x (1 : ℝ))
  have hden1 : HasDerivAt (fun t : ℝ => exp t - 1) (exp x - 0) x := by
    refine hden0.congr_of_eventuallyEq ?_
    filter_upwards with t
    simp
  have hden' := hden1.congr_deriv (by ring : exp x - 0 = exp x)
  have hdiv := hnum.div hden' hden
  have hrewrite : 5 * x ^ 4 * (exp x - 1) - x ^ 5 * exp x =
      x ^ 4 * exp x * wienAux x := by
    unfold wienAux
    rw [exp_neg]
    field_simp [hexp]
    ring
  refine hdiv.congr_deriv ?_
  rw [hrewrite]

/-- Unique positive root of `5 − x = 5 exp(−x)`, and the interval `(4, 5)`.

`wienAux 0 = 0` is the extraneous root. -/
theorem root_unique :
    ∃ x, 0 < x ∧ wienAux x = 0 ∧ 4 < x ∧ x < 5 ∧
      ∀ y, 0 < y → wienAux y = 0 → y = x := by
  have hcont : ContinuousOn wienAux (Icc 4 5) := continuous_wienAux.continuousOn
  have hmem : (0 : ℝ) ∈ Ioo (wienAux 5) (wienAux 4) :=
    ⟨wienAux_five_neg, wienAux_four_pos⟩
  obtain ⟨x, hxI, hx0⟩ := intermediate_value_Ioo' (by norm_num : (4 : ℝ) ≤ 5) hcont hmem
  have hx4 : 4 < x := hxI.1
  have hx5 : x < 5 := hxI.2
  have hxpos : 0 < x := lt_trans (by norm_num) hx4
  refine ⟨x, hxpos, hx0, hx4, hx5, ?_⟩
  intro y hy hy0
  have hy4 : 4 < y := by
    by_contra hle
    have hypos := aux_pos_on_low y hy (le_of_not_gt hle)
    linarith
  exact (strictAnti_past_four.injOn hx4.le hy4.le (hx0.trans hy0.symm)).symm

/-- Displacement constant from the positive root.

`hb` is `b = h c / (k_B x)`. The root is not replaced by a decimal. -/
theorem wien_eq (b hpl c kB x : ℝ)
    (hkB : kB ≠ 0) (hx : 0 < x) (hroot : wienAux x = 0)
    (hb : b = hpl * c / (kB * x)) :
    b * kB * x = hpl * c ∧ 4 < x ∧ x < 5 ∧ HasDerivAt spectral 0 x := by
  obtain ⟨y, -, hy0, hy4, hy5, huniq⟩ := root_unique
  have hxy : x = y := huniq x hx hroot
  refine ⟨?_, hxy.symm ▸ hy4, hxy.symm ▸ hy5, ?_⟩
  · rw [hb]
    field_simp [hkB, hx.ne']
  · refine (hasDerivAt_spectral x hx).congr_deriv ?_
    rw [hroot]
    ring

/-- A critical point in `x` is a critical point in wavelength.

`α / λ` is `h c / (λ k_B T)`. The factor relating the two densities does
not depend on `λ`. -/
theorem wavelength_critical (α lam : ℝ) (hα : 0 < α) (hlam : 0 < lam)
    (hroot : wienAux (α / lam) = 0) :
    HasDerivAt (fun t => spectral (α / t)) 0 lam := by
  have hx : 0 < α / lam := div_pos hα hlam
  have hspec : HasDerivAt spectral 0 (α / lam) := by
    refine (hasDerivAt_spectral _ hx).congr_deriv ?_
    rw [hroot]
    ring
  have hinv : HasDerivAt (fun t : ℝ => α / t) (-(α / lam ^ 2)) lam := by
    have h := (hasDerivAt_inv hlam.ne').const_mul α
    simpa [div_eq_mul_inv] using h
  have hcomp := hspec.comp lam hinv
  exact hcomp.congr_deriv (by ring)

/-- `λ T = b` at the positive root. -/
theorem displacement (b hpl c kB lam T x : ℝ)
    (hkB : kB ≠ 0) (hT : 0 < T) (hlam : 0 < lam) (hxpos : 0 < x)
    (hxdef : x = hpl * c / (lam * kB * T))
    (hroot : wienAux x = 0)
    (hb : b = lam * T) :
    b * kB * x = hpl * c ∧
      HasDerivAt (fun t => spectral (hpl * c / (t * kB * T))) 0 lam := by
  have hconst := (wien_eq (hpl * c / (kB * x)) hpl c kB x hkB hxpos hroot rfl).1
  have hα : 0 < hpl * c / (kB * T) := by
    have hx' : 0 < hpl * c / (lam * kB * T) := by rwa [← hxdef]
    have hlampos : 0 < lam := hlam
    field_simp [hlampos.ne', hkB, hT.ne'] at hx' ⊢
    linarith
  refine ⟨?_, ?_⟩
  · rw [hb, hxdef]
    field_simp [hkB, hT.ne', hlam.ne']
  · have harg : hpl * c / (kB * T) / lam = x := by
      rw [hxdef]
      field_simp [hlam.ne', hkB, hT.ne']
    have hcrit :=
      wavelength_critical (hpl * c / (kB * T)) lam hα hlam (harg ▸ hroot)
    refine hcrit.congr_of_eventuallyEq ?_
    filter_upwards with t
    congr 1
    field_simp [hkB, hT.ne']

end PhysJS.WienDisplacement

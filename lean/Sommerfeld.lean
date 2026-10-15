/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Gamma.Basic
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.MeasureTheory.Integral.DominatedConvergence
import Mathlib.MeasureTheory.Integral.IntegralEqImproper
import Mathlib.MeasureTheory.Measure.Lebesgue.Integral
import Mathlib.NumberTheory.ZetaValues
import Mathlib.Topology.Algebra.InfiniteSum.NatInt

/-!
`be-61`. Derivation step. The Sommerfeld coefficient, not the transport law.

```
∫_ℝ x² e^x / (1 + e^x)² dx = π²/3
```

That factor is the `π²/3` in the encoded Lorenz number. The integrand is
even, so the half-line integral is half of `π²/3`. Claiming the half-line
equals `π²/3` fails. This does not derive the Wiedemann–Franz law.
-/

namespace PhysJS.Sommerfeld

open Real MeasureTheory Filter Set

/-- Integrand `x² e^x / (1 + e^x)²`. -/
noncomputable def integrand (x : ℝ) : ℝ :=
  x ^ 2 * exp x / (1 + exp x) ^ 2

/-- Series term `n (-1)^{n+1} x² e^{-n x}`. -/
noncomputable def seriesTerm (n : ℕ) (x : ℝ) : ℝ :=
  (n : ℝ) * (-1 : ℝ) ^ (n + 1) * x ^ 2 * exp (-(n : ℝ) * x)

lemma fermi_neg (x : ℝ) :
    exp (-x) / (1 + exp (-x)) ^ 2 = exp x / (1 + exp x) ^ 2 := by
  rw [exp_neg]
  field_simp
  ring

lemma integrand_even (x : ℝ) : integrand (-x) = integrand x := by
  unfold integrand
  rw [neg_sq, ← mul_div, ← mul_div, fermi_neg]

lemma seriesTerm_tsum {x : ℝ} (hx : 0 < x) : ∑' n : ℕ, seriesTerm n x = integrand x := by
  let r : ℝ := -exp (-x)
  have hr : ‖r‖ < 1 := by
    rw [norm_neg, Real.norm_of_nonneg (exp_pos _).le]
    exact (exp_lt_one_iff).2 (neg_lt_zero.mpr hx)
  have hgeom : ∑' n : ℕ, (n : ℝ) * r ^ n = r / (1 - r) ^ 2 :=
    tsum_coe_mul_geometric_of_norm_lt_one hr
  have hpow : ∀ n : ℕ, r ^ n = (-1 : ℝ) ^ n * exp (-((n : ℝ) * x)) := by
    intro n
    rw [show r = (-1) * exp (-x) by simp [r], mul_pow, ← exp_nat_mul, mul_neg]
  have hclosed : ∑' n : ℕ, (n : ℝ) * (-1 : ℝ) ^ n * exp (-((n : ℝ) * x)) =
      -(exp (-x) / (1 + exp (-x)) ^ 2) := by
    have hfun : (fun n : ℕ => (n : ℝ) * r ^ n) =
        fun n : ℕ => (n : ℝ) * (-1 : ℝ) ^ n * exp (-((n : ℝ) * x)) := by
      funext n
      rw [hpow n, mul_assoc]
    rw [← hfun, hgeom]
    simp only [r, sub_neg_eq_add, ← neg_div]
  have hsign : ∀ n : ℕ, seriesTerm n x =
      x ^ 2 * -((n : ℝ) * (-1 : ℝ) ^ n * exp (-((n : ℝ) * x))) := by
    intro n
    simp only [seriesTerm]
    rw [show exp (-(n : ℝ) * x) = exp (-((n : ℝ) * x)) by congr 1; ring]
    ring
  have hsum : ∑' n : ℕ, seriesTerm n x =
      x ^ 2 * -(∑' n : ℕ, (n : ℝ) * (-1 : ℝ) ^ n * exp (-((n : ℝ) * x))) := by
    simp_rw [hsign]
    rw [tsum_mul_left, tsum_neg]
  rw [hsum, hclosed, neg_neg, fermi_neg, mul_div, integrand]

lemma integral_sq_exp (n : ℕ) (hn : n ≠ 0) :
    ∫ x in Ioi (0 : ℝ), x ^ 2 * exp (-((n : ℝ) * x)) =
      (1 / (n : ℝ)) ^ 3 * Gamma 3 := by
  have hn0 : 0 < (n : ℝ) := by exact_mod_cast Nat.pos_of_ne_zero hn
  have hcongr : ∫ x in Ioi (0 : ℝ), x ^ 2 * exp (-((n : ℝ) * x)) =
      ∫ x in Ioi (0 : ℝ), x ^ ((3 : ℝ) - 1) * exp (-((n : ℝ) * x)) := by
    refine setIntegral_congr_fun measurableSet_Ioi fun x hx => ?_
    rw [show (3 : ℝ) - 1 = 2 by norm_num, rpow_two]
  rw [hcongr, integral_rpow_mul_exp_neg_mul_Ioi (a := 3) (r := (n : ℝ)) (by norm_num) hn0]
  rw [show (3 : ℝ) = ((3 : ℕ) : ℝ) by norm_num, rpow_natCast]

lemma gamma_three : Gamma 3 = 2 := by
  simp [Nat.factorial]

lemma integrable_sq_exp (n : ℕ) (hn : n ≠ 0) :
    IntegrableOn (fun x : ℝ => x ^ 2 * exp (-(n : ℝ) * x)) (Ioi 0) := by
  have hn0 : 0 < (n : ℝ) := by exact_mod_cast Nat.pos_of_ne_zero hn
  have hG : IntegrableOn (fun t : ℝ => exp (-t) * t ^ ((3 : ℝ) - 1)) (Ioi 0) :=
    GammaIntegral_convergent (by norm_num : (0 : ℝ) < 3)
  have hG0 : IntegrableOn (fun t : ℝ => exp (-t) * t ^ ((3 : ℝ) - 1))
      (Ioi ((n : ℝ) * 0)) := by
    simpa [mul_zero] using hG
  have hscale : IntegrableOn (fun x : ℝ =>
      exp (-((n : ℝ) * x)) * ((n : ℝ) * x) ^ ((3 : ℝ) - 1)) (Ioi 0) :=
    (integrableOn_Ioi_comp_mul_left_iff
      (fun t => exp (-t) * t ^ ((3 : ℝ) - 1)) (0 : ℝ) (a := (n : ℝ)) hn0).2 hG0
  have hmul : IntegrableOn (fun x : ℝ =>
      ((n : ℝ) ^ 2)⁻¹ * (exp (-((n : ℝ) * x)) * ((n : ℝ) * x) ^ ((3 : ℝ) - 1))) (Ioi 0) :=
    hscale.const_mul ((n : ℝ) ^ 2)⁻¹
  refine IntegrableOn.congr_fun hmul (fun x hx => ?_) measurableSet_Ioi
  rw [show (3 : ℝ) - 1 = 2 by norm_num, rpow_two, mul_pow]
  field_simp

lemma integral_seriesTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), seriesTerm n x =
      if n = 0 then 0 else 2 * (-1 : ℝ) ^ (n + 1) / (n : ℝ) ^ 2 := by
  by_cases hn : n = 0
  · simp [hn, seriesTerm]
  · simp only [hn, ite_false]
    have hfun : (fun x => seriesTerm n x) =
        fun x => ((n : ℝ) * (-1 : ℝ) ^ (n + 1)) * (x ^ 2 * exp (-((n : ℝ) * x))) := by
      funext x
      simp only [seriesTerm, neg_mul]
      ring
    rw [hfun, integral_const_mul, integral_sq_exp n hn, gamma_three]
    field_simp

lemma integral_norm_seriesTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), ‖seriesTerm n x‖ =
      if n = 0 then 0 else 2 / (n : ℝ) ^ 2 := by
  by_cases hn : n = 0
  · simp [hn, seriesTerm]
  · simp only [hn, ite_false]
    have hcongr : (fun x => ‖seriesTerm n x‖) =ᵐ[volume.restrict (Ioi 0)]
        fun x => (n : ℝ) * (x ^ 2 * exp (-((n : ℝ) * x))) := by
      refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
      simp only [seriesTerm, Real.norm_eq_abs]
      have hsign : |(-1 : ℝ) ^ (n + 1)| = 1 := by simp
      rw [show exp (-(n : ℝ) * x) = exp (-((n : ℝ) * x)) by congr 1; ring]
      rw [abs_mul, abs_mul, abs_mul, hsign, abs_of_nonneg (Nat.cast_nonneg n),
        abs_of_nonneg (sq_nonneg x), abs_of_nonneg (exp_pos _).le]
      ring
    rw [integral_congr_ae hcongr, integral_const_mul, integral_sq_exp n hn, gamma_three]
    field_simp

lemma summable_integral_norm :
    Summable fun n : ℕ => ∫ x in Ioi (0 : ℝ), ‖seriesTerm n x‖ := by
  have hζ : Summable fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 2 := hasSum_zeta_two.summable
  refine Summable.of_norm_bounded (hζ.mul_left 2) fun n => ?_
  rw [Real.norm_eq_abs, integral_norm_seriesTerm]
  by_cases hn : n = 0
  · simp [hn]
  · simp only [hn, ite_false]
    have hpos : 0 < 2 / (n : ℝ) ^ 2 := by
      exact div_pos (by norm_num) (sq_pos_of_pos (by exact_mod_cast Nat.pos_of_ne_zero hn))
    rw [abs_of_pos hpos]
    exact le_of_eq (by rw [← Nat.cast_pow]; ring)

/-- `∑ (-1)^n / (n + 1)² = π²/12`, from `∑ 1/n² = π²/6`. -/
lemma hasSum_alternating_inv_sq :
    HasSum (fun n : ℕ => (-1 : ℝ) ^ n / ((n + 1 : ℕ) : ℝ) ^ 2) (π ^ 2 / 12) := by
  let f : ℕ → ℝ := fun n => (1 : ℝ) / (n : ℝ) ^ 2
  have hζ : HasSum f (π ^ 2 / 6) := hasSum_zeta_two
  have hsum : Summable f := hζ.summable
  have hzero : f 0 = 0 := by simp [f]
  have heven_eq : ∀ k, f (2 * k) = (1 / 4) * f k := by
    intro k
    by_cases hk : k = 0
    · simp [f, hk]
    · have hk' : (k : ℝ) ≠ 0 := by exact_mod_cast hk
      simp only [f]
      field_simp [hk']
      rw [Nat.cast_mul]
      ring
  have heven : HasSum (fun k : ℕ => f (2 * k)) (π ^ 2 / 24) := by
    have hmul : HasSum (fun k : ℕ => (1 / 4) * f k) ((1 / 4) * (π ^ 2 / 6)) :=
      hζ.mul_left (1 / 4)
    convert hmul using 1
    · ext k
      exact heven_eq k
    · ring
  have hinj_odd : Function.Injective fun k : ℕ => 2 * k + 1 :=
    (add_left_injective 1).comp (mul_right_injective₀ (by decide : (2 : ℕ) ≠ 0))
  have hodd_sum : Summable fun k : ℕ => f (2 * k + 1) := hsum.comp_injective hinj_odd
  have hodd_tsum : ∑' k : ℕ, f (2 * k + 1) = π ^ 2 / 8 := by
    have hjoin := heven.even_add_odd hodd_sum.hasSum
    have hvals : π ^ 2 / 6 = π ^ 2 / 24 + ∑' k : ℕ, f (2 * k + 1) := by
      simpa [hζ.tsum_eq] using hjoin.tsum_eq
    linarith
  have heven_shift : ∑' k : ℕ, f (2 * (k + 1)) = π ^ 2 / 24 := by
    have hg : Summable fun k : ℕ => f (2 * k) := heven.summable
    have hsplit := hg.tsum_eq_zero_add
    rw [heven.tsum_eq, hzero, zero_add] at hsplit
    exact hsplit.symm
  let φ : ℕ → ℝ := fun n => (-1 : ℝ) ^ n / ((n + 1 : ℕ) : ℝ) ^ 2
  have hφ_even : ∀ k, φ (2 * k) = f (2 * k + 1) := by
    intro k
    simp [φ, f, (even_two.mul_right k).neg_pow]
  have hφ_odd : ∀ k, φ (2 * k + 1) = -f (2 * (k + 1)) := by
    intro k
    have hpow : (-1 : ℝ) ^ (2 * k + 1) = -1 := by
      rw [pow_succ]
      simp [(even_two.mul_right k).neg_pow]
    have hindex : 2 * k + 1 + 1 = 2 * (k + 1) := by omega
    simp only [φ, f, hpow, hindex, neg_div]
  have hEven : HasSum (fun k : ℕ => φ (2 * k)) (π ^ 2 / 8) := by
    have hcongr : (fun k : ℕ => φ (2 * k)) = fun k => f (2 * k + 1) := by
      funext k
      exact hφ_even k
    simpa [hcongr, hodd_tsum] using hodd_sum.hasSum
  have hOddFun : Summable fun k : ℕ => φ (2 * k + 1) := by
    have hshift : Summable fun k : ℕ => f (2 * (k + 1)) :=
      (summable_nat_add_iff 1).2 heven.summable
    simpa [hφ_odd] using hshift.neg
  have hOdd : HasSum (fun k : ℕ => φ (2 * k + 1)) (-(π ^ 2 / 24)) := by
    rw [hOddFun.hasSum_iff]
    have hfun : (fun k : ℕ => φ (2 * k + 1)) = fun k => -f (2 * (k + 1)) := by
      funext k
      exact hφ_odd k
    rw [hfun, tsum_neg, heven_shift]
  convert hEven.even_add_odd hOdd using 1
  ring

lemma coeff_summable : Summable fun n : ℕ =>
    if n = 0 then (0 : ℝ) else 2 * (-1 : ℝ) ^ (n + 1) / (n : ℝ) ^ 2 := by
  have hζ : Summable fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 2 := hasSum_zeta_two.summable
  refine Summable.of_norm_bounded (hζ.mul_left 2) fun n => ?_
  rw [Real.norm_eq_abs]
  by_cases hn : n = 0
  · simp [hn]
  · simp only [hn, ite_false, abs_mul, abs_div, abs_pow, abs_neg, abs_one, one_pow]
    rw [abs_of_nonneg (by norm_num : (0 : ℝ) ≤ 2), abs_of_nonneg (Nat.cast_nonneg n)]
    exact le_of_eq (by ring)

lemma coeff_tsum :
    ∑' n : ℕ, (if n = 0 then (0 : ℝ) else 2 * (-1 : ℝ) ^ (n + 1) / (n : ℝ) ^ 2) =
      π ^ 2 / 6 := by
  let g : ℕ → ℝ := fun n => if n = 0 then 0 else 2 * (-1 : ℝ) ^ (n + 1) / (n : ℝ) ^ 2
  have hg : Summable g := coeff_summable
  have hsplit := hg.tsum_eq_zero_add
  have h0 : g 0 = 0 := by simp [g]
  have htail : ∀ n : ℕ, g (n + 1) = 2 * (-1 : ℝ) ^ n / ((n + 1 : ℕ) : ℝ) ^ 2 := by
    intro n
    have hn : n + 1 ≠ 0 := Nat.succ_ne_zero n
    simp only [g, hn, ite_false]
    have hpow : (-1 : ℝ) ^ (n + 1 + 1) = (-1 : ℝ) ^ n := by
      rw [show n + 1 + 1 = n + 2 by omega, pow_add, pow_two]
      simp
    have hcast : ((n + 1 : ℕ) : ℝ) = (n : ℝ) + 1 := by push_cast; ring
    rw [hpow, hcast]
  rw [h0, zero_add] at hsplit
  have htsum : ∑' n : ℕ, g (n + 1) = π ^ 2 / 6 := by
    have hfun : (fun n : ℕ => g (n + 1)) =
        fun n : ℕ => 2 * ((-1 : ℝ) ^ n / ((n + 1 : ℕ) : ℝ) ^ 2) := by
      funext n
      rw [htail]
      ring
    rw [hfun, tsum_mul_left, hasSum_alternating_inv_sq.tsum_eq]
    ring
  change ∑' n : ℕ, g n = π ^ 2 / 6
  rw [hsplit, htsum]

lemma integral_half :
    ∫ x in Ioi (0 : ℝ), integrand x = π ^ 2 / 6 := by
  have hterm : ∀ n : ℕ, IntegrableOn (seriesTerm n) (Ioi 0) := by
    intro n
    by_cases hn : n = 0
    · rw [hn]
      unfold seriesTerm
      simp only [Nat.cast_zero, zero_mul]
      exact integrableOn_zero
    · have hsq := integrable_sq_exp n hn
      refine IntegrableOn.congr_fun (hsq.const_mul ((n : ℝ) * (-1 : ℝ) ^ (n + 1)))
          (fun x _ => ?_) measurableSet_Ioi
      simp only [seriesTerm, neg_mul]
      ring
  have hswap := integral_tsum_of_summable_integral_norm (μ := volume.restrict (Ioi (0 : ℝ)))
    hterm summable_integral_norm
  have hpoint : (fun x => ∑' n : ℕ, seriesTerm n x) =ᵐ[volume.restrict (Ioi 0)] integrand := by
    refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
    exact seriesTerm_tsum hx
  rw [integral_congr_ae hpoint] at hswap
  have hsum : ∑' n : ℕ, ∫ x in Ioi (0 : ℝ), seriesTerm n x = π ^ 2 / 6 := by
    simp_rw [integral_seriesTerm]
    exact coeff_tsum
  simpa [hsum] using hswap.symm

lemma integrableOn_half : IntegrableOn integrand (Ioi 0) := by
  by_contra h
  have : ∫ x in Ioi (0 : ℝ), integrand x = 0 := integral_undef h
  rw [integral_half] at this
  have hπ : 0 < π ^ 2 := by positivity
  linarith

lemma integrableOn_left : IntegrableOn integrand (Iic 0) := by
  rw [← (Measure.measurePreserving_neg (volume : Measure ℝ)).integrableOn_comp_preimage
      (Homeomorph.neg ℝ).measurableEmbedding]
  simp_rw [Function.comp_def, integrand_even, neg_preimage, neg_Iic, neg_zero]
  exact (integrableOn_Ici_iff_integrableOn_Ioi).2 integrableOn_half

lemma integral_eq_two_half :
    ∫ x, integrand x = 2 * ∫ x in Ioi (0 : ℝ), integrand x := by
  rw [← setIntegral_univ, ← Iic_union_Ioi (a := 0),
    setIntegral_union (Iic_disjoint_Ioi le_rfl) measurableSet_Ioi
      integrableOn_left integrableOn_half]
  have hleft : ∫ x in Iic (0 : ℝ), integrand x = ∫ x in Ioi (0 : ℝ), integrand x := by
    have hswap : ∫ x in Iic (0 : ℝ), integrand x = ∫ x in Iic (0 : ℝ), integrand (-x) := by
      refine setIntegral_congr_fun measurableSet_Iic fun x _ => ?_
      exact (integrand_even x).symm
    rw [hswap, integral_comp_neg_Iic, neg_zero]
  rw [hleft]
  ring

/-- The Sommerfeld integral. The half-line value is half of `π²/3`.

Covers the derivation step of `be-61`. Not the transport law. -/
theorem integral_eq :
    ∫ x : ℝ, x ^ 2 * exp x / (1 + exp x) ^ 2 = π ^ 2 / 3 := by
  calc
    ∫ x, x ^ 2 * exp x / (1 + exp x) ^ 2 = ∫ x, integrand x := by simp [integrand]
    _ = 2 * ∫ x in Ioi (0 : ℝ), integrand x := integral_eq_two_half
    _ = 2 * (π ^ 2 / 6) := by rw [integral_half]
    _ = π ^ 2 / 3 := by ring

/-- The half-line integral is not `π²/3`. -/
theorem wrong_dictionary_half_line :
    ∫ x in Ioi (0 : ℝ), x ^ 2 * exp x / (1 + exp x) ^ 2 ≠ π ^ 2 / 3 := by
  have hhalf : ∫ x in Ioi (0 : ℝ), x ^ 2 * exp x / (1 + exp x) ^ 2 = π ^ 2 / 6 := by
    simpa [integrand] using integral_half
  rw [hhalf]
  intro h
  have : (π ^ 2) / 6 = (π ^ 2) / 3 := h
  have hπ : π ^ 2 ≠ 0 := (sq_pos_of_pos pi_pos).ne'
  field_simp [hπ] at this
  linarith

end PhysJS.Sommerfeld

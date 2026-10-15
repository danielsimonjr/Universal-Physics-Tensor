/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Gamma.Basic
import Mathlib.Analysis.SpecialFunctions.Gaussian.GaussianIntegral
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.MeasureTheory.Integral.DominatedConvergence
import Mathlib.MeasureTheory.Integral.IntegralEqImproper
import Mathlib.NumberTheory.ZetaValues
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import Mathlib.Topology.Algebra.InfiniteSum.NatInt
import Mathlib.Topology.Algebra.InfiniteSum.Ring

/-!
`be-191`. Bridge. Thermal-conductance quantum.

The catalog equation is

```
κ₀ = π² k_B² T / (3 h)
```

per ballistic bosonic channel. `thermal_conductance_eq` derives it. One
channel carries the heat current `J = ∫_0^∞ h ν n(ν, T) dν` with the Bose
occupation `n = 1 / (exp(h ν / (k_B T)) − 1)` (the density of states `dk / 2π`
and the group velocity cancel in one dimension, leaving `dν`; this is the
premise, with adiabatic contacts). The conductance is `κ = dJ / dT`, which is
`∫_0^∞ h ν (∂n / ∂T) dν` with the occupation derivative

```
∂n / ∂T = (h ν / (k_B T²)) e^x / (e^x − 1)²,    x = h ν / (k_B T).
```

That derivative is proved (`hasDerivAt_occupation`). The substitution
`x = h ν / (k_B T)` turns the integral into `(k_B² T / h) ∫_0^∞ x² e^x/(e^x−1)² dx`.
`bose_integral` proves

```
∫_0^∞ x² e^x / (e^x − 1)² dx = π² / 3
```

from `∑ n⁻² = π² / 6` (as `∑ n x² e^{−n x}` with `∫ = 2 / n²`) and `Γ(3) = 2`.
The method is that of `be-165`; the integrand differs.

`bose_integral_not_one` and `exponent_needed` separate the constant and the
power of `T`. Not a statement about phonon transmission, contacts, or the
fermionic Wiedemann–Franz value (`be-61`). The derivative of the integral is
taken as `∫ h ν (∂n/∂T)`: the exchange of `d/dT` and the integral is a
premise, not proved.
-/

namespace PhysJS.ThermalConductanceQuantum

open Real MeasureTheory Filter Set

/-- `x² e^x / (e^x − 1)²`. -/
noncomputable def boseIntegrand (x : ℝ) : ℝ :=
  x ^ 2 * exp x / (exp x - 1) ^ 2

/-- Series term `n x² e^{−n x}`. -/
noncomputable def boseTerm (n : ℕ) (x : ℝ) : ℝ :=
  (n : ℝ) * (x ^ 2 * exp (-((n : ℝ) * x)))

lemma boseTerm_tsum {x : ℝ} (hx : 0 < x) :
    ∑' n : ℕ, boseTerm n x = boseIntegrand x := by
  let r : ℝ := exp (-x)
  have hrpos : 0 ≤ r := (exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, exp_lt_one_iff]
    linarith
  have hgeom := tsum_coe_mul_geometric_of_norm_lt_one hr
  have hterm : ∀ n : ℕ, boseTerm n x = x ^ 2 * ((n : ℝ) * r ^ n) := by
    intro n
    rw [boseTerm, show r = exp (-x) by rfl, ← exp_nat_mul]
    have : (n : ℝ) * -x = -((n : ℝ) * x) := by ring
    rw [this]; ring
  simp_rw [hterm]
  rw [tsum_mul_left, hgeom]
  have hden : exp x - 1 ≠ 0 := by
    have : 1 < exp x := (one_lt_exp_iff).2 hx
    linarith
  have hE : exp x ≠ 0 := (exp_pos x).ne'
  rw [boseIntegrand, show r = exp (-x) by rfl, exp_neg]
  have h1 : 1 - (exp x)⁻¹ = (exp x - 1) / exp x := by field_simp
  rw [h1]
  field_simp

lemma integrable_boseTerm (n : ℕ) : IntegrableOn (boseTerm n) (Ioi 0) := by
  rcases Nat.eq_zero_or_pos n with rfl | hn
  · have h0 : boseTerm 0 = fun _ => 0 := by
      funext x; simp [boseTerm]
    rw [h0]; exact integrableOn_zero
  · have hr : 0 < (n : ℝ) := by exact_mod_cast hn
    have hG := integrableOn_rpow_mul_exp_neg_mul_rpow (p := (1 : ℝ)) (s := (2 : ℝ))
      (b := (n : ℝ)) (by norm_num) (by norm_num) hr
    have hG' : IntegrableOn
        (fun x : ℝ => (n : ℝ) * (x ^ (2 : ℝ) * exp (-(n : ℝ) * x ^ (1 : ℝ)))) (Ioi 0) :=
      Integrable.const_mul hG (n : ℝ)
    refine hG'.congr_fun (fun x _ => ?_) measurableSet_Ioi
    simp only [boseTerm]
    rw [rpow_one]
    rw [show (2 : ℝ) = ((2 : ℕ) : ℝ) by norm_num, rpow_natCast, neg_mul]

lemma integral_boseTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), boseTerm n x = 2 / (n : ℝ) ^ 2 := by
  rcases Nat.eq_zero_or_pos n with rfl | hn
  · simp [boseTerm]
  · have hr : 0 < (n : ℝ) := by exact_mod_cast hn
    have hcongr : ∫ x in Ioi (0 : ℝ), boseTerm n x =
        (n : ℝ) * ∫ x in Ioi (0 : ℝ), x ^ ((3 : ℝ) - 1) * exp (-((n : ℝ) * x)) := by
      rw [← integral_const_mul]
      refine setIntegral_congr_fun measurableSet_Ioi fun x _ => ?_
      simp only [boseTerm]
      have hrpow : x ^ ((3 : ℝ) - 1) = x ^ 2 := by
        rw [show (3 : ℝ) - 1 = ((2 : ℕ) : ℝ) by norm_num, rpow_natCast]
      rw [hrpow]
    rw [hcongr, integral_rpow_mul_exp_neg_mul_Ioi (a := 3) (r := (n : ℝ))
      (by norm_num) hr]
    have hΓ : Gamma 3 = 2 := by
      rw [show (3 : ℝ) = ((2 : ℕ) + 1 : ℝ) by norm_num, Gamma_nat_eq_factorial]
      norm_num
    rw [hΓ, show (3 : ℝ) = ((3 : ℕ) : ℝ) by norm_num, rpow_natCast]
    field_simp

lemma integral_norm_boseTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖ = 2 / (n : ℝ) ^ 2 := by
  have hcongr : (fun x => ‖boseTerm n x‖) =ᵐ[volume.restrict (Ioi 0)] boseTerm n := by
    refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
    change ‖boseTerm n x‖ = boseTerm n x
    rw [Real.norm_eq_abs]
    have hx0 : 0 < x := hx
    exact abs_of_nonneg (by simp only [boseTerm]; positivity)
  rw [integral_congr_ae hcongr, integral_boseTerm]

lemma summable_integral_norm :
    Summable fun n : ℕ => ∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖ := by
  have hζ : Summable fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 2 := hasSum_zeta_two.summable
  have h2 := hζ.mul_left 2
  suffices ∀ n, (∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖) = 2 * (1 / (n : ℝ) ^ 2) by
    exact (summable_congr this).2 h2
  intro n
  rw [integral_norm_boseTerm, div_eq_mul_inv]
  ring

/-- `∫_0^∞ x² e^x / (e^x − 1)² dx = π² / 3`. -/
theorem bose_integral : ∫ x in Ioi (0 : ℝ), boseIntegrand x = π ^ 2 / 3 := by
  have hterm : ∀ n : ℕ, Integrable (boseTerm n) (volume.restrict (Ioi (0 : ℝ))) :=
    fun n => integrable_boseTerm n
  have hswap := integral_tsum_of_summable_integral_norm (μ := volume.restrict (Ioi (0 : ℝ)))
    hterm summable_integral_norm
  have hpoint : (fun x => ∑' n : ℕ, boseTerm n x) =ᵐ[volume.restrict (Ioi 0)] boseIntegrand := by
    refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
    exact boseTerm_tsum hx
  rw [integral_congr_ae hpoint] at hswap
  have hsum : ∑' n : ℕ, ∫ x in Ioi (0 : ℝ), boseTerm n x = π ^ 2 / 3 := by
    simp_rw [integral_boseTerm]
    have hfun : (fun n : ℕ => 2 / (n : ℝ) ^ 2) = fun n : ℕ => 2 * ((1 : ℝ) / (n : ℝ) ^ 2) := by
      funext n
      ring
    rw [hfun, tsum_mul_left, hasSum_zeta_two.tsum_eq]
    ring
  exact hswap.symm.trans hsum

/-- Bose occupation of a mode of frequency `ν`. -/
noncomputable def occupation (h kB ν T : ℝ) : ℝ :=
  (exp (h * ν / (kB * T)) - 1)⁻¹

/-- The temperature derivative of the occupation. -/
lemma hasDerivAt_occupation (h kB ν T : ℝ) (hh : 0 < h) (hk : 0 < kB) (hν : 0 < ν)
    (hT : 0 < T) :
    HasDerivAt (fun T' => occupation h kB ν T')
      ((h * ν / (kB * T ^ 2)) * (exp (h * ν / (kB * T)) / (exp (h * ν / (kB * T)) - 1) ^ 2)) T := by
  have hT0 : T ≠ 0 := hT.ne'
  have hk0 : kB ≠ 0 := hk.ne'
  have hx : HasDerivAt (fun T' : ℝ => h * ν / (kB * T')) (-(h * ν / (kB * T ^ 2))) T := by
    have h1 : HasDerivAt (fun T' : ℝ => kB * T') kB T := by
      simpa using (hasDerivAt_id T).const_mul kB
    have h2 := (hasDerivAt_const T (h * ν)).div h1 (by positivity)
    refine h2.congr_deriv ?_
    field_simp
    ring
  have he := hx.exp
  have hpos : 0 < h * ν / (kB * T) := by positivity
  have hne : exp (h * ν / (kB * T)) - 1 ≠ 0 := by
    have : 1 < exp (h * ν / (kB * T)) := (one_lt_exp_iff).2 hpos
    linarith
  have hsub := he.sub_const 1
  have hinv := hsub.inv hne
  refine hinv.congr_deriv ?_
  field_simp

/-- The substitution `x = h ν / (k_B T)`. -/
lemma scaled_integral (h kB T : ℝ) (hh : 0 < h) (hk : 0 < kB) (hT : 0 < T) :
    ∫ ν in Ioi (0 : ℝ),
        h * ν * ((h * ν / (kB * T ^ 2)) *
          (exp (h * ν / (kB * T)) / (exp (h * ν / (kB * T)) - 1) ^ 2)) =
      kB * (kB * T / h) * ∫ x in Ioi (0 : ℝ), boseIntegrand x := by
  have hα : 0 < h / (kB * T) := by positivity
  have hscale := integral_comp_mul_left_Ioi boseIntegrand 0 hα
  rw [mul_zero] at hscale
  have hleft : ∫ ν in Ioi (0 : ℝ),
        h * ν * ((h * ν / (kB * T ^ 2)) *
          (exp (h * ν / (kB * T)) / (exp (h * ν / (kB * T)) - 1) ^ 2)) =
      kB * ∫ ν in Ioi (0 : ℝ), boseIntegrand ((h / (kB * T)) * ν) := by
    rw [← integral_const_mul]
    refine setIntegral_congr_fun measurableSet_Ioi fun ν hν => ?_
    have hν0 : 0 < ν := hν
    simp only [boseIntegrand]
    have harg : (h / (kB * T)) * ν = h * ν / (kB * T) := by field_simp
    rw [harg]
    field_simp
  rw [hleft, hscale]
  simp only [smul_eq_mul]
  have hinv : (h / (kB * T))⁻¹ = kB * T / h := by field_simp
  rw [hinv]
  ring

/-- Thermal conductance of one ballistic bosonic channel.

`hd` is the temperature derivative of the Bose occupation for each
`ν > 0` (the premise that the occupation is the Bose law is `d`'s `HasDerivAt`
statement). `hκ` is `κ = ∫ h ν (∂n/∂T) dν`, the temperature derivative of
`J = ∫ h ν n dν`.

Not a derivation of the exchange of `d/dT` and the
integral, of phonon transmission, or of the adiabatic contacts. -/
theorem thermal_conductance_eq (κ h kB T : ℝ) (d : ℝ → ℝ)
    (hh : 0 < h) (hk : 0 < kB) (hT : 0 < T)
    (hd : ∀ ν, 0 < ν → HasDerivAt (fun T' => occupation h kB ν T') (d ν) T)
    (hκ : κ = ∫ ν in Ioi (0 : ℝ), h * ν * d ν) :
    κ = π ^ 2 * kB ^ 2 * T / (3 * h) := by
  have hdval : ∀ ν, 0 < ν → d ν =
      (h * ν / (kB * T ^ 2)) * (exp (h * ν / (kB * T)) / (exp (h * ν / (kB * T)) - 1) ^ 2) :=
    fun ν hν => (hd ν hν).unique (hasDerivAt_occupation h kB ν T hh hk hν hT)
  have hcongr : (∫ ν in Ioi (0 : ℝ), h * ν * d ν) =
      ∫ ν in Ioi (0 : ℝ), h * ν * ((h * ν / (kB * T ^ 2)) *
        (exp (h * ν / (kB * T)) / (exp (h * ν / (kB * T)) - 1) ^ 2)) := by
    refine setIntegral_congr_fun measurableSet_Ioi fun ν hν => ?_
    rw [hdval ν hν]
  rw [hκ, hcongr, scaled_integral h kB T hh hk hT, bose_integral]
  field_simp

/-- The Bose integral is not a bare `1`: units alone leave the constant open. -/
theorem bose_integral_not_one : π ^ 2 / 3 ≠ 1 := by
  intro h
  have h1 : (3 : ℝ) < π := Real.pi_gt_three
  nlinarith

/-- Linear in `T`: the square would be a different law. -/
theorem exponent_needed (kB h T : ℝ) (hk : 0 < kB) (hh : 0 < h) (hT : 1 < T) :
    π ^ 2 * kB ^ 2 * T / (3 * h) ≠ π ^ 2 * kB ^ 2 * T ^ 2 / (3 * h) := by
  intro heq
  have hπ : 0 < π := pi_pos
  have h3 : (0 : ℝ) < 3 * h := by positivity
  rw [div_eq_div_iff h3.ne' h3.ne'] at heq
  have hc : 0 < π ^ 2 * kB ^ 2 * (3 * h) := by positivity
  have : π ^ 2 * kB ^ 2 * (3 * h) * (T * (T - 1)) = 0 := by linear_combination -heq
  rcases mul_eq_zero.mp this with h' | h'
  · exact hc.ne' h'
  · nlinarith

end PhysJS.ThermalConductanceQuantum

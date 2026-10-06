/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Gamma.Basic
import Mathlib.Analysis.SpecialFunctions.Gaussian.GaussianIntegral
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Deriv
import Mathlib.Analysis.SpecificLimits.Normed
import Mathlib.MeasureTheory.Integral.DominatedConvergence
import Mathlib.MeasureTheory.Integral.IntegralEqImproper
import Mathlib.MeasureTheory.Integral.IntervalIntegral.FundThmCalculus
import Mathlib.MeasureTheory.Measure.Lebesgue.Integral
import Mathlib.NumberTheory.ZetaValues
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import Mathlib.Topology.Algebra.InfiniteSum.NatInt
import Mathlib.Topology.Algebra.InfiniteSum.Ring

/-!
`be-165`. Bridge. The Stefan–Boltzmann constant.

The catalog equation is

```
σ = π² k_B⁴ / (60 ℏ³ c²) = 2 π⁵ k_B⁴ / (15 h³ c²)
```

with `h = 2 π ℏ`. `bose_integral` proves

```
∫_0^∞ x³ / (e^x − 1) dx = π⁴ / 15
```

from `∑ n⁻⁴ = π⁴ / 90` and `Γ(4) = 6`. The frequency integral of the Planck
spectrum is that number times `(k_B T / h)⁴`. The hemisphere factor
`c/4` is the angular integral `∫ dφ ∫ sin θ cos θ dθ`. `stefan_boltzmann_eq`
puts the two together. The mode density `8 π` is the same hypothesis as
`be-164`. This is not a radiometer measurement.
-/

namespace PhysJS.StefanBoltzmann

open Real MeasureTheory Filter Set

/-- `x³ / (e^x − 1)`. -/
noncomputable def boseIntegrand (x : ℝ) : ℝ :=
  x ^ 3 / (exp x - 1)

/-- Series term `x³ e^{−(n+1) x}`. -/
noncomputable def boseTerm (n : ℕ) (x : ℝ) : ℝ :=
  x ^ 3 * exp (-((n + 1 : ℕ) : ℝ) * x)

lemma boseTerm_tsum {x : ℝ} (hx : 0 < x) :
    ∑' n : ℕ, boseTerm n x = boseIntegrand x := by
  let r : ℝ := exp (-x)
  have hrpos : 0 ≤ r := (exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, exp_lt_one_iff]
    linarith
  have hgeom : ∑' n : ℕ, r ^ n = (1 - r)⁻¹ := tsum_geometric_of_norm_lt_one hr
  have hfun : (fun n : ℕ => r ^ (n + 1)) = fun n => r * r ^ n := by
    funext n
    rw [pow_succ, mul_comm]
  have hshift : ∑' n : ℕ, r ^ (n + 1) = r / (1 - r) := by
    rw [hfun, tsum_mul_left, hgeom, div_eq_mul_inv]
  have hterm : ∀ n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) = r ^ (n + 1) := by
    intro n
    rw [show r = exp (-x) by rfl, ← exp_nat_mul]
    congr 1
    rw [Nat.cast_add, Nat.cast_one]
    ring
  have hseries : ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) = r / (1 - r) := by
    simp_rw [hterm, hshift]
  have hmul : ∑' n : ℕ, boseTerm n x =
      x ^ 3 * ∑' n : ℕ, exp (-((n + 1 : ℕ) : ℝ) * x) := by
    simp_rw [boseTerm, tsum_mul_left]
  have hden : exp x - 1 ≠ 0 := by
    have : 1 < exp x := (one_lt_exp_iff).2 hx
    linarith
  have hclosed : r / (1 - r) = 1 / (exp x - 1) := by
    rw [show r = exp (-x) by rfl, exp_neg]
    field_simp [hden]
  rw [hmul, hseries, hclosed, boseIntegrand, mul_one_div]

lemma integrable_boseTerm (n : ℕ) : IntegrableOn (boseTerm n) (Ioi 0) := by
  have hr : 0 < ((n + 1 : ℕ) : ℝ) := by positivity
  have hG := integrableOn_rpow_mul_exp_neg_mul_rpow (p := (1 : ℝ)) (s := (3 : ℝ))
    (b := ((n + 1 : ℕ) : ℝ)) (by norm_num) (by norm_num) hr
  refine hG.congr_fun (fun x _ => ?_) measurableSet_Ioi
  simp only [boseTerm]
  rw [rpow_one]
  rw [show (3 : ℝ) = ((3 : ℕ) : ℝ) by norm_num]
  rw [rpow_natCast]

lemma integral_boseTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), boseTerm n x = 6 / ((n + 1 : ℕ) : ℝ) ^ 4 := by
  have hr : 0 < ((n + 1 : ℕ) : ℝ) := by positivity
  have hcongr : ∫ x in Ioi (0 : ℝ), boseTerm n x =
      ∫ x in Ioi (0 : ℝ), x ^ ((4 : ℝ) - 1) * exp (-(((n + 1 : ℕ) : ℝ) * x)) := by
    refine setIntegral_congr_fun measurableSet_Ioi fun x _ => ?_
    simp only [boseTerm]
    have hrpow : x ^ ((4 : ℝ) - 1) = x ^ 3 := by
      rw [show (4 : ℝ) - 1 = ((3 : ℕ) : ℝ) by norm_num, rpow_natCast]
    rw [hrpow, neg_mul]
  rw [hcongr, integral_rpow_mul_exp_neg_mul_Ioi (a := 4) (r := ((n + 1 : ℕ) : ℝ))
    (by norm_num) hr]
  have hΓ : Gamma 4 = 6 := by
    rw [show (4 : ℝ) = ((3 : ℕ) + 1 : ℝ) by norm_num, Gamma_nat_eq_factorial]
    norm_num
  rw [hΓ, show (4 : ℝ) = ((4 : ℕ) : ℝ) by norm_num, rpow_natCast]
  field_simp [hr.ne']

lemma integral_norm_boseTerm (n : ℕ) :
    ∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖ = 6 / ((n + 1 : ℕ) : ℝ) ^ 4 := by
  have hcongr : (fun x => ‖boseTerm n x‖) =ᵐ[volume.restrict (Ioi 0)] boseTerm n := by
    refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
    change ‖boseTerm n x‖ = boseTerm n x
    rw [Real.norm_eq_abs]
    have hx0 : 0 < x := hx
    exact abs_of_nonneg (by simp only [boseTerm]; positivity)
  rw [integral_congr_ae hcongr, integral_boseTerm]

lemma zeta_tail : ∑' n : ℕ, (1 : ℝ) / ((n + 1 : ℕ) : ℝ) ^ 4 = π ^ 4 / 90 := by
  have hζ : HasSum (fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 4) (π ^ 4 / 90) := hasSum_zeta_four
  have hf : Summable fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 4 := hζ.summable
  have hsplit := hf.tsum_eq_zero_add
  have h0 : (1 : ℝ) / ((0 : ℕ) : ℝ) ^ 4 = 0 := by simp
  rw [hζ.tsum_eq, h0, zero_add] at hsplit
  exact hsplit.symm

lemma summable_integral_norm :
    Summable fun n : ℕ => ∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖ := by
  have hζ : Summable fun n : ℕ => (1 : ℝ) / (n : ℝ) ^ 4 := hasSum_zeta_four.summable
  have htail : Summable fun n : ℕ => (1 : ℝ) / ((n + 1 : ℕ) : ℝ) ^ 4 :=
    (summable_nat_add_iff 1).2 hζ
  have h6 := htail.mul_left 6
  suffices ∀ n, (∫ x in Ioi (0 : ℝ), ‖boseTerm n x‖) =
      6 * (1 / ((n + 1 : ℕ) : ℝ) ^ 4) by
    exact (summable_congr this).2 h6
  intro n
  rw [integral_norm_boseTerm, div_eq_mul_inv]
  ring

/-- `∫_0^∞ x³ / (e^x − 1) dx = π⁴ / 15`. -/
theorem bose_integral : ∫ x in Ioi (0 : ℝ), boseIntegrand x = π ^ 4 / 15 := by
  have hterm : ∀ n : ℕ, Integrable (boseTerm n) (volume.restrict (Ioi (0 : ℝ))) :=
    fun n => integrable_boseTerm n
  have hswap := integral_tsum_of_summable_integral_norm (μ := volume.restrict (Ioi (0 : ℝ)))
    hterm summable_integral_norm
  have hpoint : (fun x => ∑' n : ℕ, boseTerm n x) =ᵐ[volume.restrict (Ioi 0)] boseIntegrand := by
    refine (ae_restrict_mem measurableSet_Ioi).mono fun x hx => ?_
    exact boseTerm_tsum hx
  rw [integral_congr_ae hpoint] at hswap
  have hsum : ∑' n : ℕ, ∫ x in Ioi (0 : ℝ), boseTerm n x = π ^ 4 / 15 := by
    simp_rw [integral_boseTerm]
    have hmul : ∑' n : ℕ, 6 / ((n + 1 : ℕ) : ℝ) ^ 4 =
        6 * ∑' n : ℕ, (1 : ℝ) / ((n + 1 : ℕ) : ℝ) ^ 4 := by
      have hfun : (fun n : ℕ => 6 / ((n + 1 : ℕ) : ℝ) ^ 4) =
          fun n => 6 * ((1 : ℝ) / ((n + 1 : ℕ) : ℝ) ^ 4) := by
        funext n
        ring
      rw [hfun, tsum_mul_left]
    rw [hmul, zeta_tail]
    ring
  exact hswap.symm.trans hsum

lemma frequency_integral (α : ℝ) (hα : 0 < α) :
    ∫ ν in Ioi 0, ν ^ 3 / (exp (α * ν) - 1) =
      α⁻¹ ^ 4 * ∫ x in Ioi 0, boseIntegrand x := by
  let g : ℝ → ℝ := fun x => boseIntegrand x * α⁻¹ ^ 4
  have hscale := integral_comp_mul_left_Ioi' g 0 hα
  have hleft : ∫ ν in Ioi 0, ν ^ 3 / (exp (α * ν) - 1) =
      α * ∫ ν in Ioi 0, g (α * ν) := by
    rw [← integral_const_mul]
    refine setIntegral_congr_fun measurableSet_Ioi fun ν hν => ?_
    have hν0 : 0 < ν := hν
    have hden : exp (α * ν) - 1 ≠ 0 := by
      have : 1 < exp (α * ν) := (one_lt_exp_iff).2 (mul_pos hα hν0)
      linarith
    simp only [g, boseIntegrand]
    field_simp [hden, hα.ne']
  have hright : ∫ x in Ioi 0, g x = α⁻¹ ^ 4 * ∫ x in Ioi 0, boseIntegrand x := by
    simp only [g, mul_comm (boseIntegrand _)]
    rw [integral_const_mul]
  rw [hleft]
  rw [show α * ∫ ν in Ioi 0, g (α * ν) = ∫ x in Ioi 0, g x from by
    simpa using hscale]
  exact hright

/-- Planck energy density `∫_0^∞ (8 π h / c³) ν³ / (e^{hν/kT} − 1) dν`. -/
noncomputable def spectralEnergy (h c kB T : ℝ) : ℝ :=
  ∫ ν in Ioi 0,
    (8 * π * h / c ^ 3) * ν ^ 3 / (exp (h * ν / (kB * T)) - 1)

theorem energy_density (h c kB T : ℝ) (hh : 0 < h) (hc : 0 < c) (hk : 0 < kB) (hT : 0 < T) :
    spectralEnergy h c kB T =
      (8 * π * h / c ^ 3) * (kB * T / h) ^ 4 * (π ^ 4 / 15) := by
  have hα : 0 < h / (kB * T) := by positivity
  unfold spectralEnergy
  have hpull : ∫ ν in Ioi 0,
      (8 * π * h / c ^ 3) * ν ^ 3 / (exp (h * ν / (kB * T)) - 1) =
      (8 * π * h / c ^ 3) * ∫ ν in Ioi 0, ν ^ 3 / (exp (h * ν / (kB * T)) - 1) := by
    rw [← integral_const_mul]
    refine setIntegral_congr_fun measurableSet_Ioi fun ν hν => ?_
    have hden : exp (h * ν / (kB * T)) - 1 ≠ 0 := by
      have hν0 : 0 < ν := hν
      have : 0 < h * ν / (kB * T) := div_pos (mul_pos hh hν0) (mul_pos hk hT)
      have hgt : 1 < exp (h * ν / (kB * T)) := (one_lt_exp_iff).2 this
      linarith
    field_simp [hden]
  rw [hpull]
  have hfreq := frequency_integral (h / (kB * T)) hα
  have harg : ∀ ν, h * ν / (kB * T) = (h / (kB * T)) * ν := by
    intro ν
    field_simp
  have hsame : ∫ ν in Ioi 0, ν ^ 3 / (exp (h * ν / (kB * T)) - 1) =
      ∫ ν in Ioi 0, ν ^ 3 / (exp ((h / (kB * T)) * ν) - 1) := by
    refine setIntegral_congr_fun measurableSet_Ioi fun ν _ => ?_
    rw [harg]
  rw [hsame, hfreq, bose_integral]
  have hinv : (h / (kB * T))⁻¹ = kB * T / h := by
    field_simp
  rw [hinv]
  ring

lemma hasDerivAt_sin_sq (θ : ℝ) :
    HasDerivAt (fun t => sin t ^ 2 / 2) (sin θ * cos θ) θ := by
  have hsin := hasDerivAt_sin θ
  have hpow := hsin.pow 2
  have hdiv := hpow.div_const 2
  refine hdiv.congr_deriv ?_
  ring

lemma hemisphere_integrals :
    (∫ θ in (0 : ℝ)..(π / 2), sin θ * cos θ) = 1 / 2 ∧
      (∫ φ in (0 : ℝ)..(2 * π), (1 : ℝ)) = 2 * π := by
  refine ⟨?_, ?_⟩
  · have hderiv : ∀ θ ∈ uIcc (0 : ℝ) (π / 2),
        HasDerivAt (fun t => sin t ^ 2 / 2) (sin θ * cos θ) θ :=
      fun θ _ => hasDerivAt_sin_sq θ
    have hint : IntervalIntegrable (fun θ : ℝ => sin θ * cos θ) volume 0 (π / 2) :=
      ((continuous_sin.mul continuous_cos).intervalIntegrable _ _)
    have hsub := intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv hint
    rw [hsub]
    simp [sin_zero, sin_pi_div_two]
  · rw [intervalIntegral.integral_const]
    ring

/-- Stefan–Boltzmann constant from the Planck integral.

`hσ` is the isotropic hemisphere of `spectralEnergy`: the flux is
`(c u)/(4 π)` times `∫_0^{2π} dφ` times `∫_0^{π/2} sin θ cos θ dθ`.
Both angular integrals and `∫ x³/(e^x−1) dx = π⁴/15` are proved.
`hhbar` is `h = 2 π ℏ`.

Kind `bridge` on `PhysJS.StefanBoltzmann.stefan_boltzmann_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`. -/
theorem stefan_boltzmann_eq (σ h c hbar kB T : ℝ)
    (hh : 0 < h) (hc : 0 < c) (hk : 0 < kB) (hT : 0 < T) (hħ : 0 < hbar)
    (hhbar : h = 2 * π * hbar)
    (hσ : σ * T ^ 4 =
      (c * spectralEnergy h c kB T) / (4 * π) *
        (∫ φ in (0 : ℝ)..(2 * π), (1 : ℝ)) *
        (∫ θ in (0 : ℝ)..(π / 2), sin θ * cos θ)) :
    σ * 60 * hbar ^ 3 * c ^ 2 = π ^ 2 * kB ^ 4 ∧
      σ = 2 * π ^ 5 * kB ^ 4 / (15 * h ^ 3 * c ^ 2) := by
  have henergy := energy_density h c kB T hh hc hk hT
  have hang := hemisphere_integrals
  have hpi : π ≠ 0 := pi_ne_zero
  have hT0 : T ≠ 0 := hT.ne'
  have hflux : (c * ((8 * π * h / c ^ 3) * (kB * T / h) ^ 4 * (π ^ 4 / 15))) / (4 * π) *
      (2 * π) * (1 / 2) =
      2 * π ^ 5 * kB ^ 4 * T ^ 4 / (15 * h ^ 3 * c ^ 2) := by
    field_simp [hh.ne', hc.ne', hk.ne', hT0, hpi]
    ring
  have hσT : σ * T ^ 4 =
      2 * π ^ 5 * kB ^ 4 * T ^ 4 / (15 * h ^ 3 * c ^ 2) := by
    rw [hσ, hang.1, hang.2, henergy, hflux]
  have hσval : σ = 2 * π ^ 5 * kB ^ 4 / (15 * h ^ 3 * c ^ 2) := by
    have hmul := congrArg (fun z : ℝ => z / T ^ 4) hσT
    field_simp [pow_ne_zero 4 hT0] at hmul
    rw [eq_div_iff (by positivity : (15 : ℝ) * h ^ 3 * c ^ 2 ≠ 0)]
    simpa [mul_assoc] using hmul
  refine ⟨?_, hσval⟩
  rw [hσval, hhbar]
  field_simp [hc.ne', hħ.ne', hpi]
  ring

end PhysJS.StefanBoltzmann

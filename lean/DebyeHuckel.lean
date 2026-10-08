/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Slope
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-211`. Bridge. Debye–Hückel limiting law.

The catalog equation is

```
ln γ_± = −z² e² κ / (8 π ε₀ ε_r k_B T),    κ² = 2 N_A e² I / (ε₀ ε_r k_B T)
```

with `ε = ε₀ ε_r`. The derivation has three parts, all proved.

1. `charge_density_slope` / `kappa_sq_eq`: linearising the Boltzmann charge
   density `ρ(φ) = Σ n_i z_i e exp(−z_i e φ / k_B T)` about `φ = 0`, with
   electroneutrality `Σ n_i z_i = 0`, gives `ρ ≈ −ε κ² φ` with
   `κ² = Σ n_i z_i² e² / (ε k_B T) = 2 N_A e² I / (ε k_B T)`,
   `I = ½ Σ c_i z_i²`, `n_i = N_A c_i`. This is the linearised
   Poisson–Boltzmann equation `∇²φ = κ² φ`.
2. `screened_coulomb_solves`: `φ(r) = q exp(−κ r) / (4 π ε r)` solves its
   radial form `φ'' + 2 φ'/r = κ² φ` for `r > 0`.
3. `self_potential_limit` and `lnGamma_eq`: subtracting the bare Coulomb
   potential leaves a finite value at the ion, `−q κ / (4 π ε)`; charging the
   ion from `0` to `z e` costs `∫₀^{ze} (−q κ / (4 π ε)) dq = −(z e)² κ / (8 π ε)`,
   which divided by `k_B T` is `ln γ_±`. The `8 π` is the `4 π` of Coulomb
   times the `1/2` of the charging integral.

Scope: dilute solutions (point ions, linearised Poisson–Boltzmann, uniform
dielectric constant `ε_r`). `ln γ = work / (k_B T)` is the definition of the
activity coefficient and enters as a hypothesis. Not an extended
(Davies/Pitzer) law.
-/

namespace PhysJS.DebyeHuckel

open Real Set Filter Topology

/-- The Boltzmann charge density has slope `−Σ n_i z_i² e² / (k_B T)` at
`φ = 0`. -/
theorem charge_density_slope {ι : Type*} (s : Finset ι) (n z : ι → ℝ) (e kB T : ℝ) :
    HasDerivAt (fun φ : ℝ => ∑ i ∈ s, n i * z i * e * Real.exp (-(z i * e * φ) / (kB * T)))
      (-(∑ i ∈ s, n i * z i ^ 2 * e ^ 2) / (kB * T)) 0 := by
  have h : ∀ i ∈ s, HasDerivAt
      (fun φ : ℝ => n i * z i * e * Real.exp (-(z i * e * φ) / (kB * T)))
      (n i * z i * e * (-(z i * e) / (kB * T))) 0 := by
    intro i _
    have h1 : HasDerivAt (fun φ : ℝ => -(z i * e * φ) / (kB * T)) (-(z i * e) / (kB * T)) 0 := by
      have := (((hasDerivAt_id (0 : ℝ)).const_mul (z i * e)).neg).div_const (kB * T)
      simpa using this
    have := h1.exp.const_mul (n i * z i * e)
    refine this.congr_deriv ?_
    simp
  have := HasDerivAt.fun_sum h
  refine this.congr_deriv ?_
  calc ∑ i ∈ s, n i * z i * e * (-(z i * e) / (kB * T))
      = ∑ i ∈ s, (-(n i * z i ^ 2 * e ^ 2)) / (kB * T) := by
        apply Finset.sum_congr rfl
        intro i _
        ring
    _ = -(∑ i ∈ s, n i * z i ^ 2 * e ^ 2) / (kB * T) := by
        rw [← Finset.sum_div, Finset.sum_neg_distrib]

/-- Linearised Poisson–Boltzmann: with electroneutrality `Σ n_i z_i = 0`,
`n_i = N_A c_i` and ionic strength `I = ½ Σ c_i z_i²`, the charge density
vanishes at `φ = 0` and has slope `−ε κ²` with `κ² = 2 N_A e² I / (ε k_B T)`.

Point ions and
the linearised regime only. -/
theorem kappa_sq_eq {ι : Type*} (s : Finset ι) (c z : ι → ℝ) (NA e kB T ε I : ℝ)
    (hε : ε ≠ 0)
    (hneutral : ∑ i ∈ s, NA * c i * z i = 0)
    (hI : I = (1 / 2) * ∑ i ∈ s, c i * z i ^ 2) :
    (∑ i ∈ s, NA * c i * z i * e * Real.exp (-(z i * e * 0) / (kB * T)) = 0) ∧
    HasDerivAt
      (fun φ : ℝ => ∑ i ∈ s, NA * c i * z i * e * Real.exp (-(z i * e * φ) / (kB * T)))
      (-(ε * (2 * NA * e ^ 2 * I / (ε * (kB * T))))) 0 := by
  constructor
  · simp only [mul_zero, neg_zero, zero_div, Real.exp_zero, mul_one]
    rw [← Finset.sum_mul, hneutral, zero_mul]
  · have h := charge_density_slope s (fun i => NA * c i) z e kB T
    refine h.congr_deriv ?_
    have hsum : ∑ i ∈ s, NA * c i * z i ^ 2 * e ^ 2 = 2 * NA * e ^ 2 * I := by
      have h1 : ∑ i ∈ s, NA * c i * z i ^ 2 * e ^ 2 =
          NA * e ^ 2 * ∑ i ∈ s, c i * z i ^ 2 := by
        rw [Finset.mul_sum]
        apply Finset.sum_congr rfl
        intro i _
        ring
      rw [h1, hI]
      ring
    simp only [hsum]
    field_simp

/-- Radial linearised Poisson–Boltzmann: for `r > 0` the screened Coulomb
potential `φ(r) = A exp(−κ r) / r` (with `A = q / (4 π ε)`) has the first
and second derivatives below and satisfies `φ'' + 2 φ' / r = κ² φ`. -/
theorem screened_coulomb_solves (A κ r : ℝ) (hr : 0 < r) :
    HasDerivAt (fun x : ℝ => A * (Real.exp (-κ * x) * x⁻¹))
      (A * (-(Real.exp (-κ * r)) * (κ * r + 1) / r ^ 2)) r ∧
    HasDerivAt (fun x : ℝ => A * (-(Real.exp (-κ * x)) * (κ * x + 1) / x ^ 2))
      (A * (Real.exp (-κ * r) * (κ ^ 2 * r ^ 2 + 2 * κ * r + 2) / r ^ 3)) r ∧
    A * (Real.exp (-κ * r) * (κ ^ 2 * r ^ 2 + 2 * κ * r + 2) / r ^ 3) +
      2 / r * (A * (-(Real.exp (-κ * r)) * (κ * r + 1) / r ^ 2)) =
      κ ^ 2 * (A * (Real.exp (-κ * r) * r⁻¹)) := by
  have hr0 : r ≠ 0 := hr.ne'
  have hE : HasDerivAt (fun x : ℝ => Real.exp (-κ * x)) (Real.exp (-κ * r) * -κ) r := by
    have := ((hasDerivAt_id r).const_mul (-κ)).exp
    simpa using this
  refine ⟨?_, ?_, ?_⟩
  · have hinv : HasDerivAt (fun x : ℝ => x⁻¹) (-(r ^ 2)⁻¹) r := hasDerivAt_inv hr0
    have := (hE.mul hinv).const_mul A
    refine this.congr_deriv ?_
    field_simp
    ring
  · have hnum : HasDerivAt (fun x : ℝ => -(Real.exp (-κ * x)) * (κ * x + 1))
        (-(Real.exp (-κ * r) * -κ * (κ * r + 1) + Real.exp (-κ * r) * κ)) r := by
      have h2 : HasDerivAt (fun x : ℝ => κ * x + 1) κ r := by
        simpa using ((hasDerivAt_id r).const_mul κ).add_const 1
      have h3 := (hE.mul h2).neg
      refine (h3.congr_deriv (by ring)).congr_of_eventuallyEq ?_
      exact Filter.Eventually.of_forall fun x => by simp only [Pi.mul_apply, Pi.neg_apply]; ring
    have hden : HasDerivAt (fun x : ℝ => x ^ 2) (2 * r) r := by
      simpa using hasDerivAt_pow 2 r
    have := (hnum.div hden (pow_ne_zero 2 hr0)).const_mul A
    refine this.congr_deriv ?_
    field_simp
    ring
  · field_simp
    ring

/-- The potential minus the bare Coulomb potential is finite at the ion:
`(q / (4 π ε)) (exp(−κ r) − 1) / r → −q κ / (4 π ε)` as `r → 0⁺`. -/
theorem self_potential_limit (q κ ε : ℝ) :
    Tendsto (fun r : ℝ => q / (4 * π * ε) * (Real.exp (-κ * r) - 1) / r)
      (𝓝[>] 0) (𝓝 (-(q * κ) / (4 * π * ε))) := by
  have hE : HasDerivAt (fun x : ℝ => Real.exp (-κ * x)) (-κ) 0 := by
    have := ((hasDerivAt_id (0 : ℝ)).const_mul (-κ)).exp
    simpa using this
  have h := hE.tendsto_slope_zero_right
  have h2 := h.const_mul (q / (4 * π * ε))
  refine (h2.congr' ?_).trans_eq ?_
  · filter_upwards with r
    simp only [smul_eq_mul, zero_add, mul_zero, Real.exp_zero]
    ring
  · ring_nf

/-- Debye–Hückel limiting law from the charging integral.

`V q` is the finite part of the potential at an ion of charge `q`
(`hV`, a limit of the screened minus bare Coulomb potential). `hγ` is the
definition of the activity coefficient through the charging work,
`k_B T ln γ = ∫₀^{z e} V(q) dq`.

Linearised
Poisson–Boltzmann and point ions only. -/
theorem lnGamma_eq (lnγ κ ε kB T z e : ℝ) (V : ℝ → ℝ) (hε : 0 < ε) (hkT : 0 < kB * T)
    (hV : ∀ q : ℝ, Tendsto (fun r : ℝ => q / (4 * π * ε) * (Real.exp (-κ * r) - 1) / r)
      (𝓝[>] 0) (𝓝 (V q)))
    (hγ : kB * T * lnγ = ∫ q in (0 : ℝ)..(z * e), V q) :
    lnγ = -(z ^ 2 * e ^ 2 * κ) / (8 * π * ε * kB * T) := by
  have hVq : ∀ q, V q = -(κ / (4 * π * ε)) * q := by
    intro q
    have h := tendsto_nhds_unique (hV q) (self_potential_limit q κ ε)
    rw [h]; ring
  have hint : ∫ q in (0 : ℝ)..(z * e), V q = -(κ / (4 * π * ε)) * ((z * e) ^ 2 / 2) := by
    have : (fun q => V q) = fun q => -(κ / (4 * π * ε)) * q := funext hVq
    rw [this, intervalIntegral.integral_const_mul, integral_id]
    ring
  rw [hint] at hγ
  have hπ : π ≠ 0 := Real.pi_ne_zero
  have hkT0 : kB * T ≠ 0 := hkT.ne'
  have hε0 : ε ≠ 0 := hε.ne'
  have : lnγ = (-(κ / (4 * π * ε)) * ((z * e) ^ 2 / 2)) / (kB * T) := by
    rw [eq_div_iff hkT0]; linarith
  rw [this]
  have hkB : kB ≠ 0 := left_ne_zero_of_mul hkT0
  have hT : T ≠ 0 := right_ne_zero_of_mul hkT0
  field_simp
  ring

/-- Control: without the charging factor `1/2` the coefficient would be `4π`,
not `8π`. For `z e κ ≠ 0` the two laws differ. -/
theorem eight_pi_not_four_pi (z e κ ε kB T : ℝ) (hε : 0 < ε) (hkT : 0 < kB * T)
    (hzek : z * e * κ ≠ 0) :
    -(z ^ 2 * e ^ 2 * κ) / (8 * π * ε * kB * T) ≠ -(z ^ 2 * e ^ 2 * κ) / (4 * π * ε * kB * T) := by
  intro h
  have hπ : 0 < π := Real.pi_pos
  have hkB : kB ≠ 0 := left_ne_zero_of_mul hkT.ne'
  have hT : T ≠ 0 := right_ne_zero_of_mul hkT.ne'
  have hz : z ≠ 0 := by intro h0; apply hzek; rw [h0]; ring
  have he : e ≠ 0 := by intro h0; apply hzek; rw [h0]; ring
  have hκ : κ ≠ 0 := by intro h0; apply hzek; rw [h0]; ring
  field_simp at h
  apply hκ
  have h2 : z ^ 2 * e ^ 2 * κ = 0 := by nlinarith [h]
  rcases mul_eq_zero.mp h2 with h3 | h3
  · exact absurd h3 (mul_ne_zero (pow_ne_zero 2 hz) (pow_ne_zero 2 he))
  · exact h3

end PhysJS.DebyeHuckel

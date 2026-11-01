/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Arrhenius
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Slope
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Order.Filter.AtTopBot.Field
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring
import Mathlib.Topology.Algebra.InfiniteSum.Ring

/-!
`be-148`. Bridge. Eyring rate from transition-state theory, and its Arrhenius slope.

The catalog equation is

```
k = (k_B T / h) exp(−ΔG‡ / (k_B T))
```

`eyring_eq` derives it. The activated complex is in quasi-equilibrium with
the reactants, with the molecular Gibbs isotherm `ΔG‡ = −k_B T ln K‡`. It
crosses the barrier along a reaction coordinate that is a vibration of
frequency `ν`, so the rate is `ν q(ν) K‡` with the oscillator partition
function `q(ν) = 1 / (1 − exp(−h ν / (k_B T)))`. `partition_geometric` proves
that sum from a geometric series. `classical_limit` proves `ν q(ν) → k_B T / h`
as `ν → 0`; `stiff_limit` has `q(ν) → 1` as `ν → ∞`. `barrier_zero_limit` is
the vanishing barrier. For a molar barrier, `molar_matches_molecular` follows
from `eyring_eq` and `PhysJS.Arrhenius.molar_exponent`, not from assuming the
Eyring formula. The effective Arrhenius energy is `Ea = ΔH‡ + R T`;
`exp_minus_one_gap` records the `exp(−1)` mismatch. The transmission
coefficient is `1`.
-/

namespace PhysJS.Eyring

open PhysJS.Arrhenius
open Filter
open scoped Real

/-- Vibrational partition function as a geometric series, for `x > 0`. -/
theorem partition_geometric (x : ℝ) (hx : 0 < x) :
    (1 : ℝ) / (1 - Real.exp (-x)) = ∑' n : ℕ, Real.exp (-(n : ℝ) * x) := by
  let r : ℝ := Real.exp (-x)
  have hrpos : 0 ≤ r := (Real.exp_pos _).le
  have hr : ‖r‖ < 1 := by
    rw [Real.norm_of_nonneg hrpos, Real.exp_lt_one_iff]
    linarith
  have hgeom : ∑' n : ℕ, r ^ n = (1 - r)⁻¹ := tsum_geometric_of_norm_lt_one hr
  have hterm : ∀ n : ℕ, r ^ n = Real.exp (-(n : ℝ) * x) := by
    intro n
    rw [show r = Real.exp (-x) by rfl, ← Real.exp_nat_mul]
    ring_nf
  have hsum : ∑' n : ℕ, Real.exp (-(n : ℝ) * x) = (1 - r)⁻¹ := by
    rw [← tsum_congr hterm, hgeom]
  rw [hsum]
  have hden : 1 - r ≠ 0 := by
    have : r < 1 := by
      have hnorm := hr
      rwa [Real.norm_of_nonneg hrpos] at hnorm
    linarith
  simp only [r, Real.exp_neg]
  field_simp [hden]

/-- `ν / (1 − exp(−a ν)) → 1 / a` as `ν → 0`, for `a > 0`. -/
theorem classical_limit (a : ℝ) (ha : 0 < a) :
    Filter.Tendsto (fun ν : ℝ => ν * (1 / (1 - Real.exp (-(a * ν)))))
      (nhdsWithin 0 {0}ᶜ) (nhds a⁻¹) := by
  have hlin : HasDerivAt (fun ν : ℝ => -(a * ν)) (-a) 0 :=
    (((hasDerivAt_id' 0).const_mul a).neg).congr_deriv (by ring)
  have hf : HasDerivAt (fun ν : ℝ => 1 - Real.exp (-(a * ν))) a 0 :=
    (((Real.hasDerivAt_exp _).comp 0 hlin).const_sub 1).congr_deriv (by simp)
  have hslope := (hasDerivAt_iff_tendsto_slope.mp hf).inv₀ ha.ne'
  refine hslope.congr (fun ν => ?_)
  rw [slope_def_field, inv_div]
  simp [div_eq_mul_inv]

/-- `q(ν) → 1` along a stiff reaction coordinate (`ν → ∞`). -/
theorem stiff_limit (a : ℝ) (ha : 0 < a) :
    Tendsto (fun ν : ℝ => 1 / (1 - Real.exp (-a * ν))) atTop (nhds 1) := by
  have hlim : Tendsto (fun ν => Real.exp (-a * ν)) atTop (nhds 0) :=
    Real.tendsto_exp_atBot.comp ((tendsto_const_mul_atBot_of_neg (neg_lt_zero.mpr ha)).mpr tendsto_id)
  have hden : Tendsto (fun ν : ℝ => (1 : ℝ) - Real.exp (-a * ν)) atTop (nhds 1) := by
    simpa [sub_zero] using
      (tendsto_const_nhds : Tendsto (fun _ : ℝ => (1 : ℝ)) atTop (nhds 1)).sub hlim
  have hinv : Tendsto (fun ν => (1 - Real.exp (-a * ν))⁻¹) atTop (nhds 1⁻¹) :=
    hden.inv₀ (by simp)
  simpa [one_div] using hinv

/-- Vanishing activation Gibbs energy leaves the universal prefactor. -/
theorem barrier_zero_limit (kB T hpl : ℝ) (hkB : 0 < kB) (hT : 0 < T) (hh : 0 < hpl) :
    (kB * T / hpl) * Real.exp (-(0 : ℝ) / (kB * T)) = kB * T / hpl := by
  field_simp [hkB.ne', hT.ne', hh.ne']
  simp [Real.exp_zero]

/-- Transition-state rate in the classical limit of the reaction coordinate.

`hG` is the molecular Gibbs isotherm `ΔG‡ = −k_B T ln K‡` of the activated
complex. `hk` is the rate `ν q(ν) K‡` with the vibrational partition
function `q(ν) = 1 / (1 − exp(−h ν / (k_B T)))`. `h` in the module is the
Planck constant `hpl`. -/
theorem eyring_eq (k : ℝ → ℝ) (K hpl dG kB T : ℝ) (hh : 0 < hpl) (hkB : 0 < kB) (hT : 0 < T)
    (hK : 0 < K) (hG : dG = -(kB * T) * Real.log K)
    (hk : ∀ ν, k ν = ν * (1 / (1 - Real.exp (-(hpl * ν / (kB * T))))) * K) :
    K = Real.exp (-dG / (kB * T)) ∧
      Filter.Tendsto k (nhdsWithin 0 {0}ᶜ)
        (nhds ((kB * T / hpl) * Real.exp (-dG / (kB * T)))) := by
  have hkT : 0 < kB * T := mul_pos hkB hT
  have hKexp : K = Real.exp (-dG / (kB * T)) := by
    rw [hG, show -(-(kB * T) * Real.log K) / (kB * T) = Real.log K by field_simp,
      Real.exp_log hK]
  refine ⟨hKexp, ?_⟩
  have ha : 0 < hpl / (kB * T) := div_pos hh hkT
  have hfun : k = fun ν => ν * (1 / (1 - Real.exp (-(hpl / (kB * T) * ν)))) * K := by
    funext ν
    rw [hk ν, show hpl * ν / (kB * T) = hpl / (kB * T) * ν by ring]
  have hlim := (classical_limit _ ha).mul_const K
  rw [inv_div] at hlim
  rw [hfun, ← hKexp]
  exact hlim

/-- Molar and molecular barriers agree when `R = N_A k_B` and `ΔG_molar = N_A ΔG`.

Derived from `eyring_eq` and `PhysJS.Arrhenius.molar_exponent`; the Eyring
formula is not assumed. -/
theorem molar_matches_molecular (k : ℝ → ℝ) (K dG dGmol R T NA kB hpl : ℝ)
    (hNA : NA ≠ 0) (hR : R = NA * kB) (hmol : dGmol = NA * dG)
    (hh : 0 < hpl) (hkB : 0 < kB) (hT : 0 < T) (hK : 0 < K)
    (hG : dG = -(kB * T) * Real.log K)
    (hk : ∀ ν, k ν = ν * (1 / (1 - Real.exp (-(hpl * ν / (kB * T))))) * K) :
    Filter.Tendsto k (nhdsWithin 0 {0}ᶜ)
      (nhds ((kB * T / hpl) * Real.exp (-dGmol / (R * T)))) := by
  have hlim := (eyring_eq k K hpl dG kB T hh hkB hT hK hG hk).2
  convert hlim using 1
  rw [molar_exponent dGmol R T NA kB dG hR (by rw [hmol]; field_simp [hNA])]

theorem exp_shift (dH R T : ℝ) (hR : R ≠ 0) (hT : T ≠ 0) :
    Real.exp (-(dH + R * T) / (R * T)) = Real.exp (-1) * Real.exp (-dH / (R * T)) := by
  rw [show -(dH + R * T) / (R * T) = -dH / (R * T) - 1 by field_simp [hR, hT]; ring]
  rw [show (-dH / (R * T) - 1) = (-dH / (R * T)) + (-1 : ℝ) by ring]
  rw [Real.exp_add, Real.exp_neg]
  ring

theorem exp_minus_one_gap (dH dS R kB hpl T : ℝ) (hR : R ≠ 0) (hT : T ≠ 0) :
    (kB * T / hpl) * Real.exp (dS / R) * Real.exp (-(dH + R * T) / (R * T)) =
      Real.exp (-1) *
        ((kB * T / hpl) * Real.exp (dS / R) * Real.exp (-dH / (R * T))) := by
  rw [exp_shift dH R T hR hT]
  ring

theorem exp_minus_one_gap_ne (dH dS R kB hpl T : ℝ) (hR : R ≠ 0) (hT : T ≠ 0)
    (hpre : kB * T / hpl ≠ 0) (hS : Real.exp (dS / R) ≠ 0) :
    (kB * T / hpl) * Real.exp (dS / R) * Real.exp (-(dH + R * T) / (R * T)) ≠
      (kB * T / hpl) * Real.exp (dS / R) * Real.exp (-dH / (R * T)) := by
  have hexp : Real.exp (-1) ≠ (1 : ℝ) := by
    intro h
    have h0 := Real.exp_injective (h.trans Real.exp_zero.symm)
    norm_num at h0
  intro hEq
  have hbase : (kB * T / hpl) * Real.exp (dS / R) * Real.exp (-dH / (R * T)) ≠ 0 := by
    exact mul_ne_zero (mul_ne_zero hpre hS) (Real.exp_ne_zero _)
  suffices Real.exp (-1) = 1 by exact hexp this
  apply mul_right_cancel₀ hbase
  linarith [hEq, exp_minus_one_gap dH dS R kB hpl T hR hT]

/-- Logarithmic derivative of the Eyring rate at constant `ΔH‡` and `ΔS‡`.

`k(t) = (k_B t / h) exp(ΔS‡ / R) exp(−ΔH‡ / (R t))`. The effective
Arrhenius energy `R T² d(ln k)/dT` equals `ΔH‡ + R T`. It is not the
exponent in a temperature-independent prefactor. This file does not
interchange `d/dT` with `ν → 0`. -/
theorem effective_arrhenius (k : ℝ → ℝ) (hpl dH dS R kB T Ea : ℝ)
    (hR : R ≠ 0) (_hkB : kB ≠ 0) (_hh : hpl ≠ 0) (hT : T ≠ 0)
    (hpre : 0 < kB / hpl) (_hS : Real.exp (dS / R) ≠ 0)
    (hk : ∀ t, t ≠ 0 →
      k t = (kB * t / hpl) * Real.exp (dS / R) * Real.exp (-dH / (R * t)))
    (_hpos : ∀ t, t ≠ 0 → 0 < k t)
    (hEa : Ea = R * T ^ 2 * deriv (fun t => Real.log (k t)) T) :
    Ea = dH + R * T := by
  have hden : R * T ≠ 0 := mul_ne_zero hR hT
  let pref : ℝ := (kB / hpl) * Real.exp (dS / R)
  have hpref : 0 < pref := mul_pos hpre (Real.exp_pos _)
  have hlog : ∀ t, t ≠ 0 →
      Real.log (k t) = Real.log pref + Real.log t + (-dH / R) * t⁻¹ := by
    intro t ht
    have hkt : k t = pref * t * Real.exp (-dH / (R * t)) := by
      rw [hk t ht]
      simp only [pref, div_eq_mul_inv]
      ring
    have htpos_or : t ≠ 0 := ht
    rw [hkt, Real.log_mul (mul_ne_zero hpref.ne' htpos_or) (Real.exp_ne_zero _),
      Real.log_mul hpref.ne' htpos_or, Real.log_exp]
    field_simp [hR, ht]
  have hfun : (fun t => Real.log (k t)) =ᶠ[nhds T]
      fun t => Real.log pref + Real.log t + (-dH / R) * t⁻¹ := by
    filter_upwards [eventually_ne_nhds hT] with t ht
    exact hlog t ht
  have hlogt : HasDerivAt Real.log T⁻¹ T := Real.hasDerivAt_log hT
  have hinv : HasDerivAt (fun t : ℝ => t⁻¹) (-(T ^ 2)⁻¹) T := hasDerivAt_inv hT
  have hlin := hinv.const_mul (-dH / R)
  have hsum := ((hasDerivAt_const T (Real.log pref)).add hlogt).add hlin
  have hderiv : HasDerivAt (fun t => Real.log (k t))
      (T⁻¹ + (-dH / R) * (-(T ^ 2)⁻¹)) T := by
    exact hsum.congr_of_eventuallyEq hfun |>.congr_deriv (by ring)
  have hval : deriv (fun t => Real.log (k t)) T = 1 / T + dH / (R * T ^ 2) := by
    rw [hderiv.deriv]
    field_simp [hT, hR]
  rw [hEa, hval]
  field_simp [hT, hR]
  ring

end PhysJS.Eyring

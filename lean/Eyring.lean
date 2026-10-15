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
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

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
function `q(ν) = 1 / (1 − exp(−h ν / (k_B T)))`. `classical_limit` proves
`ν q(ν) → k_B T / h` as `ν → 0`: the loose reaction coordinate fixes the
universal frequency `k_B T / h`, and the limit of the rate is the Eyring
formula. For a molar barrier, `R = N_A k_B` identifies it with the molecular
exponential through `PhysJS.Arrhenius.molar_exponent`, the step
`PhysJS.Arrhenius.arrhenius_eq` uses. The effective Arrhenius energy is the
logarithmic derivative

```
Ea = R T² d(ln k)/dT = ΔH‡ + R T
```

when `ΔG‡ = ΔH‡ − T ΔS‡` with `ΔH‡` and `ΔS‡` constant. That `Ea` is not
the constant in `k = A exp(−Ea / (R T))` at the same `A = (k_B T / h) exp(ΔS‡ / R)`:
those two substitutions differ by `exp(−1)`. The transmission coefficient
is `1`.
-/

namespace PhysJS.Eyring

open PhysJS.Arrhenius

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

This is the `R = N_A k_B` step `PhysJS.Arrhenius.molar_exponent` of
`PhysJS.Arrhenius.arrhenius_eq`, with prefactor `k_B T / h`. -/
theorem molar_matches_molecular (k A dGmol dG R T NA kB hpl : ℝ)
    (hNA : NA ≠ 0) (hR : R = NA * kB) (hmol : dGmol = NA * dG)
    (hA : A = kB * T / hpl)
    (hk : k = A * Real.exp (-dGmol / (R * T))) :
    k = (kB * T / hpl) * Real.exp (-dG / (kB * T)) := by
  rw [hk, hA, molar_exponent dGmol R T NA kB dG hR (by rw [hmol]; field_simp [hNA])]

/-- Logarithmic derivative of the Eyring rate at constant `ΔH‡` and `ΔS‡`.

`k(t) = (k_B t / h) exp(ΔS‡ / R) exp(−ΔH‡ / (R t))`. The effective
Arrhenius energy `R T² d(ln k)/dT` equals `ΔH‡ + R T`. It is not the
exponent in a temperature-independent prefactor. -/
theorem effective_arrhenius (k : ℝ → ℝ) (hpl dH dS R kB T Ea : ℝ)
    (hR : R ≠ 0) (hkB : kB ≠ 0) (hh : hpl ≠ 0) (hT : T ≠ 0)
    (hpre : 0 < kB / hpl) (hS : Real.exp (dS / R) ≠ 0)
    (hk : ∀ t, t ≠ 0 →
      k t = (kB * t / hpl) * Real.exp (dS / R) * Real.exp (-dH / (R * t)))
    (hpos : ∀ t, t ≠ 0 → 0 < k t)
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

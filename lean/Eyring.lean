/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.Arrhenius
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.ExpDeriv
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-148`. Bridge. Eyring rate, and its Arrhenius slope.

The catalog equation is

```
k = (k_B T / h) exp(−ΔG‡ / (k_B T))
```

`eyring_eq` is that formula. For a molar barrier, `R = N_A k_B` identifies
it with the molecular exponential, the same bridge as
`PhysJS.Arrhenius.arrhenius_eq`. The effective Arrhenius energy is the
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

/-- Eyring rate. `h` in the module is the Planck constant `hpl`.

Kind `bridge` on `PhysJS.Eyring.eyring_eq`, once the catalog entry exists.
The covers line still begins with `derivation-step`. -/
theorem eyring_eq (k hpl dG kB T : ℝ) (hh : hpl ≠ 0) (hkB : kB ≠ 0) (hT : 0 < T)
    (hk : k = (kB * T / hpl) * Real.exp (-dG / (kB * T))) :
    k * hpl * Real.exp (dG / (kB * T)) = kB * T := by
  have hkT : kB * T ≠ 0 := mul_ne_zero hkB hT.ne'
  rw [hk]
  field_simp [hh, hkT]
  rw [← Real.exp_add]
  ring_nf
  exact Real.exp_zero

/-- Molar and molecular barriers agree when `R = N_A k_B` and `ΔG_molar = N_A ΔG`.

This is `PhysJS.Arrhenius.arrhenius_eq` with prefactor `k_B T / h`. -/
theorem molar_matches_molecular (k A dGmol dG R T NA kB hpl : ℝ)
    (hT : 0 < T) (hNA : NA ≠ 0) (hkB : kB ≠ 0) (hh : hpl ≠ 0)
    (hR : R = NA * kB) (hmol : dGmol = NA * dG)
    (hA : A = kB * T / hpl)
    (hk : k = A * Real.exp (-dGmol / (R * T))) :
    k = (kB * T / hpl) * Real.exp (-dG / (kB * T)) := by
  have hpair := arrhenius_eq k A dGmol R T NA kB dG hT hNA hkB hR
    (by rw [hmol]; field_simp [hNA]) hk
  rw [hpair.2, hA]

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

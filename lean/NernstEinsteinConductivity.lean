/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-215`. Bridge. Nernst–Einstein ionic conductivity.

The catalog equations are

```
Λ = z² e² D / (k_B T)          (per ion, conductivity per unit number density)
Λ_m = z² F² D / (R T)          (molar, F = N_A e, R = N_A k_B)
```

`einstein_from_boltzmann` derives the ionic mobility `u = z e D / (k_B T)`
(velocity per unit field, signed with the charge) from the vanishing of the
net flux in a Boltzmann equilibrium profile: the flux is
`J = n u E − D n'` and the profile `n ∝ exp(−z e φ / k_B T)`, `E = −φ'`,
has `n' = (z e E / k_B T) n`. `conductivity_eq` is the current density
`j = z e n v` with `v = u E`, so `σ = n z² e² D / (k_B T)`.
`molar_eq` converts to molar quantities (`n = N_A c`, `Λ_m = σ / c`).

Scope: infinite dilution, no ion pairing, one species, a constant diffusion
coefficient. Not a derivation of `D`. `sign_independent` and
`signed_form_wrong` record that the conductivity is even in `z` (a linear
`z` would make anions conduct negatively); `sodium_numbers` evaluates the
tabulated Na⁺ value (`5.0 mS m²/mol`).
-/

namespace PhysJS.NernstEinsteinConductivity

/-- Mobility from zero net flux in a Boltzmann profile.

`hflux`: `n u E − D n' = 0`. `hprof`: `n' = (z e E / (k_B T)) n`. -/
theorem einstein_from_boltzmann (u D n n' E z e kB T : ℝ)
    (hn : n ≠ 0) (hE : E ≠ 0)
    (hflux : n * u * E - D * n' = 0)
    (hprof : n' = z * e * E / (kB * T) * n) :
    u = z * e * D / (kB * T) := by
  rw [hprof] at hflux
  have h : n * E * (u - z * e * D / (kB * T)) = 0 := by
    linear_combination hflux
  have hnE : n * E ≠ 0 := mul_ne_zero hn hE
  have := (mul_eq_zero.mp h).resolve_left hnE
  linarith

/-- Conductivity per ion type from the Nernst–Einstein mobility.

`hj`: `j = z e n v`, `hv`: `v = u E`, `hσ`: `σ = j / E`.

Kind `bridge` on `PhysJS.NernstEinsteinConductivity.conductivity_eq`, once the
catalog entry exists. The covers line still begins with `derivation-step`.
Not a derivation of `D`. -/
theorem conductivity_eq (σ j v u E n z e D kB T : ℝ) (hE : E ≠ 0)
    (hu : u = z * e * D / (kB * T))
    (hv : v = u * E) (hj : j = z * e * n * v) (hσ : σ = j / E) :
    σ = n * z ^ 2 * e ^ 2 * D / (kB * T) := by
  rw [hσ, hj, hv, hu]
  by_cases hkT : kB * T = 0
  · simp [hkT]
  · field_simp

/-- Molar conductivity: `Λ_m = z² F² D / (R T)`, with `F = N_A e`,
`R = N_A k_B`, `n = N_A c` and `σ = c Λ_m`. -/
theorem molar_eq (Λm σ c n z e D kB T NA F R : ℝ) (hc : c ≠ 0) (hNA : NA ≠ 0)
    (hkB : kB ≠ 0) (hT : T ≠ 0)
    (hF : F = NA * e) (hR : R = NA * kB) (hn : n = NA * c)
    (hσ : σ = n * z ^ 2 * e ^ 2 * D / (kB * T)) (hΛ : σ = c * Λm) :
    Λm = z ^ 2 * F ^ 2 * D / (R * T) := by
  have h : c * Λm = c * (z ^ 2 * F ^ 2 * D / (R * T)) := by
    rw [← hΛ, hσ, hn, hF, hR]
    field_simp
  exact mul_left_cancel₀ hc h

/-- The whole chain: Boltzmann equilibrium, Einstein mobility, drift current,
and molar conversion give `Λ_m = z² F² D / (R T)`.

Kind `bridge` on `PhysJS.NernstEinsteinConductivity.molar_conductivity_eq`, once
the catalog entry exists. The covers line still begins with `derivation-step`.
Infinite dilution only. -/
theorem molar_conductivity_eq (Λm σ j v u D n n' E c z e kB T NA F R : ℝ)
    (hn0 : n ≠ 0) (hE : E ≠ 0) (hc : c ≠ 0) (hNA : NA ≠ 0) (hkB : kB ≠ 0) (hT : T ≠ 0)
    (hflux : n * u * E - D * n' = 0)
    (hprof : n' = z * e * E / (kB * T) * n)
    (hv : v = u * E) (hj : j = z * e * n * v) (hσ : σ = j / E)
    (hF : F = NA * e) (hR : R = NA * kB) (hn : n = NA * c) (hΛ : σ = c * Λm) :
    Λm = z ^ 2 * F ^ 2 * D / (R * T) := by
  have hu := einstein_from_boltzmann u D n n' E z e kB T hn0 hE hflux hprof
  have hs := conductivity_eq σ j v u E n z e D kB T hE hu hv hj hσ
  exact molar_eq Λm σ c n z e D kB T NA F R hc hNA hkB hT hF hR hn hs hΛ

/-- The conductivity is even in the charge number. -/
theorem sign_independent (n z e D kB T : ℝ) :
    n * (-z) ^ 2 * e ^ 2 * D / (kB * T) = n * z ^ 2 * e ^ 2 * D / (kB * T) := by
  ring

/-- Control: a conductivity linear in `z` would be negative for anions
(`D > 0`, `kB T > 0`, `n > 0`, `e ≠ 0`), while the derived one is positive. -/
theorem signed_form_wrong (n e D kB T : ℝ) (hn : 0 < n) (he : e ≠ 0) (hD : 0 < D)
    (hkT : 0 < kB * T) :
    n * (-1) * e ^ 2 * D / (kB * T) < 0 ∧ 0 < n * (-1) ^ 2 * e ^ 2 * D / (kB * T) := by
  have he2 : 0 < e ^ 2 := by positivity
  constructor
  · have : 0 < n * e ^ 2 * D / (kB * T) := by positivity
    have e1 : n * (-1) * e ^ 2 * D / (kB * T) = -(n * e ^ 2 * D / (kB * T)) := by ring
    linarith
  · positivity

/-- Evaluated: Na⁺ at 298.15 K, `D = 1.33e-9 m²/s`, `F = 96485.33212`,
`R = 8.314462618` gives about `4.995e-3 S m²/mol`. -/
theorem sodium_numbers :
    (49 / 10000 : ℝ) < 1 ^ 2 * (96485.33212 : ℝ) ^ 2 * (133 / 100000000000) /
        (8.314462618 * 298.15) ∧
    1 ^ 2 * (96485.33212 : ℝ) ^ 2 * (133 / 100000000000) / (8.314462618 * 298.15) <
      (51 / 10000 : ℝ) := by
  constructor <;> norm_num

end PhysJS.NernstEinsteinConductivity

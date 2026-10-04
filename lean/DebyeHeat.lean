/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-90`. Bridge. Debye `T³` law, from the Bose integral as a premise.

The catalog equation is

```
C_V = (12 π⁴ / 5) N k_B (T / θ_D)³
```

for `T ≪ θ_D`. `debye_heat` does not evaluate `∫₀^∞ x³/(exp(x)−1) dx`.
That value is the hypothesis `I = π⁴/15`. The Debye energy that uses it,
with the integral extended to infinity, is the hypothesis

```
U = 9 N k_B T (T / θ_D)³ I
```

`mode_normalization` is the algebra that makes `9` count three branches:
`∫₀^{ω_D} 9 N ω² / ω_D³ dω = 3 N`. Nine times `π⁴/15` is `3 π⁴/5`.
`U ∝ T⁴`, so the temperature derivative supplies the extra `4` and the heat
capacity is `12 π⁴/5`. Stopping at the energy leaves `3 π⁴/5`. The phonon
integral, the extension to infinity, and `π⁴/15` are hypotheses.
-/

namespace PhysJS.DebyeHeat

open intervalIntegral

/-- Three branches: the `ω²` density with prefactor `9` integrates to `3 N`. -/
theorem mode_normalization (N ωD : ℝ) (hω : ωD ≠ 0) :
    (∫ ω in (0 : ℝ)..ωD, (9 * N / ωD ^ 3) * ω ^ 2) = 3 * N := by
  rw [intervalIntegral.integral_const_mul, integral_pow]
  have h0 : (0 : ℝ) ^ 3 = 0 := by norm_num
  rw [h0, sub_zero]
  field_simp [hω]
  ring

/-- `9 · (π⁴/15) = 3 π⁴/5`. -/
theorem energy_prefactor (U N kB T θ I : ℝ) (hθ : θ ≠ 0)
    (hU : U = 9 * N * kB * T * (T / θ) ^ 3 * I)
    (hI : I = Real.pi ^ 4 / 15) :
    U = (3 * Real.pi ^ 4 / 5) * N * kB * T * (T / θ) ^ 3 := by
  rw [hU, hI]
  field_simp [hθ]
  ring

/-- Differentiating `A T⁴` multiplies by `4`. -/
theorem quartic_heat (U : ℝ → ℝ) (A T C : ℝ)
    (hU : ∀ t, U t = A * t ^ 4)
    (hC : HasDerivAt U C T) :
    C = 4 * A * T ^ 3 := by
  have hfun : U = fun t => A * t ^ 4 := funext hU
  rw [hfun] at hC
  have hpow : HasDerivAt (fun t : ℝ => t ^ 4) (4 * T ^ 3) T := by
    simpa using hasDerivAt_pow 4 T
  exact hC.unique ((hpow.const_mul A).congr_deriv (by ring))

/-- Debye heat capacity at low temperature.

`hU` is the Debye energy with the Bose integral extended to infinity.
`hI` is `∫₀^∞ x³/(exp(x)−1) dx = π⁴/15`, not proved in this file.
`hquart` writes that energy as `A T⁴`, and `hC` is `dU/dT`.

Kind `bridge` on `PhysJS.DebyeHeat.debye_heat`, once the catalog entry
exists. The covers line still begins with `derivation-step`. Not an
evaluation of the Bose integral. -/
theorem debye_heat
    (U : ℝ → ℝ) (N kB T θ I A C : ℝ)
    (hθ : θ ≠ 0) (hT : T ≠ 0)
    (hU : ∀ t, t ≠ 0 → U t = 9 * N * kB * t * (t / θ) ^ 3 * I)
    (hI : I = Real.pi ^ 4 / 15)
    (hquart : ∀ t, U t = A * t ^ 4)
    (hA : A = (3 * Real.pi ^ 4 / 5) * N * kB / θ ^ 3)
    (hC : HasDerivAt U C T) :
    C = (12 * Real.pi ^ 4 / 5) * N * kB * (T / θ) ^ 3 := by
  have hCval := quartic_heat U A T C hquart hC
  have hmatch : U T = (3 * Real.pi ^ 4 / 5) * N * kB * T * (T / θ) ^ 3 :=
    energy_prefactor (U T) N kB T θ I hθ (hU T hT) hI
  have hAT : A * T ^ 4 = (3 * Real.pi ^ 4 / 5) * N * kB * T * (T / θ) ^ 3 := by
    rw [← hquart T, hmatch]
  rw [hCval, hA]
  have hpow : T ^ 4 / θ ^ 3 = T * (T / θ) ^ 3 := by
    field_simp [hθ]
  calc
    4 * ((3 * Real.pi ^ 4 / 5) * N * kB / θ ^ 3) * T ^ 3
        = (12 * Real.pi ^ 4 / 5) * N * kB * (T ^ 3 / θ ^ 3) := by ring
    _ = (12 * Real.pi ^ 4 / 5) * N * kB * (T / θ) ^ 3 := by
      field_simp [hθ]

/-- The energy prefactor `3 π⁴/5` is not the heat-capacity prefactor. -/
theorem energy_not_heat (N kB coeff : ℝ) (hN : N ≠ 0) (hk : kB ≠ 0) (hcoeff : coeff ≠ 0) :
    (3 * Real.pi ^ 4 / 5) * N * kB * coeff ≠ (12 * Real.pi ^ 4 / 5) * N * kB * coeff := by
  intro hEq
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  field_simp [hN, hk, hcoeff, hπ] at hEq
  norm_num at hEq

end PhysJS.DebyeHeat

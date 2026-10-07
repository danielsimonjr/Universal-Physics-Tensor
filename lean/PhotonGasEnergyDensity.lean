/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-223`. Bridge. Photon-gas energy density and the CMB temperature scaling.

The catalog equations are

```
u = (π²/15) (k_B T)⁴ / (ℏ c)³ = (4σ/c) T⁴
T(z) = T₀ (1 + z)
```

Premises (hypotheses): mode counting in a cavity gives
`u = I (k_B T)⁴ / (π² (ℏ c)³)` with the dimensionless Bose integral
`I = ∫ x³/(eˣ − 1) dx` (`hu`); its value `I = π⁴/15` is taken as a
hypothesis (`hI`, the closed-form evaluation is not repeated here); the
Stefan-Boltzmann constant is `σ = π² k_B⁴ / (60 ℏ³ c²)` (`hσ`).

`energy_density_eq` derives both catalog forms. For the scaling, photon
number is conserved in comoving volume, so with the equilibrium
number density `n = β T³` (`β > 0` a constant of the Bose-Einstein
distribution) `n(z) = n₀ (1 + z)³` gives `T(z) = T₀ (1 + z)`
(`temperature_scaling`) and `u(z) = u₀ (1 + z)⁴` (`energy_scaling`).

Premises: thermal equilibrium, no spectral distortion, adiabatic
expansion with conserved photon number. Not a computation of `I`, and
the 4.17e-14 J/m³ figure at 2.725 K is not evaluated. Radiation scales as
`(1 + z)⁴`, matter as `(1 + z)³` (`radiation_vs_matter`).
-/

namespace PhysJS.PhotonGasEnergyDensity

open Real

/-- Both catalog forms of the photon-gas energy density. -/
theorem energy_density_eq (u I k T ħ c σ : ℝ) (hk : 0 < k) (hT : 0 < T) (hħ : 0 < ħ)
    (hc : 0 < c)
    (hu : u = I * (k * T) ^ 4 / (π ^ 2 * (ħ * c) ^ 3))
    (hI : I = π ^ 4 / 15)
    (hσ : σ = π ^ 2 * k ^ 4 / (60 * ħ ^ 3 * c ^ 2)) :
    u = π ^ 2 / 15 * (k * T) ^ 4 / (ħ * c) ^ 3 ∧ u = 4 * σ / c * T ^ 4 := by
  have hpi : 0 < π := Real.pi_pos
  have hpi0 : π ≠ 0 := hpi.ne'
  have hħ0 : ħ ≠ 0 := hħ.ne'
  have hc0 : c ≠ 0 := hc.ne'
  constructor
  · rw [hu, hI]; field_simp
  · rw [hu, hI, hσ]; field_simp; ring

/-- Number conservation and `n = β T³` give `T(z) = T₀ (1 + z)`. -/
theorem temperature_scaling (β T T₀ z n n₀ : ℝ) (hβ : 0 < β) (hT : 0 < T) (hT₀ : 0 < T₀)
    (hz : 0 ≤ z) (hn : n = β * T ^ 3) (hn₀ : n₀ = β * T₀ ^ 3)
    (hcons : n = n₀ * (1 + z) ^ 3) :
    T = T₀ * (1 + z) := by
  have h : T ^ 3 = (T₀ * (1 + z)) ^ 3 := by
    have : β * T ^ 3 = β * (T₀ ^ 3 * (1 + z) ^ 3) := by
      rw [← hn, hcons, hn₀]; ring
    rw [mul_pow]
    exact mul_left_cancel₀ hβ.ne' this
  exact (pow_left_inj₀ hT.le (by positivity) (by norm_num : (3 : ℕ) ≠ 0)).mp h

/-- With `u = a T⁴` and `T = T₀ (1 + z)`, `u(z) = u₀ (1 + z)⁴`. -/
theorem energy_scaling (a T T₀ z u u₀ : ℝ) (hu : u = a * T ^ 4) (hu₀ : u₀ = a * T₀ ^ 4)
    (hT : T = T₀ * (1 + z)) : u = u₀ * (1 + z) ^ 4 := by
  rw [hu, hu₀, hT]; ring

/-- Negative control: matter dilution `(1 + z)³` is not the radiation law for `z > 0`. -/
theorem radiation_vs_matter (z : ℝ) (hz : 0 < z) : (1 + z) ^ 3 ≠ (1 + z) ^ 4 := by
  intro h
  have h1 : 0 < 1 + z := by linarith
  have : (1 + z) ^ 3 * (1 + z - 1) = 0 := by nlinarith [h]
  have h3 : (1 + z) ^ 3 ≠ 0 := by positivity
  rcases mul_eq_zero.mp this with h' | h'
  · exact h3 h'
  · linarith

/-- The Bose integral matters: a different value of `I` gives a different prefactor. -/
theorem coefficient_not_fixed (I k T ħ c : ℝ) (hk : 0 < k) (hT : 0 < T) (hħ : 0 < ħ)
    (hc : 0 < c) (hI : I ≠ π ^ 4 / 15) :
    I * (k * T) ^ 4 / (π ^ 2 * (ħ * c) ^ 3) ≠
      π ^ 2 / 15 * (k * T) ^ 4 / (ħ * c) ^ 3 := by
  have hpi : 0 < π := Real.pi_pos
  have hpi0 : π ≠ 0 := hpi.ne'
  intro h
  apply hI
  have hkT : (k * T) ^ 4 ≠ 0 := by positivity
  have hd : (ħ * c) ^ 3 ≠ 0 := by positivity
  field_simp at h
  have h2 : I * (k * T) ^ 4 = π ^ 4 / 15 * (k * T) ^ 4 := by
    field_simp; nlinarith [h]
  exact mul_right_cancel₀ hkT h2

end PhysJS.PhotonGasEnergyDensity

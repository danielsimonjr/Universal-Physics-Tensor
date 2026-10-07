/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Analysis.Real.Pi.Bounds
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-226`. Bridge. Pulsar magnetic-dipole spin-down field.

The relation proposed in the catalog report is

```
B = sqrt(3 μ₀ c³ I P Ṗ / (8 π² R⁶))
```

Derivation from the stated premises: an orthogonal rotator with angular
speed `Ω = 2π/P` and `Ω̇ = −2π Ṗ/P²` loses rotational energy
`−I Ω Ω̇` at the rate radiated by a vacuum magnetic dipole,

```
−I Ω Ω̇ = μ₀ m² Ω⁴ / (6π c³)
```

(`hbalance`, the Larmor-type dipole power is a hypothesis), and the dipole
moment `m` gives the polar field `B_pole = μ₀ m / (2π R³)` (`hpole`)
and the equatorial field `B_eq = B_pole / 2`.

`pole_field_sq` derives, with the exact SI factors,

```
B_pole² = 3 μ₀ c³ I P Ṗ / (8 π³ R⁶)
B_eq²   = 3 μ₀ c³ I P Ṗ / (32 π³ R⁶)
```

DISCREPANCY WITH THE REPORT. The report's formula has `8 π²` under the
root. Redoing the algebra from the same premises gives `8 π³` for the
polar field (`reported_off_by_pi`: the reported square is `π` times the
correct polar square), so the reported formula is wrong by a factor
`√π` in `B`. The common Gaussian `3.2×10¹⁹ √(P Ṗ)` G form,
`B_eq² = 3 c³ I P Ṗ / (8 π² R⁶)` in Gaussian units, is the equatorial
field; translating `μ₀ → 4π` in the formula above reproduces it
(`gaussian_match`). The Crab-like 1.3e9 T of the report is therefore not
the polar field of these inputs (that is 7.6e8 T) and is not evaluated here.

Premises: orthogonal rotator, vacuum dipole, rigid sphere of radius `R`
and moment of inertia `I`. Not a derivation of the dipole radiation
formula, and `I`, `R` remain empirical.
-/

namespace PhysJS.PulsarSpinDownField

open Real

/-- Dipole moment squared from the energy balance. -/
theorem moment_sq (I P Pdot c μ0 m Ω Ωdot : ℝ) (hP : 0 < P) (hc : 0 < c) (hμ : 0 < μ0)
    (hΩ : Ω = 2 * π / P) (hΩdot : Ωdot = -(2 * π * Pdot) / P ^ 2)
    (hbalance : I * Ω * (-Ωdot) = μ0 * m ^ 2 * Ω ^ 4 / (6 * π * c ^ 3)) :
    m ^ 2 = 3 * I * Pdot * P * c ^ 3 / (2 * π * μ0) := by
  have hpi : 0 < π := Real.pi_pos
  have hpi0 : π ≠ 0 := hpi.ne'
  have hP0 : P ≠ 0 := hP.ne'
  have hc0 : c ≠ 0 := hc.ne'
  have hμ0 : μ0 ≠ 0 := hμ.ne'
  have hΩ0 : Ω ≠ 0 := by rw [hΩ]; positivity
  have h1 : m ^ 2 = (I * Ω * (-Ωdot)) * (6 * π * c ^ 3) / (μ0 * Ω ^ 4) := by
    rw [hbalance]; field_simp
  rw [h1, hΩ, hΩdot]
  field_simp
  ring

/-- Polar field squared from the energy balance. -/
theorem pole_field_sq (I P Pdot R c μ0 m Ω Ωdot Bp : ℝ) (hP : 0 < P)
    (hR : 0 < R) (hc : 0 < c) (hμ : 0 < μ0)
    (hΩ : Ω = 2 * π / P) (hΩdot : Ωdot = -(2 * π * Pdot) / P ^ 2)
    (hbalance : I * Ω * (-Ωdot) = μ0 * m ^ 2 * Ω ^ 4 / (6 * π * c ^ 3))
    (hpole : Bp = μ0 * m / (2 * π * R ^ 3)) :
    Bp ^ 2 = 3 * μ0 * c ^ 3 * I * P * Pdot / (8 * π ^ 3 * R ^ 6) := by
  have hpi : 0 < π := Real.pi_pos
  have hpi0 : π ≠ 0 := hpi.ne'
  have hR0 : R ≠ 0 := hR.ne'
  have hμ0 : μ0 ≠ 0 := hμ.ne'
  have hm2 := moment_sq I P Pdot c μ0 m Ω Ωdot hP hc hμ hΩ hΩdot hbalance
  rw [hpole, div_pow, mul_pow, hm2]
  field_simp
  ring

/-- The polar field itself (positive root). -/
theorem pole_field_eq (I P Pdot R c μ0 m Ω Ωdot Bp : ℝ) (hP : 0 < P)
    (hR : 0 < R) (hc : 0 < c) (hμ : 0 < μ0) (hBp : 0 < Bp)
    (hΩ : Ω = 2 * π / P) (hΩdot : Ωdot = -(2 * π * Pdot) / P ^ 2)
    (hbalance : I * Ω * (-Ωdot) = μ0 * m ^ 2 * Ω ^ 4 / (6 * π * c ^ 3))
    (hpole : Bp = μ0 * m / (2 * π * R ^ 3)) :
    Bp = Real.sqrt (3 * μ0 * c ^ 3 * I * P * Pdot / (8 * π ^ 3 * R ^ 6)) := by
  rw [← pole_field_sq I P Pdot R c μ0 m Ω Ωdot Bp hP hR hc hμ hΩ hΩdot hbalance hpole]
  exact (Real.sqrt_sq hBp.le).symm

/-- Equatorial field `B_eq = B_pole / 2`. -/
theorem equator_field_sq (Bp Beq X : ℝ) (hBeq : Beq = Bp / 2)
    (hX : Bp ^ 2 = X / 8) : Beq ^ 2 = X / 32 := by
  rw [hBeq, div_pow, hX]; ring

/-- Report discrepancy: the reported square (`8 π²`) is `π` times the derived polar square. -/
theorem reported_off_by_pi (X : ℝ) :
    X / (8 * π ^ 2) = π * (X / (8 * π ^ 3)) := by
  have hpi0 : π ≠ 0 := Real.pi_pos.ne'
  field_simp

/-- The two squares differ whenever the field is nonzero. -/
theorem reported_not_pole (X : ℝ) (hX : 0 < X) :
    X / (8 * π ^ 2) ≠ X / (8 * π ^ 3) := by
  intro h
  have hpi : 1 < π := by linarith [Real.pi_gt_three]
  have hpi0 : 0 < π := by linarith
  rw [div_eq_div_iff (by positivity) (by positivity)] at h
  have : X * (8 * π ^ 2) * (π - 1) = 0 := by nlinarith [h]
  have hne : X * (8 * π ^ 2) ≠ 0 := by positivity
  have := (mul_eq_zero.mp this).resolve_left hne
  linarith

/-- Gaussian-unit match: with `μ₀ → 4π` the equatorial square is the standard
`3 c³ I P Ṗ / (8 π² R⁶)`. -/
theorem gaussian_match (c I P Pdot R : ℝ) :
    3 * (4 * π) * c ^ 3 * I * P * Pdot / (32 * π ^ 3 * R ^ 6) =
      3 * c ^ 3 * I * P * Pdot / (8 * π ^ 2 * R ^ 6) := by
  have hpi0 : π ≠ 0 := Real.pi_pos.ne'
  by_cases hR : R = 0
  · simp [hR]
  · field_simp
    ring

end PhysJS.PulsarSpinDownField

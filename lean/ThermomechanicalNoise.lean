/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.MeasureTheory.Integral.Bochner.Set
import Mathlib.MeasureTheory.Group.Integral
import Mathlib.Analysis.SpecialFunctions.ImproperIntegrals
import Mathlib.MeasureTheory.Measure.Haar.NormedSpace
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-178`. Bridge. Thermomechanical force noise.

The catalog equation is

```
S_F = 4 k_B T c    (one-sided)
```

for a viscous damper `c`. `force_noise_eq` derives it by the
equipartition-plus-Langevin route. The free damped mass obeys
`m v̇ + c v = F(t)` with a white thermal force of two-sided density `S₂`
(`⟨F(t) F(t')⟩ = S₂ δ(t − t')`). The velocity response is
`v(ω) = F(ω) / (c + i m ω)`, so by Wiener–Khinchin

```
⟨v²⟩ = (1 / 2π) ∫ S₂ dω / (c² + m² ω²) = S₂ / (2 c m).
```

The integral is `π / (c m)` (`lorentzian_integral`). Classical equipartition
of the one kinetic term gives `m ⟨v²⟩ = k_B T`, so `S₂ = 2 c k_B T`. The
one-sided density folds negative frequencies: `S_F = 2 S₂ = 4 k_B T c`.

`acceleration_floor_eq` is the proof-mass consequence. With `c = m ω₀ / Q`,
the squared acceleration density is `S_F / m² = 4 k_B T ω₀ / (m Q)`.

The equipartition value `m ⟨v²⟩ = k_B T` is a premise; it is the kinetic
twin of `be-177`. The white spectrum is a premise: this is the classical
fluctuation–dissipation limit, not the quantum one, and the electrical
analogue is `be-58`. `two_sided_not_one_sided` separates `2 k_B T c`.
-/

namespace PhysJS.ThermomechanicalNoise

open MeasureTheory

/-- The Lorentzian integral: `∫ dω / (c² + m² ω²) = π / (c m)`. -/
theorem lorentzian_integral (c m : ℝ) (hc : 0 < c) (hm : 0 < m) :
    (∫ ω : ℝ, 1 / (c ^ 2 + m ^ 2 * ω ^ 2)) = Real.pi / (c * m) := by
  have hcoef : ∀ ω : ℝ, 1 / (c ^ 2 + m ^ 2 * ω ^ 2) =
      (1 / c ^ 2) * (1 + (m / c * ω) ^ 2)⁻¹ := by
    intro ω
    field_simp [hc.ne']
  simp_rw [hcoef]
  rw [integral_const_mul]
  have hscale := Measure.integral_comp_mul_left (fun y : ℝ => (1 + y ^ 2)⁻¹) (m / c)
  rw [hscale, integral_univ_inv_one_add_sq]
  have hpos : 0 < m / c := div_pos hm hc
  rw [abs_of_pos (inv_pos.mpr hpos)]
  simp only [smul_eq_mul]
  field_simp

/-- Thermomechanical force noise from damped Langevin dynamics.

`hv` is the Wiener–Khinchin mean square of the velocity. `heq` is
classical equipartition for the kinetic term. `hS1` is the one-sided
convention `S_F = 2 S₂`.

Not the quantum spectrum, and not a frequency-dependent damper. -/
theorem force_noise_eq (m c kB T S₂ S₁ v2 : ℝ) (hm : 0 < m) (hc : 0 < c)
    (hv : v2 = (1 / (2 * Real.pi)) * ∫ ω : ℝ, S₂ / (c ^ 2 + m ^ 2 * ω ^ 2))
    (heq : m * v2 = kB * T) (hS1 : S₁ = 2 * S₂) :
    v2 = S₂ / (2 * c * m) ∧ S₂ = 2 * c * kB * T ∧ S₁ = 4 * kB * T * c := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hint : (∫ ω : ℝ, S₂ / (c ^ 2 + m ^ 2 * ω ^ 2)) = S₂ * (Real.pi / (c * m)) := by
    have : ∀ ω : ℝ, S₂ / (c ^ 2 + m ^ 2 * ω ^ 2) = S₂ * (1 / (c ^ 2 + m ^ 2 * ω ^ 2)) := by
      intro ω
      ring
    simp_rw [this]
    rw [integral_const_mul, lorentzian_integral c m hc hm]
  have hv2 : v2 = S₂ / (2 * c * m) := by
    rw [hv, hint]
    field_simp
  have hS2 : S₂ = 2 * c * kB * T := by
    rw [hv2] at heq
    field_simp at heq
    linarith
  refine ⟨hv2, hS2, ?_⟩
  rw [hS1, hS2]
  ring

/-- Proof-mass acceleration floor: `S_F / m² = 4 k_B T ω₀ / (m Q)` for
`c = m ω₀ / Q`. -/
theorem acceleration_floor_eq (m ω₀ Q kB T c S₁ : ℝ) (hm : m ≠ 0) (hQ : Q ≠ 0)
    (hc : c = m * ω₀ / Q) (hS : S₁ = 4 * kB * T * c) :
    S₁ / m ^ 2 = 4 * kB * T * ω₀ / (m * Q) := by
  rw [hS, hc]
  field_simp

/-- Two-sided and one-sided densities differ whenever the noise is nonzero. -/
theorem two_sided_not_one_sided (c kB T : ℝ) (h : c * kB * T ≠ 0) :
    2 * c * kB * T ≠ 4 * kB * T * c := by
  intro e
  apply h
  linarith

end PhysJS.ThermomechanicalNoise

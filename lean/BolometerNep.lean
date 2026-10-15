/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.SpecialFunctions.ImproperIntegrals
import Mathlib.MeasureTheory.Group.Integral
import Mathlib.MeasureTheory.Measure.Haar.NormedSpace
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-179`. Bridge. Bolometer thermal-fluctuation noise-equivalent power.

The catalog equation is

```
NEP² = 4 k_B T² G
```

for a detector of heat capacity `C_th` joined to a bath at `T` by a thermal
conductance `G`, limited by the random heat flow through that link.
`nep_eq` derives it. The temperature excursion obeys the thermal Langevin
equation `C_th Δṫ + G ΔT = P_n(t)` with a white power noise of two-sided
density `S₂`. The response is `ΔT(ω) = P_n(ω) / (G + i C_th ω)`, so

```
⟨ΔT²⟩ = (1 / 2π) ∫ S₂ dω / (G² + C_th² ω²) = S₂ / (2 G C_th).
```

The Lorentzian integral is `π / (G C_th)` (`lorentzian_integral`). Canonical
thermodynamics gives the energy variance `⟨ΔE²⟩ = k_B T² C_th` with
`ΔE = C_th ΔT`, so `⟨ΔT²⟩ = k_B T² / C_th`. Equating, `S₂ = 2 k_B T² G`, and
the one-sided density `NEP² = 2 S₂ = 4 k_B T² G`. Then `⟨ΔP²⟩ = NEP² Δf` in a
bandwidth `Δf`.

The canonical energy variance and the white spectrum are premises. It is
the classical thermal-fluctuation limit with a single thermal link and a bath
at `T`; it excludes Johnson noise, photon noise and readout noise.
`temperature_power_needed` separates `T` for `T²`: the forms differ by a
factor `T`, a different dimension. This is the thermal analogue of `be-58`
and `be-178`, not a duplicate of either.
-/

namespace PhysJS.BolometerNep

open MeasureTheory

/-- The Lorentzian integral: `∫ dω / (G² + C² ω²) = π / (G C)`. -/
theorem lorentzian_integral (G C : ℝ) (hG : 0 < G) (hC : 0 < C) :
    (∫ ω : ℝ, 1 / (G ^ 2 + C ^ 2 * ω ^ 2)) = Real.pi / (G * C) := by
  have hcoef : ∀ ω : ℝ, 1 / (G ^ 2 + C ^ 2 * ω ^ 2) =
      (1 / G ^ 2) * (1 + (C / G * ω) ^ 2)⁻¹ := by
    intro ω
    field_simp [hG.ne']
  simp_rw [hcoef]
  rw [integral_const_mul]
  have hscale := Measure.integral_comp_mul_left (fun y : ℝ => (1 + y ^ 2)⁻¹) (C / G)
  rw [hscale, integral_univ_inv_one_add_sq]
  have hpos : 0 < C / G := div_pos hC hG
  rw [abs_of_pos (inv_pos.mpr hpos)]
  simp only [smul_eq_mul]
  field_simp

/-- Thermal-fluctuation NEP.

`hT2` is the Wiener–Khinchin mean-square temperature excursion. `hE` is
the canonical energy variance `C² ⟨ΔT²⟩ = k_B T² C`. `hS1` is the one-sided
convention.

Not Johnson,
photon or readout noise, and not a multi-link thermal network. -/
theorem nep_eq (C G kB T S₂ S₁ dT2 : ℝ) (hC : 0 < C) (hG : 0 < G)
    (hT2 : dT2 = (1 / (2 * Real.pi)) * ∫ ω : ℝ, S₂ / (G ^ 2 + C ^ 2 * ω ^ 2))
    (hE : C ^ 2 * dT2 = kB * T ^ 2 * C) (hS1 : S₁ = 2 * S₂) :
    dT2 = S₂ / (2 * G * C) ∧ dT2 = kB * T ^ 2 / C ∧
      S₂ = 2 * kB * T ^ 2 * G ∧ S₁ = 4 * kB * T ^ 2 * G := by
  have hπ : 0 < Real.pi := Real.pi_pos
  have hint : (∫ ω : ℝ, S₂ / (G ^ 2 + C ^ 2 * ω ^ 2)) = S₂ * (Real.pi / (G * C)) := by
    have : ∀ ω : ℝ, S₂ / (G ^ 2 + C ^ 2 * ω ^ 2) = S₂ * (1 / (G ^ 2 + C ^ 2 * ω ^ 2)) := by
      intro ω
      ring
    simp_rw [this]
    rw [integral_const_mul, lorentzian_integral G C hG hC]
  have h1 : dT2 = S₂ / (2 * G * C) := by
    rw [hT2, hint]
    field_simp
  have h2 : dT2 = kB * T ^ 2 / C := by
    have : C * (C * dT2 - kB * T ^ 2) = 0 := by linarith
    rcases mul_eq_zero.mp this with h | h
    · exact absurd h hC.ne'
    · field_simp
      linarith
  have h3 : S₂ = 2 * kB * T ^ 2 * G := by
    rw [h1] at h2
    field_simp at h2
    linarith
  refine ⟨h1, h2, h3, ?_⟩
  rw [hS1, h3]
  ring

/-- Power fluctuation in a bandwidth: `⟨ΔP²⟩ = 4 k_B T² G Δf`. -/
theorem power_fluctuation (S₁ kB T G df dP2 : ℝ) (hS : S₁ = 4 * kB * T ^ 2 * G)
    (hP : dP2 = S₁ * df) : dP2 = 4 * kB * T ^ 2 * G * df := by
  rw [hP, hS]

/-- `T` in place of `T²` is a different density off `T = 1`. -/
theorem temperature_power_needed (kB T G : ℝ) (hk : kB ≠ 0) (hG : G ≠ 0) (hT : T ≠ 0)
    (hT1 : T ≠ 1) : 4 * kB * T * G ≠ 4 * kB * T ^ 2 * G := by
  intro h
  have h' : (4 * kB * G * T) * (T - 1) = 0 := by linarith
  rcases mul_eq_zero.mp h' with h1 | h1
  · have : (4 : ℝ) * kB * G * T ≠ 0 := by
      have h4 : (4 : ℝ) ≠ 0 := by norm_num
      exact mul_ne_zero (mul_ne_zero (mul_ne_zero h4 hk) hG) hT
    exact this h1
  · exact hT1 (by linarith)

end PhysJS.BolometerNep

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-114`. Bridge. Particles in a Debye sphere, and the Coulomb argument.

Proved under these hypotheses. The Debye length is the one-species
length `λ_D² = ε0 k_B T / (n e²)`, used here only as an input; the
length itself is not a new bridge. The sphere count is
`N_D = (4π/3) n λ_D³`. The ninety-degree impact parameter is the
Rutherford value `b_90 = e² / (4π ε0 μ v_rel²)`. The energy convention
is `(1/2) μ v_rel² = (3/2) k_B T`, so `μ v_rel² = 3 k_B T` and
`b_90 = e² / (12 π ε0 k_B T)`. The Coulomb argument is the ratio
`Λ = λ_D / b_90`, which equals `12 π n λ_D³ = 9 N_D`. The logarithm
`ln Λ` is this ratio after the angular integral; that integral is not
evaluated here.
-/

namespace PhysJS.DebyeSphere

/-- Rutherford `b_90` at the thermal energy `(1/2) μ v_rel² = (3/2) k_B T`. -/
theorem impact_parameter (b90 e eps0 μ vrel kT : ℝ)
    (he : e ≠ 0) (hε : eps0 ≠ 0) (hk : kT ≠ 0)
    (hE : μ * vrel ^ 2 = 3 * kT)
    (hb : b90 = e ^ 2 / (4 * Real.pi * eps0 * μ * vrel ^ 2)) :
    b90 = e ^ 2 / (12 * Real.pi * eps0 * kT) := by
  rw [hb]
  have hden : 4 * Real.pi * eps0 * (μ * vrel ^ 2) = 4 * Real.pi * eps0 * (3 * kT) := by
    linear_combination (4 * Real.pi * eps0) * hE
  have hassoc : 4 * Real.pi * eps0 * μ * vrel ^ 2 = 4 * Real.pi * eps0 * (μ * vrel ^ 2) := by ring
  rw [hassoc, hden]
  ring

/-- `Λ = λ_D / b_90 = 9 N_D` for this `b_90`.

`hlam` is the one-species Debye length. `hb` is `impact_parameter`.
`hΛ` defines the argument as the ratio of those lengths. `hN` is the
sphere count. -/
theorem coulomb_argument (n lam b90 eps0 e kT Λ ND : ℝ)
    (hn : n ≠ 0) (hlam : lam ≠ 0) (hε : eps0 ≠ 0) (he : e ≠ 0) (hk : kT ≠ 0)
    (hb90 : b90 ≠ 0)
    (hlamdef : lam ^ 2 = eps0 * kT / (n * e ^ 2))
    (hb : b90 = e ^ 2 / (12 * Real.pi * eps0 * kT))
    (hΛ : Λ = lam / b90)
    (hN : ND = (4 * Real.pi / 3) * n * lam ^ 3) :
    Λ = 12 * Real.pi * n * lam ^ 3 ∧ Λ = 9 * ND := by
  have hscreen : eps0 * kT = n * e ^ 2 * lam ^ 2 := by
    have h := hlamdef
    field_simp [hn, he] at h
    linarith
  have hΛ' : Λ = 12 * Real.pi * n * lam ^ 3 := by
    rw [hΛ, hb]
    field_simp [he, hε, hk, Real.pi_ne_zero]
    exact hscreen.trans (by ring : n * e ^ 2 * lam ^ 2 = lam ^ 2 * e ^ 2 * n)
  refine ⟨hΛ', ?_⟩
  rw [hΛ', hN]
  ring

end PhysJS.DebyeSphere

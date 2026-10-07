/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-195`. Bridge. Strong-shock compression ratio.

The catalog equation is

```
ρ₂ / ρ₁ = (γ + 1) / (γ − 1)
```

Proved under these hypotheses. A stationary planar shock in an ideal gas
with ratio of specific heats `γ > 1` satisfies the Rankine-Hugoniot jump
conditions between upstream `(ρ₁, u₁, p₁)` and downstream `(ρ₂, u₂, p₂)`:

```
ρ₁ u₁ = ρ₂ u₂
p₁ + ρ₁ u₁² = p₂ + ρ₂ u₂²
γ/(γ−1) p₁/ρ₁ + u₁²/2 = γ/(γ−1) p₂/ρ₂ + u₂²/2
```

The strong-shock limit `M → ∞` is taken as the hypothesis `p₁ = 0` (the
upstream pressure is negligible against `ρ₁ u₁²`). `jump_factored` shows
the three laws force `(ρ₂ − ρ₁) ((γ−1) ρ₂ − (γ+1) ρ₁) = 0`. The root
`ρ₂ = ρ₁` is the absence of a shock, so for a compressive shock
`compression_eq` gives the ratio. `four_at_five_thirds` is the monatomic
value 4.

Not proved: the finite-Mach ratio, a perpendicular magnetic field (which
changes the ratio), or that a physical shock selects the compressive root
(the entropy condition). Real gases with ionization or radiation change
the effective `γ`.
-/

namespace PhysJS.StrongShock

/-- The three jump conditions with `p₁ = 0` factor as a quadratic in `ρ₂`. -/
theorem jump_factored (ρ₁ ρ₂ u₁ u₂ p₂ γ : ℝ)
    (hρ₁ : 0 < ρ₁) (hρ₂ : 0 < ρ₂) (hγ : 1 < γ)
    (hmass : ρ₁ * u₁ = ρ₂ * u₂)
    (hmom : 0 + ρ₁ * u₁ ^ 2 = p₂ + ρ₂ * u₂ ^ 2)
    (henergy : γ / (γ - 1) * (0 / ρ₁) + u₁ ^ 2 / 2 =
      γ / (γ - 1) * (p₂ / ρ₂) + u₂ ^ 2 / 2)
    (hu₁ : u₁ ≠ 0) :
    (ρ₂ - ρ₁) * ((γ - 1) * ρ₂ - (γ + 1) * ρ₁) = 0 := by
  have hγ1 : γ - 1 ≠ 0 := by linarith
  have hp₂ : p₂ = ρ₁ * u₁ ^ 2 - ρ₂ * u₂ ^ 2 := by linarith
  have hu₂ : u₂ = ρ₁ * u₁ / ρ₂ := by
    rw [hmass]; field_simp
  rw [hp₂, hu₂] at henergy
  field_simp at henergy
  have hu1sq : u₁ ^ 2 ≠ 0 := pow_ne_zero 2 hu₁
  have key : u₁ ^ 2 * ((ρ₂ - ρ₁) * ((γ - 1) * ρ₂ - (γ + 1) * ρ₁)) = 0 := by
    nlinarith [henergy]
  rcases mul_eq_zero.mp key with h | h
  · exact absurd h hu1sq
  · exact h

/-- Strong-shock compression ratio from Rankine-Hugoniot. -/
theorem compression_eq (ρ₁ ρ₂ u₁ u₂ p₂ γ : ℝ)
    (hρ₁ : 0 < ρ₁) (hρ₂ : 0 < ρ₂) (hγ : 1 < γ)
    (hmass : ρ₁ * u₁ = ρ₂ * u₂)
    (hmom : 0 + ρ₁ * u₁ ^ 2 = p₂ + ρ₂ * u₂ ^ 2)
    (henergy : γ / (γ - 1) * (0 / ρ₁) + u₁ ^ 2 / 2 =
      γ / (γ - 1) * (p₂ / ρ₂) + u₂ ^ 2 / 2)
    (hu₁ : u₁ ≠ 0) (hshock : ρ₂ ≠ ρ₁) :
    ρ₂ / ρ₁ = (γ + 1) / (γ - 1) := by
  have hγ1 : γ - 1 ≠ 0 := by linarith
  have h := jump_factored ρ₁ ρ₂ u₁ u₂ p₂ γ hρ₁ hρ₂ hγ hmass hmom henergy hu₁
  rcases mul_eq_zero.mp h with h1 | h2
  · exact absurd (by linarith) hshock
  · rw [div_eq_div_iff hρ₁.ne' hγ1]
    linarith

/-- Monatomic gas, `γ = 5/3`: the compression ratio is 4. -/
theorem four_at_five_thirds : ((5 : ℝ) / 3 + 1) / (5 / 3 - 1) = 4 := by
  norm_num

/-- The ratio exceeds 1 and decreases as `γ` grows, so softer gases
compress more. -/
theorem ratio_gt_one (γ : ℝ) (hγ : 1 < γ) : 1 < (γ + 1) / (γ - 1) := by
  rw [lt_div_iff₀ (by linarith)]
  linarith

/-- The jump laws alone also allow the trivial branch `ρ₂ = ρ₁` (no
shock), so the compressive root is a separate premise. -/
theorem no_shock_branch (ρ u γ : ℝ) :
    ρ * u = ρ * u ∧ 0 + ρ * u ^ 2 = 0 + ρ * u ^ 2 ∧
      γ / (γ - 1) * (0 / ρ) + u ^ 2 / 2 = γ / (γ - 1) * (0 / ρ) + u ^ 2 / 2 :=
  ⟨rfl, rfl, rfl⟩

/-- Non-vacuity: at `γ = 5/3`, `(ρ₁, u₁) = (1, 4)` the state
`(ρ₂, u₂, p₂) = (4, 1, 12)` satisfies all three jump laws with `p₁ = 0`. -/
theorem compressive_solution :
    (1 : ℝ) * 4 = 4 * 1 ∧ 0 + (1 : ℝ) * 4 ^ 2 = 12 + 4 * 1 ^ 2 ∧
      (5 / 3 : ℝ) / (5 / 3 - 1) * (0 / 1) + 4 ^ 2 / 2 =
        (5 / 3) / (5 / 3 - 1) * (12 / 4) + 1 ^ 2 / 2 := by
  refine ⟨?_, ?_, ?_⟩ <;> norm_num

end PhysJS.StrongShock

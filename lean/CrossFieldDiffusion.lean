/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-123`. Bridge. Classical cross-field diffusion.

Proved under these hypotheses. A steady drift-diffusion balance with
one collision time is `q E + q v × B − m v / τ = 0`. The mobility is
`μ = q τ / m` and `α = ω_c τ = μ B`, with `ω_c = q B / m`. For `B`
along `z`,

```
v_x = μ (E_x + α E_y) / (1 + α²)
v_y = μ (E_y − α E_x) / (1 + α²)
```

An electric field along `x` has perpendicular mobility
`μ_⊥ = μ / (1 + ω_c² τ²)`. Einstein's relation `D = μ k_B T / q`, the
same relation as `be-70` applied to each eigenvalue and not re-proved
from a Boltzmann profile, gives `D_⊥ / D_∥ = 1 / (1 + ω_c² τ²)`. The
ratio depends on `α²`, so the sign of `ω_c` cancels. The empirical
Bohm factor `1/16` is not this ratio.
-/

namespace PhysJS.CrossFieldDiffusion

/-- Solve the steady two-component balance for `μ` and `α = μ B`. -/
theorem mobility_solved (μ α Ex Ey vx vy : ℝ) (hden : 1 + α ^ 2 ≠ 0)
    (hx : vx = μ * Ex + α * vy) (hy : vy = μ * Ey - α * vx) :
    vx = μ * (Ex + α * Ey) / (1 + α ^ 2) ∧
      vy = μ * (Ey - α * Ex) / (1 + α ^ 2) := by
  have hy1 : vy = μ * Ey - α * (μ * Ex + α * vy) := by
    rw [← hx]
    exact hy
  have hy2 : vy = μ * Ey - α * μ * Ex - α ^ 2 * vy := by
    convert hy1 using 1
    ring
  have hvy : vy + α ^ 2 * vy = μ * Ey - α * μ * Ex := by
    linear_combination hy2
  have hvy' : vy * (1 + α ^ 2) = μ * (Ey - α * Ex) := by
    linear_combination hvy
  have hvyEq : vy = μ * (Ey - α * Ex) / (1 + α ^ 2) := by
    rw [eq_div_iff hden]
    exact hvy'
  have hxClear : vx * (1 + α ^ 2) = μ * (Ex + α * Ey) := by
    have h1 : vx * (1 + α ^ 2) = (μ * Ex + α * vy) * (1 + α ^ 2) := by rw [hx]
    have h2 : (μ * Ex + α * vy) * (1 + α ^ 2) =
        μ * Ex * (1 + α ^ 2) + α * (vy * (1 + α ^ 2)) := by ring
    rw [h1, h2, hvy']
    ring
  refine ⟨?_, hvyEq⟩
  · rw [eq_div_iff hden]
    exact hxClear

/-- Perpendicular and parallel Einstein diffusivities.

`hforceX` and `hforceY` are `q E + q v × B − m v / τ = 0` with `B`
along `z`. `hEy` puts `E` along `x`. `hDpar` and `hDperp` are
`D = μ k_B T / q` on the parallel mobility `μ` and on `μ / (1 + α²)`. -/
theorem diffusion_ratio (q Ex Ey B m τ μ α vx vy Dpar Dperp kT : ℝ)
    (hq : q ≠ 0) (hm : m ≠ 0) (hτ : τ ≠ 0) (hden : 1 + α ^ 2 ≠ 0)
    (hμ : μ = q * τ / m) (hα : α = μ * B)
    (hforceX : q * Ex + q * vy * B - m * vx / τ = 0)
    (hforceY : q * Ey - q * vx * B - m * vy / τ = 0)
    (hEy : Ey = 0)
    (hDpar : Dpar = μ * kT / q)
    (hDperp : Dperp = (μ / (1 + α ^ 2)) * kT / q) :
    Dperp = Dpar / (1 + α ^ 2) ∧ vx = μ * Ex / (1 + α ^ 2) := by
  have hx : vx = μ * Ex + α * vy := by
    have hsum : m * vx / τ = q * Ex + q * vy * B := by linarith
    have hmul : m * vx = (q * Ex + q * vy * B) * τ := by
      have h := congrArg (fun z => z * τ) hsum
      have hc : m * vx / τ * τ = m * vx := by field_simp [hτ]
      rwa [hc] at h
    have hform : (q * Ex + q * vy * B) * τ =
        m * ((q * τ / m) * Ex + (q * τ / m) * B * vy) := by
      field_simp [hm]
    rw [hα, hμ]
    apply mul_left_cancel₀ hm
    rw [hmul]
    exact hform
  have hy : vy = μ * Ey - α * vx := by
    have hsum : m * vy / τ = q * Ey - q * vx * B := by linarith
    have hmul : m * vy = (q * Ey - q * vx * B) * τ := by
      have h := congrArg (fun z => z * τ) hsum
      have hc : m * vy / τ * τ = m * vy := by field_simp [hτ]
      rwa [hc] at h
    have hform : (q * Ey - q * vx * B) * τ =
        m * ((q * τ / m) * Ey - (q * τ / m) * B * vx) := by
      field_simp [hm]
    rw [hα, hμ]
    apply mul_left_cancel₀ hm
    rw [hmul]
    exact hform
  have hsol := mobility_solved μ α Ex Ey vx vy hden hx hy
  refine ⟨?_, ?_⟩
  · rw [hDperp, hDpar]
    field_simp [hq, hden]
  · rw [hsol.1, hEy]
    ring

/-- The ratio is even in `ω_c`. -/
theorem sign_even (α : ℝ) (hden : 1 + α ^ 2 ≠ 0) :
    1 / (1 + α ^ 2) = 1 / (1 + (-α) ^ 2) := by
  ring

/-- Bohm's `1/16` is not the classical ratio at a finite `ω_c τ`. -/
theorem bohm_factor_not_classical (α : ℝ) (hα : α ≠ 0) (hden : 1 + α ^ 2 ≠ 0) :
    1 / (1 + α ^ 2) ≠ (1 : ℝ) / 16 ∨ α ^ 2 = 15 := by
  by_cases h : α ^ 2 = 15
  · exact Or.inr h
  · left
    intro hEq
    have : 1 + α ^ 2 = 16 := by
      field_simp [hden] at hEq
      linarith
    have : α ^ 2 = 15 := by linarith
    exact h this

end PhysJS.CrossFieldDiffusion

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-213`. Bridge. Hard-sphere gas mean free path.

The catalog equation is

```
λ = k_B T / (√2 π d² p)
```

`mean_free_path_eq` derives it from the collision-cylinder picture. A
molecule moving at the relative speed `v_rel` sweeps a cylinder of
cross-section `π d²` (contact when the centers are within one diameter `d`),
so the collision rate is `z = n π d² v_rel`. The path between collisions is
the mean speed times the time between collisions, `λ = v̄ / z`, with
`n = p / (k_B T)` from the ideal-gas law.

The factor `√2` is the Maxwell-distribution relation `v_rel = √2 v̄` between
mean relative speed and mean speed. It enters as a *hypothesis*
(`hrel`); this file does not integrate the Maxwell distribution. What is
proved about it is the algebra of the mean-square version,
`mean_square_relative_speed`: for independent zero-mean velocities of equal
mean-square speed, `⟨|v₁ − v₂|²⟩ = 2 ⟨v²⟩`, which is the same `√2` for the
root-mean-square speeds.

Scope: dilute gas, hard spheres, Maxwellian speeds, no persistence of
velocities. `no_sqrt_two_wrong` records that dropping the `√2` changes the
answer by exactly that factor; `inverse_pressure` records the `1/p` scaling.
-/

namespace PhysJS.GasMeanFreePath

open Real

/-- Mean free path from the collision cylinder, `λ = v̄ / (n π d² v_rel)`,
`v_rel = √2 v̄`, `n = p / (k_B T)`.

The
relative-speed factor `√2` is a stated hypothesis. -/
theorem mean_free_path_eq (lam vbar vrel z n σ d p kB T : ℝ)
    (hv : 0 < vbar) (hd : 0 < d) (hp : 0 < p) (hkT : 0 < kB * T)
    (hσ : σ = π * d ^ 2)
    (hn : n = p / (kB * T))
    (hrel : vrel = Real.sqrt 2 * vbar)
    (hz : z = n * σ * vrel)
    (hlam : lam = vbar / z) :
    lam = kB * T / (Real.sqrt 2 * π * d ^ 2 * p) := by
  have hs2 : 0 < Real.sqrt 2 := Real.sqrt_pos.mpr (by norm_num)
  have hπ : 0 < π := Real.pi_pos
  have hkT0 : kB * T ≠ 0 := hkT.ne'
  rw [hlam, hz, hn, hσ, hrel]
  field_simp

/-- Mean-square relative speed: independent, zero-mean velocities with equal
mean-square speed `⟨v²⟩` have `⟨|v₁ − v₂|²⟩ = 2 ⟨v²⟩`. -/
theorem mean_square_relative_speed (m11 m22 m12 vsq rel : ℝ)
    (hind : m12 = 0) (heq : m11 = vsq) (heq' : m22 = vsq)
    (hrel : rel = m11 + m22 - 2 * m12) : rel = 2 * vsq := by
  rw [hrel, hind, heq, heq']; ring

/-- Control: dropping `√2` (using `v_rel = v̄`) overestimates the mean free
path by exactly `√2`. -/
theorem no_sqrt_two_wrong (d p kB T : ℝ) (hd : 0 < d) (hp : 0 < p) (hkT : 0 < kB * T) :
    kB * T / (π * d ^ 2 * p) = Real.sqrt 2 * (kB * T / (Real.sqrt 2 * π * d ^ 2 * p)) ∧
    kB * T / (π * d ^ 2 * p) ≠ kB * T / (Real.sqrt 2 * π * d ^ 2 * p) := by
  have hs2 : 0 < Real.sqrt 2 := Real.sqrt_pos.mpr (by norm_num)
  have hπ : 0 < π := Real.pi_pos
  have hs1 : 1 < Real.sqrt 2 := by
    rw [show (1 : ℝ) = Real.sqrt 1 by simp]
    exact Real.sqrt_lt_sqrt (by norm_num) (by norm_num)
  constructor
  · field_simp
  · intro h
    have hpos : 0 < kB * T / (π * d ^ 2 * p) := by positivity
    have h2 : kB * T / (π * d ^ 2 * p) = Real.sqrt 2 * (kB * T / (Real.sqrt 2 * π * d ^ 2 * p)) := by
      field_simp
    rw [← h] at h2
    nlinarith [hpos]

/-- Control: the mean free path scales as `1/p`. -/
theorem inverse_pressure (d p kB T : ℝ) (hp : p ≠ 0) :
    kB * T / (Real.sqrt 2 * π * d ^ 2 * (2 * p)) =
      (1 / 2) * (kB * T / (Real.sqrt 2 * π * d ^ 2 * p)) := by
  by_cases h : Real.sqrt 2 * π * d ^ 2 = 0
  · simp [h]
  · field_simp

end PhysJS.GasMeanFreePath

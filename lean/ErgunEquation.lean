/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-207`. Bridge. Ergun equation for flow through a packed bed.

The catalog equation is

```
Δp / L = k₁ μ (1 − ε)² v / (ε³ d²) + k₂ ρ (1 − ε) v² / (ε³ d)
```

with `k₁ = 150` and `k₂ = 1.75` in the usual form. `ergun_eq` derives the
two-term form from a bed friction factor: the pressure gradient is the
interstitial momentum loss `f_p (ρ v² / d) (1 − ε) / ε³` with the
viscous-plus-inertial friction law `f_p = k₁ / Re_p + k₂`,
`Re_p = ρ v d / (μ (1 − ε))`. The viscous term is linear in `v` (Kozeny–Carman
type) and the inertial term quadratic in `v` (Burke–Plummer type).
`viscous_dominates` gives the crossover `Re_p = k₁ / k₂`, and
`ergun_numbers` evaluates the usual constants for 3 mm beads, `ε = 0.4`,
`v = 0.1 m/s` in water (64.06 kPa/m).

Scope: the constants `k₁ = 150`, `k₂ = 1.75` are fitted and are *hypotheses*
here, not derived; `coefficient_not_fixed` and `not_a_power_law` record that
the structure does not fix them. Spherical uniform particles, superficial
velocity `v`, incompressible fluid.
-/

namespace PhysJS.ErgunEquation

/-- Ergun pressure gradient from the bed friction factor.

`hgrad`: `Δp / L = f_p (ρ v² / d) (1 − ε) / ε³`.
`hfp`: `f_p = k₁ / Re_p + k₂`. `hRe`: `Re_p = ρ v d / (μ (1 − ε))`.

`k₁`, `k₂` are
empirical hypotheses. -/
theorem ergun_eq (G fp Re k₁ k₂ ρ μ v d ε : ℝ)
    (hρ : ρ ≠ 0) (hv : v ≠ 0) (hd : d ≠ 0)
    (hε : ε ≠ 0) (hε1 : 1 - ε ≠ 0)
    (hgrad : G = fp * (ρ * v ^ 2 / d) * (1 - ε) / ε ^ 3)
    (hfp : fp = k₁ / Re + k₂)
    (hRe : Re = ρ * v * d / (μ * (1 - ε))) :
    G = k₁ * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) +
        k₂ * ρ * (1 - ε) * v ^ 2 / (ε ^ 3 * d) := by
  rw [hgrad, hfp, hRe]
  field_simp

/-- Viscous term at least the inertial term exactly when `Re_p ≤ k₁ / k₂`. -/
theorem viscous_dominates (k₁ k₂ ρ μ v d ε : ℝ)
    (hk₁ : 0 < k₁) (hk₂ : 0 < k₂) (hρ : 0 < ρ) (hμ : 0 < μ) (hv : 0 < v)
    (hd : 0 < d) (hε : 0 < ε) (hε1 : ε < 1) :
    k₂ * ρ * (1 - ε) * v ^ 2 / (ε ^ 3 * d) ≤ k₁ * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) ↔
      ρ * v * d / (μ * (1 - ε)) ≤ k₁ / k₂ := by
  have h1 : 0 < 1 - ε := by linarith
  rw [div_le_div_iff₀ (by positivity) (by positivity), div_le_div_iff₀ (by positivity) hk₂]
  have hK : 0 < (1 - ε) * v * ε ^ 3 * d := by positivity
  constructor
  · intro h
    have h' : (ρ * v * d * k₂) * ((1 - ε) * v * ε ^ 3 * d) ≤
        (k₁ * (μ * (1 - ε))) * ((1 - ε) * v * ε ^ 3 * d) := by linarith
    exact le_of_mul_le_mul_right h' hK
  · intro h
    have h' := mul_le_mul_of_nonneg_right h hK.le
    linarith

/-- Evaluated: 3 mm beads, `ε = 0.4`, `v = 0.1 m/s`, water, usual constants. -/
theorem ergun_numbers :
    (150 : ℝ) * (1 / 1000) * (1 - 2 / 5) ^ 2 * (1 / 10) / ((2 / 5) ^ 3 * (3 / 1000) ^ 2) +
      (7 / 4) * 1000 * (1 - 2 / 5) * (1 / 10) ^ 2 / ((2 / 5) ^ 3 * (3 / 1000)) = 64062.5 := by
  norm_num

/-- Control: the gradient is not a pure power of `v` once the inertial term is
present: doubling `v` gives more than twice and less than four
times the gradient. -/
theorem not_a_power_law (A B v : ℝ) (hA : 0 < A) (hB : 0 < B) (hv : 0 < v) :
    2 * (A * v + B * v ^ 2) < A * (2 * v) + B * (2 * v) ^ 2 ∧
      A * (2 * v) + B * (2 * v) ^ 2 < 4 * (A * v + B * v ^ 2) := by
  constructor <;> nlinarith [mul_pos hA hv, mul_pos hB (pow_pos hv 2)]

/-- Control: the constants are not fixed by the structure. Increasing `k₁`
increases the gradient for the same bed and flow. -/
theorem coefficient_not_fixed (k₁ k₁' k₂ ρ μ v d ε : ℝ)
    (hμ : 0 < μ) (hv : 0 < v) (hd : 0 < d) (hε : 0 < ε) (hε1 : ε < 1)
    (hk : k₁ < k₁') :
    k₁ * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) + k₂ * ρ * (1 - ε) * v ^ 2 / (ε ^ 3 * d) <
    k₁' * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) + k₂ * ρ * (1 - ε) * v ^ 2 / (ε ^ 3 * d) := by
  have h1 : 0 < 1 - ε := by linarith
  have hpos : 0 < μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) := by positivity
  have e1 : k₁ * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) =
      k₁ * (μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2)) := by ring
  have e2 : k₁' * μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2) =
      k₁' * (μ * (1 - ε) ^ 2 * v / (ε ^ 3 * d ^ 2)) := by ring
  rw [e1, e2]
  nlinarith

end PhysJS.ErgunEquation

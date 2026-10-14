/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-155`. Bridge. The Reynolds number as a flux ratio.

The catalog product is `Re μ = ρ v L`. `reynolds_eq` identifies that
product with the ratio of inertial momentum flux to viscous momentum flux,

```
Re = (ρ v²) / (μ v / L) = v L / ν,    ν = μ / ρ
```

It is not a friction correlation, and it is not the pipe factor of `be-77`.
-/

namespace PhysJS.ReynoldsNumber

/-- Inertial flux over viscous flux is `ρ v L / μ` and `v L / ν`. -/
theorem reynolds_eq (Re ρ v L μ ν inertial viscous : ℝ)
    (hμ : μ ≠ 0) (hv : v ≠ 0) (hL : L ≠ 0) (hρ : ρ ≠ 0) (hν : ν ≠ 0)
    (hkin : ν = μ / ρ)
    (hinertial : inertial = ρ * v ^ 2)
    (hviscous : viscous = μ * v / L)
    (hvisc0 : viscous ≠ 0)
    (hRe : Re = inertial / viscous) :
    Re = v * L / ν ∧ Re * μ = ρ * v * L := by
  have hflux : inertial / viscous = ρ * v * L / μ := by
    rw [hinertial, hviscous]
    field_simp [hμ, hv, hL, hρ, hvisc0]
  have hkinform : ρ * v * L / μ = v * L / ν := by
    rw [hkin]
    field_simp [hμ, hρ, hν]
  refine ⟨?_, ?_⟩
  · rw [hRe, hflux, hkinform]
  · rw [hRe, hflux]
    field_simp [hμ]

end PhysJS.ReynoldsNumber

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-154`. Bridge. The Prandtl number as a ratio of diffusivities.

The catalog product is `Pr k = μ c_p`. That product is the ratio identity

```
Pr = ν / α,    ν = μ / ρ,    α = k / (ρ c_p)
```

`prandtl_eq` proves the two writings are the same number. It is not a
heat-transfer correlation, and it is not the Reynolds analogy of `be-86`.
-/

namespace PhysJS.Prandtl

/-- `Pr = ν / α` is `Pr k = μ c_p`.

The row is
the ratio of momentum diffusivity to thermal diffusivity. -/
theorem prandtl_eq (Pr ν α μ ρ k cp : ℝ)
    (hρ : ρ ≠ 0) (hk : k ≠ 0) (hα : α ≠ 0)
    (hν : ν = μ / ρ) (hαdef : α = k / (ρ * cp)) (hPr : Pr = ν / α) :
    Pr * k = μ * cp ∧ Pr = μ * cp / k := by
  have hratio : ν / α = μ * cp / k := by
    rw [hν, hαdef]
    field_simp [hρ, hk, hα]
  refine ⟨?_, ?_⟩
  · rw [hPr, hratio]
    field_simp [hk]
  · rw [hPr, hratio]

end PhysJS.Prandtl

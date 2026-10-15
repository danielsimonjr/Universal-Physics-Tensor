/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-157`. Bridge. The Nusselt number and the wall gradient.

The catalog product is `Nu k = h L`. When the film coefficient is the
conduction flux at the wall, `h = k (∂T/∂n) / ΔT`, that product is the
dimensionless gradient

```
Nu = L (∂T/∂n) / ΔT
```

`nusselt_eq` is this equivalence. It is not a correlation for `Nu`.
-/

namespace PhysJS.Nusselt

/-- `Nu = h L / k` agrees with the wall gradient. -/
theorem nusselt_eq (Nu hcoeff k L dTdn ΔT : ℝ)
    (hk : k ≠ 0) (hΔ : ΔT ≠ 0)
    (hfilm : hcoeff = k * dTdn / ΔT)
    (hNu : Nu = hcoeff * L / k) :
    Nu = L * dTdn / ΔT ∧ Nu * k = hcoeff * L := by
  refine ⟨?_, ?_⟩
  · rw [hNu, hfilm]
    field_simp [hk, hΔ]
  · rw [hNu]
    field_simp [hk]

end PhysJS.Nusselt

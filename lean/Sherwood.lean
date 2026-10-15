/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-159`. Bridge. The Sherwood number and the wall concentration gradient.

The catalog product is `Sh D = k_m L`. When the mass-transfer coefficient
is the diffusive flux at the wall, `k_m = D (∂c/∂n) / Δc`, that product is

```
Sh = L (∂c/∂n) / Δc
```

`sherwood_eq` is this equivalence. It is not a correlation for `Sh`.
-/

namespace PhysJS.Sherwood

/-- `Sh = k_m L / D` agrees with the wall gradient. -/
theorem sherwood_eq (Sh km D L dcdn Δc : ℝ)
    (hD : D ≠ 0) (hΔ : Δc ≠ 0)
    (hfilm : km = D * dcdn / Δc)
    (hSh : Sh = km * L / D) :
    Sh = L * dcdn / Δc ∧ Sh * D = km * L := by
  refine ⟨?_, ?_⟩
  · rw [hSh, hfilm]
    field_simp [hD, hΔ]
  · rw [hSh]
    field_simp [hD]

end PhysJS.Sherwood

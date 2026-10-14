/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-156`. Bridge. The Biot number as a resistance ratio.

The catalog product is `Bi k = h L_c`. With the conduction length
`L_c = V / A`, that product is the ratio of the internal conduction
resistance to the surface convection resistance,

```
Bi = (L_c / k) / (1 / h) = h V / (k A)
```

`hcoeff` is the heat-transfer coefficient. This is not a lumped-capacitance
criterion.
-/

namespace PhysJS.Biot

/-- Conduction resistance over convection resistance. -/
theorem biot_eq (Bi hcoeff k Lc V A Rcond Rconv : ℝ)
    (hk : k ≠ 0) (hh : hcoeff ≠ 0) (hA : A ≠ 0) (hLc : Lc ≠ 0)
    (hLcdef : Lc = V / A)
    (hcond : Rcond = Lc / k)
    (hconv : Rconv = 1 / hcoeff)
    (hconv0 : Rconv ≠ 0)
    (hBi : Bi = Rcond / Rconv) :
    Bi = hcoeff * V / (k * A) ∧ Bi * k = hcoeff * Lc := by
  have hratio : Rcond / Rconv = hcoeff * Lc / k := by
    rw [hcond, hconv]
    field_simp [hk, hh, hLc, hconv0]
  refine ⟨?_, ?_⟩
  · rw [hBi, hratio, hLcdef]
    field_simp [hk, hA]
  · rw [hBi, hratio]
    field_simp [hk]

end PhysJS.Biot

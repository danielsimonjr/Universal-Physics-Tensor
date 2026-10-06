/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-158`. Bridge. The Schmidt number, and Lewis as `Sc / Pr`.

The catalog product is `Sc ρ D = μ`. That product is the diffusivity ratio

```
Sc = ν / D,    ν = μ / ρ
```

The same coefficients give the Lewis number `Le = α / D = Sc / Pr` once
`Pr = ν / α`. `schmidt_eq` is those two identities. It is not a mass-transfer
correlation.
-/

namespace PhysJS.Schmidt

/-- `Sc = ν / D` is `Sc ρ D = μ`, and `Le = Sc / Pr`.

Kind `bridge` on `PhysJS.Schmidt.schmidt_eq`, once the catalog entry
exists. The covers line still begins with `derivation-step`. -/
theorem schmidt_eq (Sc Le Pr ν α D μ ρ : ℝ)
    (hρ : ρ ≠ 0) (hD : D ≠ 0) (hα : α ≠ 0) (hPr : Pr ≠ 0) (hν : ν ≠ 0)
    (hkin : ν = μ / ρ)
    (hSc : Sc = ν / D)
    (hLe : Le = α / D)
    (hPrdef : Pr = ν / α) :
    Sc * ρ * D = μ ∧ Le = Sc / Pr := by
  refine ⟨?_, ?_⟩
  · rw [hSc, hkin]
    field_simp [hρ, hD]
  · rw [hLe, hSc, hPrdef]
    field_simp [hD, hα, hν, hPr]

end PhysJS.Schmidt

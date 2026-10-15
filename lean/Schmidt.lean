/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-158`. Bridge. The Schmidt number, and Lewis as `Sc / Pr`.

The catalog product is `Sc ρ D = μ`. `schmidt_eq` takes one Fourier mode
`exp(−r t) sin(q x)` under momentum diffusion (`ν`), heat conduction (`α`)
and mass diffusion (`D`). `PhysJS.DiffusionMode.mode_solves_iff` forces
the decay rates `ν q²`, `α q²` and `D q²`, so the rate ratios are

```
Sc = r_u / r_c = ν / D,    Le = r_θ / r_c = α / D,    Pr = r_u / r_θ
```

with `ν = μ / ρ`. Then `Sc ρ D = μ` and `Le = Sc / Pr`. It is not a
mass-transfer correlation.
-/

namespace PhysJS.Schmidt

open PhysJS.DiffusionMode

/-- The momentum, heat and mass decay rates of a mode give `Sc ρ D = μ` and `Le = Sc / Pr`.

`hu`, `hθ` and `hc` say the mode with wavenumber `q` and rates `ru`, `rθ`,
`rc` solves momentum diffusion, heat conduction and mass diffusion. -/
theorem schmidt_eq (Sc Le Pr ν α D μ ρ q ru rθ rc : ℝ)
    (hρ : ρ ≠ 0) (hD : D ≠ 0) (hα : α ≠ 0) (hμ : μ ≠ 0) (hq : q ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α) (hc : Solves rc q 0 D)
    (hSc : Sc = ru / rc)
    (hLe : Le = rθ / rc)
    (hPrdef : Pr = ru / rθ) :
    Sc = ν / D ∧ Sc * ρ * D = μ ∧ Le = Sc / Pr := by
  have hru := (mode_solves_iff ru q 0 ν hq).1 hu
  have hrθ := (mode_solves_iff rθ q 0 α hq).1 hθ
  have hrc := (mode_solves_iff rc q 0 D hq).1 hc
  have hν : ν ≠ 0 := by
    rw [hkin]
    exact div_ne_zero hμ hρ
  have hq2 : q ^ 2 ≠ 0 := pow_ne_zero 2 hq
  have hSc' : Sc = ν / D := by
    rw [hSc, hru, hrc]
    field_simp
  refine ⟨hSc', ?_, ?_⟩
  · rw [hSc', hkin]
    field_simp
  · rw [hLe, hSc, hPrdef, hru, hrθ, hrc]
    field_simp

end PhysJS.Schmidt

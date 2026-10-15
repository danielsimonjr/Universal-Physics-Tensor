/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-154`. Bridge. The Prandtl number as a ratio of diffusion rates.

The catalog product is `Pr k = μ c_p`. `prandtl_eq` takes `Pr` as the
ratio of the decay rates of one Fourier mode `exp(−r t) sin(q x)` under
momentum diffusion `∂u/∂t = ν ∂²u/∂x²` and under heat conduction
`∂θ/∂t = α ∂²θ/∂x²`. `PhysJS.DiffusionMode.mode_solves_iff` forces those
rates to be `ν q²` and `α q²`, so

```
Pr = r_u / r_θ = ν / α = μ c_p / k,    ν = μ / ρ,    α = k / (ρ c_p)
```

for every wavenumber `q`. It is not a heat-transfer correlation, and it is
not the Reynolds analogy of `be-86`.
-/

namespace PhysJS.Prandtl

open PhysJS.DiffusionMode

/-- The momentum-to-heat decay-rate ratio of a mode is `ν / α`, so `Pr k = μ c_p`.

`hu` and `hθ` say the mode with wavenumber `q` and rates `ru`, `rθ` solves
momentum diffusion and heat conduction. -/
theorem prandtl_eq (Pr ν α μ ρ k cp q ru rθ : ℝ)
    (hρ : ρ ≠ 0) (hk : k ≠ 0) (hcp : cp ≠ 0) (hq : q ≠ 0)
    (hν : ν = μ / ρ) (hαdef : α = k / (ρ * cp))
    (hu : Solves ru q 0 ν) (hθ : Solves rθ q 0 α)
    (hPr : Pr = ru / rθ) :
    Pr = ν / α ∧ Pr * k = μ * cp ∧ Pr = μ * cp / k := by
  have hru := (mode_solves_iff ru q 0 ν hq).1 hu
  have hrθ := (mode_solves_iff rθ q 0 α hq).1 hθ
  have hα : α ≠ 0 := by
    rw [hαdef]
    exact div_ne_zero hk (mul_ne_zero hρ hcp)
  have hq2 : q ^ 2 ≠ 0 := pow_ne_zero 2 hq
  have hrate : Pr = ν / α := by
    rw [hPr, hru, hrθ]
    field_simp
  have hratio : ν / α = μ * cp / k := by
    rw [hν, hαdef]
    field_simp
  refine ⟨hrate, ?_, ?_⟩
  · rw [hrate, hratio]
    field_simp
  · rw [hrate, hratio]

end PhysJS.Prandtl

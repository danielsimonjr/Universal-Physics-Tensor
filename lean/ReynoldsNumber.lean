/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-155`. Bridge. The Reynolds number as viscous time over advection time.

The catalog product is `Re μ = ρ v L`. `reynolds_eq` takes a mode of
wavenumber `1 / L`, `exp(−r t) sin((x − v t) / L)`, carried at speed `v`
through a fluid of kinematic viscosity `ν`, so it solves
`∂u/∂t + v ∂u/∂x = ν ∂²u/∂x²`. `PhysJS.DiffusionMode.mode_solves_iff`
forces the viscous decay rate `r = ν / L²`. `Re` is the viscous decay time
`1 / r` over the advection time `L / v`:

```
Re = (1 / r) / (L / v) = v L / ν = ρ v L / μ,    ν = μ / ρ
```

It is not a friction correlation, and it is not the pipe factor of `be-77`.
-/

namespace PhysJS.ReynoldsNumber

open PhysJS.DiffusionMode

/-- Viscous decay time over advection time is `v L / ν` and `ρ v L / μ`.

`hu` says the advected mode of wavenumber `1 / L` and rate `r` solves
`∂u/∂t + v ∂u/∂x = ν ∂²u/∂x²`. -/
theorem reynolds_eq (Re ρ v L μ ν r τvisc τadv : ℝ)
    (hμ : μ ≠ 0) (hv : v ≠ 0) (hL : L ≠ 0) (hρ : ρ ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves r (1 / L) v ν)
    (hvisc : τvisc = 1 / r)
    (hadv : τadv = L / v)
    (hRe : Re = τvisc / τadv) :
    r = ν / L ^ 2 ∧ Re = v * L / ν ∧ Re * μ = ρ * v * L := by
  have hr := (mode_solves_iff r (1 / L) v ν (one_div_ne_zero hL)).1 hu
  have hν : ν ≠ 0 := by
    rw [hkin]
    exact div_ne_zero hμ hρ
  have hrate : r = ν / L ^ 2 := by
    rw [hr]
    field_simp
  have hform : Re = v * L / ν := by
    rw [hRe, hvisc, hadv, hrate]
    field_simp
  refine ⟨hrate, hform, ?_⟩
  rw [hform, hkin]
  field_simp

end PhysJS.ReynoldsNumber

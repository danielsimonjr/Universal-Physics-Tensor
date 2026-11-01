/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.DiffusionMode
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring
import Mathlib.Tactic.NormNum

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

/-- Pure time-ratio arithmetic: `L²/ν` over `L/v` is `v L/ν`. -/
theorem reynolds_time_quotient (τvisc τadv v L ν : ℝ)
    (hν : ν ≠ 0) (hv : v ≠ 0) (hL : L ≠ 0)
    (hvisc : τvisc = L ^ 2 / ν) (hadv : τadv = L / v) :
    τvisc / τadv = v * L / ν := by
  rw [hvisc, hadv]
  field_simp

/-- The viscous decay time of the advected mode of wavenumber `1/L` is `L²/ν`. -/
theorem viscous_decay_time (r ν L v : ℝ)
    (hL : L ≠ 0) (hν : ν ≠ 0)
    (hu : Solves r (1 / L) v ν) :
    1 / r = L ^ 2 / ν := by
  have hk : (1 / L) ≠ 0 := one_div_ne_zero hL
  have hr := (mode_solves_iff r (1 / L) v ν hk).1 hu
  rw [hr]
  field_simp

/-- Viscous decay time over advection time is `v L / ν` and `ρ v L / μ`. -/
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

/-- Zero advection speed gives zero Reynolds number from the catalog product. -/
theorem re_zero_of_zero_velocity (Re ρ v L μ : ℝ) (_hμ : μ ≠ 0) (hv : v = 0)
    (hRe : Re = ρ * v * L / μ) : Re = 0 := by
  rw [hRe, hv]
  ring_nf

/-- Doubling the length doubles `Re` at fixed `ρ`, `v`, and `μ`. -/
theorem reynolds_doubled_length (Re Re' ρ v μ L L' : ℝ)
    (hμ : μ ≠ 0) (_hv : v ≠ 0) (_hL : L ≠ 0) (_hρ : ρ ≠ 0)
    (hL' : L' = 2 * L)
    (hRe : Re = ρ * v * L / μ) (hRe' : Re' = ρ * v * L' / μ) :
    Re' = 2 * Re := by
  rw [hRe', hL', hRe]
  field_simp

/-- Catalog inputs give `Re = 100000`. -/
theorem re_catalog_integer : (1000 : ℝ) * 2 * (1 / 20) / (1 / 1000) = 100000 := by norm_num

/-- Doubling catalog length gives `Re = 200000`. -/
theorem re_catalog_doubled_length :
    (1000 : ℝ) * 2 * (2 / 20) / (1 / 1000) = 200000 := by norm_num

/-- The catalog pipe-flow point matches the mode time-ratio route. -/
theorem re_catalog_cross_check (Re ρ v L μ ν r τvisc τadv : ℝ)
    (hρ : ρ = 1000) (hv : v = 2) (hL : L = 1 / 20) (hμ : μ = 1 / 1000)
    (hμ0 : μ ≠ 0) (hv0 : v ≠ 0) (hL0 : L ≠ 0) (hρ0 : ρ ≠ 0)
    (hkin : ν = μ / ρ)
    (hu : Solves r (1 / L) v ν)
    (hvisc : τvisc = 1 / r) (hadv : τadv = L / v) (hRe : Re = τvisc / τadv) :
    Re = 100000 ∧ Re * μ = ρ * v * L := by
  have ⟨_, hform, _⟩ :=
    reynolds_eq Re ρ v L μ ν r τvisc τadv hμ0 hv0 hL0 hρ0 hkin hu hvisc hadv hRe
  have hνval : ν = 1 / 10 ^ 6 := by
    rw [hkin, hμ, hρ]
    norm_num
  have hReval : Re = 100000 := by
    rw [hform, hv, hL, hνval]
    norm_num
  exact ⟨hReval, by rw [hReval, hμ, hρ, hv, hL]; norm_num⟩

end PhysJS.ReynoldsNumber

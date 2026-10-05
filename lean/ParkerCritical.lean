/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Data.Real.Basic
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-118`. Bridge. The Parker critical radius.

Proved under these hypotheses. The wind is isothermal, with constant
sound speed `c_s`, and spherically symmetric. Mass conservation at one
radius is the real-number relation
`dρ/ρ + dv/v + 2 dr/r = 0`. Momentum is
`v dv = −c_s² dρ/ρ − G M dr / r²`, with the derivatives already
written as increments along the same displacement. The factor `2` is
the spherical divergence. A regular critical point has a finite
`dv/dr` while the coefficient of `dv/dr` vanishes, so the right-hand
side vanishes with it. Then `v² = c_s²` and `r_c = G M / (2 c_s²)`.
This file does not solve the transonic topology.
-/

namespace PhysJS.ParkerCritical

/-- Factored wind equation at one radius.

`hcont` is logarithmic continuity, including the spherical `2 dr/r`.
`hmom` is the isothermal momentum equation. Both are real increments,
not a fresh derivative. -/
theorem factored_wind (v cs r GM dρ dv dr ρ : ℝ)
    (hv : v ≠ 0) (hr : r ≠ 0) (hρ : ρ ≠ 0)
    (hcont : dρ / ρ + dv / v + 2 * dr / r = 0)
    (hmom : v * dv = -cs ^ 2 * (dρ / ρ) - GM * dr / r ^ 2) :
    (v - cs ^ 2 / v) * dv = (2 * cs ^ 2 / r - GM / r ^ 2) * dr := by
  have hρdr : dρ / ρ = -(dv / v) - 2 * dr / r := by
    linear_combination hcont
  have hmom' := hmom
  rw [hρdr] at hmom'
  linear_combination hmom'

/-- The regular critical point of an isothermal spherical wind.

Both factors of `factored_wind` vanish: the coefficient of `dv`, and
the spherical-gravity side. A nonzero `dv/dr` can then stay finite.
`hcs` keeps the sound speed nonzero. -/
theorem critical_radius (v cs r GM : ℝ)
    (hv : v ≠ 0) (hr : r ≠ 0) (hcs : cs ≠ 0)
    (hcoeff : v - cs ^ 2 / v = 0)
    (hgeom : 2 * cs ^ 2 / r - GM / r ^ 2 = 0) :
    v ^ 2 = cs ^ 2 ∧ r = GM / (2 * cs ^ 2) := by
  refine ⟨?_, ?_⟩
  · have h := hcoeff
    field_simp [hv] at h
    linarith
  · have h := hgeom
    field_simp [hr, hcs] at h
    rw [eq_div_iff (mul_ne_zero two_ne_zero (pow_ne_zero 2 hcs))]
    linarith

end PhysJS.ParkerCritical

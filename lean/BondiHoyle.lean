/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.ParkerCritical
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-197`. Bridge. Bondi-Hoyle accretion radius.

The catalog equation is

```
r_BH = 2 G M / (v² + c_s²)
```

Proved under these hypotheses. The accretion radius is defined as the
radius at which the Newtonian escape speed squared, `2 G M / r`, equals
the squared speed of the gas relative to the point mass, `v² + c_s²`
(bulk speed `v` and sound speed `c_s`, added in quadrature as a
convention). `radius_eq` solves that defining condition. At rest
(`v = 0`) it is `2 G M / c_s²`. `parker_ratio` reuses
`PhysJS.ParkerCritical.critical_radius` (`be-118`): the Parker sonic
radius `G M / (2 c_s²)` is a quarter of the at-rest Bondi radius, since
the two radii answer different questions.

Not proved: the quadrature sum and the factor 2, which are conventions of
the capture-radius definition (the exact Bondi accretion rate carries a
separate order-unity coefficient), or any accretion rate. `v² + c_s²` is
not forced by units: `bulk_only_ne` shows dropping `c_s²` changes the
radius.
-/

namespace PhysJS.BondiHoyle

/-- Capture radius from escape speed equal to relative speed. -/
theorem radius_eq (r GM v cs : ℝ) (hr : 0 < r) (hGM : 0 < GM)
    (hcs : 0 < cs)
    (hcapture : 2 * GM / r = v ^ 2 + cs ^ 2) :
    r = 2 * GM / (v ^ 2 + cs ^ 2) := by
  have hden : 0 < v ^ 2 + cs ^ 2 := by positivity
  rw [eq_div_iff hden.ne', ← hcapture]
  field_simp

/-- At rest the radius is `2 G M / c_s²`. -/
theorem at_rest (r GM cs : ℝ) (hr : 0 < r) (hGM : 0 < GM) (hcs : 0 < cs)
    (hcapture : 2 * GM / r = 0 ^ 2 + cs ^ 2) :
    r = 2 * GM / cs ^ 2 := by
  have h := radius_eq r GM 0 cs hr hGM hcs hcapture
  simpa using h

/-- The Parker sonic radius (be-118) is a quarter of the at-rest Bondi
radius. -/
theorem parker_ratio (rB rP v cs GM : ℝ) (hv : v ≠ 0) (hcs : cs ≠ 0)
    (hcoeff : v - cs ^ 2 / v = 0)
    (hgeom : 2 * cs ^ 2 / rP - GM / rP ^ 2 = 0) (hrP : rP ≠ 0)
    (hB : rB = 2 * GM / cs ^ 2) :
    rB = 4 * rP := by
  obtain ⟨_, hr⟩ := PhysJS.ParkerCritical.critical_radius v cs rP GM hv hrP hcs hcoeff hgeom
  rw [hB, hr]
  field_simp
  ring

/-- Dropping the sound speed changes the radius whenever `c_s ≠ 0`. -/
theorem bulk_only_ne (GM v cs : ℝ) (hGM : 0 < GM) (hv : 0 < v) (hcs : 0 < cs) :
    2 * GM / (v ^ 2 + cs ^ 2) ≠ 2 * GM / v ^ 2 := by
  intro h
  have h3 : 2 * GM / (v ^ 2 + cs ^ 2) < 2 * GM / v ^ 2 :=
    div_lt_div_of_pos_left (by positivity) (by positivity) (by nlinarith [sq_pos_of_pos hcs])
  linarith

end PhysJS.BondiHoyle

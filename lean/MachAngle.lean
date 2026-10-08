/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Inverse
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-244`. Bridge. Mach angle of a supersonic source.

The catalog equation is

```
sin μ = c / v
```

with `μ` the half-angle of the Mach cone, `c` the sound speed and `v > c`
the source speed. The premises are a steady point source in a uniform
medium. The source passes the origin at time 0 and is at `A = (v T, 0)`
at time `T`. The sound it emitted at time 0 lies on the circle of radius
`c T` about the origin. The Mach cone is the tangent from `A` to that circle:
the tangent point `P = (p_x, p_y)` has `|P| = c T` and `AP ⟂ OP`.

`sin_mu_eq` proves that the angle at `A` between the axis `AO` and the
tangent `AP`, with `sin μ = |p_y| / |AP|`, satisfies `sin μ = c / v`. It
shows the cone needs `v > c` (`no_cone_subsonic`) and that `v = 2c` gives
`μ = π/6`. It does not model a finite-size source, a non-uniform medium
or nonlinear (shock) steepening.
-/

namespace PhysJS.MachAngle

open Real

/-- Length of the tangent segment `AP`. -/
noncomputable def tangentLength (v T px py : ℝ) : ℝ :=
  Real.sqrt ((px - v * T) ^ 2 + py ^ 2)

/-- No real tangent exists for a subsonic or sonic source: `v ≤ c`
contradicts a genuine tangent point (`p_y ≠ 0`). -/
theorem no_cone_subsonic (c v T px py : ℝ)
    (hc : 0 < c) (hv : 0 < v) (hpy : py ≠ 0)
    (hcirc : px ^ 2 + py ^ 2 = (c * T) ^ 2)
    (hperp : (px - v * T) * px + py * py = 0) : c < v := by
  have hAP : (px - v * T) ^ 2 + py ^ 2 = (v ^ 2 - c ^ 2) * T ^ 2 := by nlinarith
  by_contra h
  push Not at h
  have h1 : 0 < py ^ 2 := by positivity
  have : v ^ 2 - c ^ 2 ≤ 0 := by nlinarith
  have h3 : (v ^ 2 - c ^ 2) * T ^ 2 ≤ 0 := by nlinarith [sq_nonneg T]
  have h2 : 0 < (px - v * T) ^ 2 + py ^ 2 := by positivity
  linarith

/-- The tangent from `A = (vT, 0)` to the circle `|P| = cT` subtends
`sin μ = |p_y| / |AP| = c / v`.

`hcirc` is `|P|² = (cT)²`, `hperp` is `(P − A)·P = 0`.

Not a model of a
finite-size source or a non-uniform medium. -/
theorem sin_mu_eq (c v T px py : ℝ)
    (hc : 0 < c) (hv : 0 < v) (hT : 0 < T) (hpy : py ≠ 0)
    (hcirc : px ^ 2 + py ^ 2 = (c * T) ^ 2)
    (hperp : (px - v * T) * px + py * py = 0) :
    |py| / tangentLength v T px py = c / v := by
  have hpx : v * T * px = (c * T) ^ 2 := by nlinarith
  have hAP : (px - v * T) ^ 2 + py ^ 2 = (v ^ 2 - c ^ 2) * T ^ 2 := by nlinarith
  have hsub : c < v := no_cone_subsonic c v T px py hc hv hpy hcirc hperp
  have hpos : 0 < (v ^ 2 - c ^ 2) * T ^ 2 := by
    have : 0 < v ^ 2 - c ^ 2 := by nlinarith
    positivity
  unfold tangentLength
  rw [hAP]
  have hpy2 : py ^ 2 = (c * T) ^ 2 * ((v ^ 2 - c ^ 2) * T ^ 2) / (v * T) ^ 2 := by
    have hpx' : px = (c * T) ^ 2 / (v * T) := by
      rw [eq_div_iff (by positivity)]; linarith
    have : py ^ 2 = (c * T) ^ 2 - px ^ 2 := by linarith
    rw [this, hpx']
    field_simp
  have hvc : v ^ 2 - c ^ 2 ≠ 0 := by nlinarith
  have hlhs : (|py| / Real.sqrt ((v ^ 2 - c ^ 2) * T ^ 2)) ^ 2 = (c / v) ^ 2 := by
    rw [div_pow, sq_abs, Real.sq_sqrt hpos.le, hpy2]
    field_simp
  have hl0 : 0 ≤ |py| / Real.sqrt ((v ^ 2 - c ^ 2) * T ^ 2) := by positivity
  have hr0 : 0 ≤ c / v := by positivity
  exact (pow_left_inj₀ hl0 hr0 two_ne_zero).mp hlhs

/-- At `v = 2c` the Mach angle is `30°`. -/
theorem mach_two (μ c : ℝ) (hc : 0 < c) (hμ : 0 < μ) (hμ' : μ ≤ π / 2)
    (h : Real.sin μ = c / (2 * c)) : μ = π / 6 := by
  have h2 : c / (2 * c) = 1 / 2 := by field_simp
  rw [h2, ← Real.sin_pi_div_six] at h
  have hpi := Real.pi_pos
  exact Real.injOn_sin ⟨by linarith, hμ'⟩ ⟨by linarith, by linarith⟩ h

/-- Units alone do not entail the first power of `c / v`: at `v = 2c`,
`sin μ = c/v = 1/2` differs from `(c/v)²`. -/
theorem power_not_fixed : ∃ c v : ℝ, 0 < c ∧ c < v ∧ c / v ≠ (c / v) ^ 2 :=
  ⟨1, 2, by norm_num, by norm_num, by norm_num⟩

end PhysJS.MachAngle

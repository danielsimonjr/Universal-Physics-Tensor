/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Inv
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-221`. Bridge. Hill radius.

The catalog equation is

```
r_H = a (m / (3 M))^{1/3}
```

Set up the restricted three-body problem on the star-planet line in the
frame rotating with the planet's mean motion `ω`, `ω² = G M / a³` (circular
orbit, `m ≪ M`). A test particle displaced by `r` toward the star feels, on
the star side, the net acceleration (outward positive)

```
f(r) = −G M / (a − r)² + ω² (a − r),     f(0) = 0
```

`hasDerivAt_f` computes `f'(0) = −2 G M / a³ − ω² = −3 ω²`
(`tidal_coefficient`: the factor 3 is tidal `2` plus centrifugal `1`).
Linearising, the net acceleration toward the star is `3 ω² r`, and the
planet's attraction `G m / r²` balances it at the Hill radius:
`G m / r² = 3 ω² r`. `hill_cubed` derives `r³ = a³ m / (3 M)` and
`hill_eq` the cube-root form.

Premises (hypotheses): circular orbit, `m ≪ M`, the linearisation of the
tidal field in `r / a` (`hlin`), restricted three-body problem. The Hill
radius is the leading-order Lagrange `L1` distance, not the exact `L1`.
The 1.50e9 m figure is not evaluated.
-/

namespace PhysJS.HillRadius

/-- Net acceleration of the star's gravity and the centrifugal force at distance
`a − r` from the star, outward positive. -/
noncomputable def f (G M ω a r : ℝ) : ℝ :=
  -(G * M) * ((a - r)⁻¹) ^ 2 + ω ^ 2 * (a - r)

theorem hasDerivAt_f (G M ω a r : ℝ) (hr : a - r ≠ 0) :
    HasDerivAt (f G M ω a) (-2 * G * M * ((a - r)⁻¹) ^ 3 - ω ^ 2) r := by
  have hs : HasDerivAt (fun y : ℝ => a - y) (-1) r := by
    simpa using (hasDerivAt_id r).const_sub a
  have hi := hs.inv hr
  have hp := hi.pow 2
  have h := (hp.const_mul (-(G * M))).add (hs.const_mul (ω ^ 2))
  have hfun : f G M ω a = fun y : ℝ => -(G * M) * ((a - y)⁻¹) ^ 2 + ω ^ 2 * (a - y) := rfl
  rw [hfun]
  refine h.congr_deriv ?_
  simp only [Pi.inv_apply]
  push_cast
  field_simp
  ring

/-- `f'(0) = −3 ω²` when `ω² = G M / a³`. -/
theorem tidal_coefficient (G M ω a : ℝ) (ha : 0 < a) (hω : ω ^ 2 = G * M / a ^ 3) :
    -2 * G * M * ((a - 0)⁻¹) ^ 3 - ω ^ 2 = -(3 * ω ^ 2) := by
  have : a ≠ 0 := ha.ne'
  rw [sub_zero, hω]
  field_simp
  ring

/-- Balance `G m / r² = 3 ω² r` gives `r³ = a³ m / (3 M)`. -/
theorem hill_cubed (G M m ω a r : ℝ) (hG : 0 < G) (hM : 0 < M)
    (ha : 0 < a) (hr : 0 < r) (hω : ω ^ 2 = G * M / a ^ 3)
    (hbal : G * m / r ^ 2 = 3 * ω ^ 2 * r) :
    r ^ 3 = a ^ 3 * (m / (3 * M)) := by
  have : r ≠ 0 := hr.ne'
  rw [hω] at hbal
  field_simp at hbal
  field_simp
  nlinarith [hbal]

/-- Hill radius from the linearised rotating-frame tidal field.
`hlin` is the linearisation `f(r) ≈ f'(0) r` of the net acceleration; the
planet's pull `G m / r²` balances its magnitude. -/
theorem hill_eq (G M m ω a r : ℝ) (hG : 0 < G) (hM : 0 < M) (hm : 0 < m)
    (ha : 0 < a) (hr : 0 < r) (hω : ω ^ 2 = G * M / a ^ 3)
    (d : ℝ) (hd : HasDerivAt (f G M ω a) d 0)
    (hlin : G * m / r ^ 2 = -(d * r)) :
    r = a * (m / (3 * M)) ^ ((1 : ℝ) / 3) := by
  have hd0 := hasDerivAt_f G M ω a 0 (by rw [sub_zero]; exact ha.ne')
  have hdd : d = -2 * G * M * ((a - 0)⁻¹) ^ 3 - ω ^ 2 := hd.unique hd0
  rw [tidal_coefficient G M ω a ha hω] at hdd
  have hbal : G * m / r ^ 2 = 3 * ω ^ 2 * r := by rw [hlin, hdd]; ring
  have hcube := hill_cubed G M m ω a r hG hM ha hr hω hbal
  have hq : 0 < m / (3 * M) := by positivity
  have hrhs : 0 < a * (m / (3 * M)) ^ ((1 : ℝ) / 3) := by positivity
  have hcube' : (a * (m / (3 * M)) ^ ((1 : ℝ) / 3)) ^ 3 = a ^ 3 * (m / (3 * M)) := by
    rw [mul_pow]
    congr 1
    rw [← Real.rpow_natCast, ← Real.rpow_mul hq.le]
    norm_num
  exact (pow_left_inj₀ hr.le hrhs.le (by norm_num : (3 : ℕ) ≠ 0)).mp (hcube.trans hcube'.symm)

/-- Negative control: with no rotation (star gravity only) the tidal slope is `2 G M / a³`,
not `3 G M / a³`, so the cube would be `a³ m / (2 M)`, a different radius. -/
theorem no_centrifugal_differs (M m a : ℝ) (hM : 0 < M) (hm : 0 < m) (ha : 0 < a) :
    a ^ 3 * (m / (2 * M)) ≠ a ^ 3 * (m / (3 * M)) := by
  intro h
  have h3 : a ^ 3 ≠ 0 := by positivity
  have := mul_left_cancel₀ h3 h
  field_simp at this
  linarith

end PhysJS.HillRadius

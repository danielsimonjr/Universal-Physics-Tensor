/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Analysis.SpecialFunctions.Sqrt
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-219`. Bridge. Geodetic (de Sitter) precession of a gyroscope.

The catalog equation is

```
Ω = (3/2) (G M)^{3/2} / (c² r^{5/2})
```

Premises (hypotheses): the weak-field gyroscope precession rate of a
gyroscope moving at speed `v` through the Newtonian field `G M / r²` is

```
Ω = (γ_P + 1/2) (G M / (c² r²)) v
```

(`hrate`; `γ_P` is the PPN space-curvature parameter, `1/2` is the
frame-transport (Thomas-like) part, `γ_P = 1` in general relativity), and the
orbit is circular, `v² = G M / r` (`hv`). `geodetic_eq` derives the
catalog form at `γ_P = 1` in the rpow form of the catalog;
`angle_per_orbit` gives `3π G M / (c² r)` radians per revolution.

Not a derivation of the `γ_P + 1/2` rate from the metric and not the
Lense-Thirring term. The 6605 mas/yr value is not evaluated.
-/

namespace PhysJS.GeodeticPrecession

open Real

/-- Catalog form of the geodetic precession for `γ_P = 1`. -/
theorem geodetic_eq (G M c r v Ω : ℝ) (hG : 0 < G) (hM : 0 < M) (hc : 0 < c)
    (hr : 0 < r) (hvpos : 0 < v) (hv : v ^ 2 = G * M / r)
    (hrate : Ω = (1 + 1 / 2) * (G * M / (c ^ 2 * r ^ 2)) * v) :
    Ω = 3 / 2 * (G * M) ^ ((3 : ℝ) / 2) / (c ^ 2 * r ^ ((5 : ℝ) / 2)) := by
  have hGM : 0 < G * M := mul_pos hG hM
  have hvs : v = Real.sqrt (G * M / r) := by
    rw [← hv]; exact (Real.sqrt_sq hvpos.le).symm
  have h1 : (G * M) ^ ((3 : ℝ) / 2) = G * M * Real.sqrt (G * M) := by
    rw [show ((3 : ℝ) / 2) = 1 + 1 / 2 by norm_num, Real.rpow_add hGM, Real.rpow_one,
      ← Real.sqrt_eq_rpow]
  have h2 : r ^ ((5 : ℝ) / 2) = r ^ 2 * Real.sqrt r := by
    rw [show ((5 : ℝ) / 2) = 2 + 1 / 2 by norm_num, Real.rpow_add hr, ← Real.sqrt_eq_rpow]
    norm_cast
  have hsr : 0 < Real.sqrt r := Real.sqrt_pos.mpr hr
  have hsg : 0 < Real.sqrt (G * M) := Real.sqrt_pos.mpr hGM
  rw [hrate, hvs, h1, h2, Real.sqrt_div hGM.le]
  field_simp
  norm_num

/-- Angle per orbit: `Ω T = 3π G M / (c² r)` with `T = 2π / ω`, `ω = v / r`. -/
theorem angle_per_orbit (G M c r v Ω ω T : ℝ) (hr : 0 < r) (hvpos : 0 < v)
    (hrate : Ω = (1 + 1 / 2) * (G * M / (c ^ 2 * r ^ 2)) * v)
    (hω : ω = v / r) (hT : T = 2 * π / ω) :
    Ω * T = 3 * π * (G * M) / (c ^ 2 * r) := by
  have hω0 : ω ≠ 0 := by rw [hω]; positivity
  rw [hT, hrate, hω]
  field_simp
  ring

/-- Negative controls: space curvature `γ_P = 0` (frame transport only) gives `1/2`, not `3/2`;
Newtonian gravity with no frame transport (`γ_P = −1/2`) gives no precession. -/
theorem gamma_matters : ((0 : ℝ) + 1 / 2) ≠ 1 + 1 / 2 ∧ ((-1 / 2 : ℝ) + 1 / 2) = 0 := by
  constructor <;> norm_num

/-- Different power: `r^{-3/2}` (the Kepler frequency) is not `r^{-5/2}`: they differ for `r ≠ 1`. -/
theorem power_not_three_halves (r : ℝ) (hr : 0 < r) (hr1 : r ≠ 1) :
    r ^ (-(5 : ℝ) / 2) ≠ r ^ (-(3 : ℝ) / 2) := by
  intro h
  have h1 : r ^ (-(5 : ℝ) / 2) = r ^ (-(3 : ℝ) / 2) * r ^ (-1 : ℝ) := by
    rw [← Real.rpow_add hr]; norm_num
  rw [h1] at h
  have hp : 0 < r ^ (-(3 : ℝ) / 2) := Real.rpow_pos_of_pos hr _
  have : r ^ (-1 : ℝ) = 1 := by
    have := mul_left_cancel₀ hp.ne' (by linarith : r ^ (-(3 : ℝ) / 2) * r ^ (-1 : ℝ) =
      r ^ (-(3 : ℝ) / 2) * 1)
    exact this
  rw [Real.rpow_neg_one] at this
  exact hr1 (inv_eq_one.mp this)

end PhysJS.GeodeticPrecession

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.SteadyProfile
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.LinearCombination
import Mathlib.Tactic.Ring

/-!
`be-156`. Bridge. The Biot number as the internal over the external temperature drop.

The catalog product is `Bi k = h L_c`. `biot_eq` takes a plane wall of
thickness `L`, conductivity `k`, in steady conduction (`T'' = 0`), with the
face `x = L` cooled by a fluid at `T∞`. Fourier conduction meets Newton
cooling there, `−k T'(L) = h (T(L) − T∞)`. `PhysJS.SteadyProfile.linear_profile`
makes the profile linear, and the ratio of the drop across the wall to the
drop into the fluid is

```
Bi = (T(0) − T(L)) / (T(L) − T∞) = h L / k = h V / (k A),    L = V / A
```

`hcoeff` is the heat-transfer coefficient. This is not a lumped-capacitance
criterion.
-/

namespace PhysJS.Biot

open PhysJS.SteadyProfile

/-- The steady wall's internal drop over its surface drop is `h L / k`.

`h1`, `h2` and `h0` say `T` is twice differentiable with `T'' = 0`.
`hrobin` is `−k T'(L) = h (T(L) − T∞)`. -/
theorem biot_eq (T : ℝ → ℝ) (Bi hcoeff k L V A Tinf : ℝ)
    (hk : k ≠ 0) (hA : A ≠ 0)
    (h1 : Differentiable ℝ T) (h2 : Differentiable ℝ (deriv T))
    (h0 : ∀ x, deriv (deriv T) x = 0)
    (hrobin : -k * deriv T L = hcoeff * (T L - Tinf))
    (hext : T L ≠ Tinf)
    (hLdef : L = V / A)
    (hBi : Bi = (T 0 - T L) / (T L - Tinf)) :
    Bi = hcoeff * L / k ∧ Bi = hcoeff * V / (k * A) ∧ Bi * k = hcoeff * L := by
  obtain ⟨hslope, hlin⟩ := linear_profile T h1 h2 h0
  rw [hslope L] at hrobin
  have hext' : T L - Tinf ≠ 0 := sub_ne_zero.mpr hext
  have hdrop : T 0 - T L = -(deriv T 0 * L) := by
    rw [hlin L]
    ring
  have hform : Bi = hcoeff * L / k := by
    rw [hBi, hdrop, div_eq_div_iff hext' hk]
    linear_combination L * hrobin
  refine ⟨hform, ?_, ?_⟩
  · rw [hform, hLdef]
    field_simp
  · rw [hform]
    field_simp

end PhysJS.Biot

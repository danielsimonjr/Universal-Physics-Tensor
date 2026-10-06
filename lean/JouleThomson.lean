/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-163`. Bridge. The Joule–Thomson coefficient.

The enthalpy differential

```
dh = c_p dT + (v − T (∂v/∂T)_p) dP
```

is a hypothesis. At constant enthalpy it rearranges to

```
μ_JT c_p = T (∂v/∂T)_p − v
```

`joule_thomson_eq` is that rearrangement. For an ideal gas
`v = R T / P` the bracket vanishes, so `μ_JT = 0`. A measured inversion
curve is not this row.
-/

namespace PhysJS.JouleThomson

/-- Isenthalpic slope, and the ideal-gas bracket.

`hisen` is `μ_JT = −(∂h/∂P)_T / (∂h/∂T)_P` with the two partials from the
enthalpy differential. `hideal` and `hdv` are the ideal-gas volume and its
isobaric derivative.

Kind `bridge` on `PhysJS.JouleThomson.joule_thomson_eq`, once the catalog
entry exists. The covers line still begins with `derivation-step`. -/
theorem joule_thomson_eq (μJT cp T v dvdT P Rgas dhdT dhdP : ℝ)
    (hcp : cp ≠ 0) (hT : T ≠ 0) (hP : P ≠ 0)
    (hdhT : dhdT = cp)
    (hdhP : dhdP = v - T * dvdT)
    (hisen : μJT = -dhdP / dhdT)
    (hv : v = Rgas * T / P)
    (hdv : dvdT = Rgas / P) :
    μJT * cp = T * dvdT - v ∧ T * dvdT - v = 0 ∧ μJT = 0 := by
  have hprod : μJT * cp = T * dvdT - v := by
    rw [hisen, hdhT, hdhP]
    field_simp [hcp]
    ring
  have hbracket : T * dvdT - v = 0 := by
    rw [hdv, hv]
    field_simp [hT, hP]
    ring
  refine ⟨hprod, hbracket, ?_⟩
  exact (mul_eq_zero.mp (hprod.trans hbracket)).resolve_right hcp

end PhysJS.JouleThomson

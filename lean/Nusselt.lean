/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.SteadyProfile
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-157`. Bridge. The Nusselt number, the wall gradient, and `Nu = 1` for conduction.

The catalog product is `Nu k = h L`. At the wall `x = 0` of a fluid with
temperature profile `T`, Newton cooling equals Fourier conduction,
`h (T_w − T∞) = −k T'(0)`. Then

```
Nu = h L / k = L (−T'(0)) / (T_w − T∞)
```

is the dimensionless wall gradient. `nusselt_eq` also proves that a layer
of thickness `L` in pure steady conduction (`T'' = 0`, `T(L) = T∞`) has
`Nu = 1`, so `Nu` measures convection against conduction alone. It is not a
correlation for `Nu`.
-/

namespace PhysJS.Nusselt

open PhysJS.SteadyProfile

/-- `Nu = h L / k` is the wall gradient, and a conducting layer has `Nu = 1`.

`hwall` is `T(0) = T_w`, and `hfilm` is `h (T_w − T∞) = −k T'(0)`. -/
theorem nusselt_eq (T : ℝ → ℝ) (Nu hcoeff k L Tw Tinf : ℝ)
    (hk : k ≠ 0) (hL : L ≠ 0) (hΔ : Tw - Tinf ≠ 0)
    (hwall : T 0 = Tw)
    (hfilm : hcoeff * (Tw - Tinf) = -k * deriv T 0)
    (hNu : Nu = hcoeff * L / k) :
    Nu = L * (-deriv T 0) / (Tw - Tinf) ∧ Nu * k = hcoeff * L ∧
      (Differentiable ℝ T → Differentiable ℝ (deriv T) → (∀ x, deriv (deriv T) x = 0) →
        T L = Tinf → Nu = 1) := by
  have hcoef : hcoeff = k * (-deriv T 0) / (Tw - Tinf) := by
    field_simp
    linarith
  have hgrad : Nu = L * (-deriv T 0) / (Tw - Tinf) := by
    rw [hNu, hcoef]
    field_simp
  refine ⟨hgrad, ?_, ?_⟩
  · rw [hNu]
    field_simp
  · intro h1 h2 h0 hfar
    rw [hgrad, slab_slope T L hL h1 h2 h0 0, hfar, hwall]
    field_simp
    ring

end PhysJS.Nusselt

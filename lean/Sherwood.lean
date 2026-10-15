/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import lean.SteadyProfile
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
`be-159`. Bridge. The Sherwood number, the wall gradient, and `Sh = 1` for diffusion.

The catalog product is `Sh D = k_m L`. At the wall `x = 0` of a fluid with
concentration profile `c`, the mass-transfer coefficient equals Fick
diffusion, `k_m (c_w − c∞) = −D c'(0)`. Then

```
Sh = k_m L / D = L (−c'(0)) / (c_w − c∞)
```

is the dimensionless wall gradient. `sherwood_eq` also proves that a layer
of thickness `L` in pure steady diffusion (`c'' = 0`, `c(L) = c∞`) has
`Sh = 1`. It is not a correlation for `Sh`.
-/

namespace PhysJS.Sherwood

open PhysJS.SteadyProfile

/-- `Sh = k_m L / D` is the wall gradient, and a diffusing layer has `Sh = 1`.

`hwall` is `c(0) = c_w`, and `hfilm` is `k_m (c_w − c∞) = −D c'(0)`. -/
theorem sherwood_eq (c : ℝ → ℝ) (Sh km D L cw cinf : ℝ)
    (hD : D ≠ 0) (hL : L ≠ 0) (hΔ : cw - cinf ≠ 0)
    (hwall : c 0 = cw)
    (hfilm : km * (cw - cinf) = -D * deriv c 0)
    (hSh : Sh = km * L / D) :
    Sh = L * (-deriv c 0) / (cw - cinf) ∧ Sh * D = km * L ∧
      (Differentiable ℝ c → Differentiable ℝ (deriv c) → (∀ x, deriv (deriv c) x = 0) →
        c L = cinf → Sh = 1) := by
  have hcoef : km = D * (-deriv c 0) / (cw - cinf) := by
    field_simp
    linarith
  have hgrad : Sh = L * (-deriv c 0) / (cw - cinf) := by
    rw [hSh, hcoef]
    field_simp
  refine ⟨hgrad, ?_, ?_⟩
  · rw [hSh]
    field_simp
  · intro h1 h2 h0 hfar
    rw [hgrad, slab_slope c L hL h1 h2 h0 0, hfar, hwall]
    field_simp
    ring

end PhysJS.Sherwood

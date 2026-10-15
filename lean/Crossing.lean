/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-35`. Derivation step. Antisymmetry of one block, off the diagonal.

For a real function `g`,

```
g(u,v) − g(v,u) = −( g(v,u) − g(u,v) )
```

The swap is the negation of a difference. The residual is `0` for every
`g` when `u = v`, including `u = v = 1/4`, so that point is not a
control. A block that is not symmetric does not vanish at `u = 1/2`,
`v = 1/4`. This is not the infinite sum over `(Δ, ℓ)`, and not
positivity or unitarity. The catalog records this id as not-a-bridge.
This lemma does not decide that.
-/

namespace PhysJS.Crossing

/-- One-block residual `g(u,v) − g(v,u)`. -/
def residual (g : ℝ → ℝ → ℝ) (u v : ℝ) : ℝ :=
  g u v - g v u

/-- The residual is antisymmetric, and it vanishes on the diagonal for every `g`.

`u = v = 1/4` is that diagonal fact, not a control. The swap identity is
the negation of a difference. Covers the derivation step of `be-35`.
Not the conformal-bootstrap programme. -/
theorem antisymmetry (g : ℝ → ℝ → ℝ) (u v : ℝ) :
    residual g u v = -(residual g v u) ∧
      (u = v → residual g u v = 0) ∧
      residual g (1 / 4) (1 / 4) = 0 := by
  refine ⟨?_, ?_, ?_⟩
  · unfold residual
    ring
  · rintro rfl
    unfold residual
    ring
  · unfold residual
    ring

/-- At `u = 1/2`, `v = 1/4` a non-symmetric block does not vanish.
The same block does vanish at `u = v = 1/4`. -/
theorem wrong_point :
    let g : ℝ → ℝ → ℝ := fun u _ => u
    g (1 / 2) (1 / 4) ≠ g (1 / 4) (1 / 2) ∧
      residual g (1 / 2) (1 / 4) ≠ 0 ∧
      residual g (1 / 4) (1 / 4) = 0 := by
  refine ⟨?_, ?_, ?_⟩
  · have hlt : (1 : ℝ) / 4 < 1 / 2 := by
      field_simp
      linarith
    exact hlt.ne.symm
  · unfold residual
    have hne : (1 : ℝ) / 2 - 1 / 4 ≠ 0 := by
      field_simp
      linarith
    simpa using hne
  · unfold residual
    ring

end PhysJS.Crossing

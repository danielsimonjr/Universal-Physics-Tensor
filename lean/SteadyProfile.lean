/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring

/-!
Shared lemma. Steady one-dimensional conduction or diffusion has a linear profile.

A steady temperature or concentration with no source satisfies
`d²T/dx² = 0`. `linear_profile` proves that such a profile is

```
T(x) = T(0) + T'(0) x,    T'(x) = T'(0)
```

so the conductive or diffusive flux `−k T'` is the same at every `x`.
`slab_slope` is the slope between two held faces. The Biot, Nusselt and
Sherwood files use these.
-/

namespace PhysJS.SteadyProfile

/-- `T'' = 0` everywhere makes `T` linear with a constant slope. -/
theorem linear_profile (T : ℝ → ℝ) (h1 : Differentiable ℝ T)
    (h2 : Differentiable ℝ (deriv T)) (h0 : ∀ x, deriv (deriv T) x = 0) :
    (∀ x, deriv T x = deriv T 0) ∧ ∀ x, T x = T 0 + deriv T 0 * x := by
  have hslope : ∀ x, deriv T x = deriv T 0 := fun x => is_const_of_deriv_eq_zero h2 h0 x 0
  refine ⟨hslope, ?_⟩
  have hg : Differentiable ℝ (fun x => T x - deriv T 0 * x) :=
    h1.sub ((differentiable_id).const_mul _)
  have hg0 : ∀ x, deriv (fun x => T x - deriv T 0 * x) x = 0 := by
    intro x
    have hd : HasDerivAt (fun x => T x - deriv T 0 * x) (deriv T x - deriv T 0 * 1) x :=
      (h1 x).hasDerivAt.sub ((hasDerivAt_id x).const_mul _)
    rw [hd.deriv, hslope x]
    ring
  intro x
  have := is_const_of_deriv_eq_zero hg hg0 x 0
  simp only [mul_zero, sub_zero] at this
  linarith

/-- Between faces held at `T(0)` and `T(L)` the steady slope is `(T(L) − T(0)) / L`. -/
theorem slab_slope (T : ℝ → ℝ) (L : ℝ) (hL : L ≠ 0) (h1 : Differentiable ℝ T)
    (h2 : Differentiable ℝ (deriv T)) (h0 : ∀ x, deriv (deriv T) x = 0) :
    ∀ x, deriv T x = (T L - T 0) / L := by
  obtain ⟨hslope, hlin⟩ := linear_profile T h1 h2 h0
  intro x
  rw [hslope x, hlin L]
  field_simp
  ring

end PhysJS.SteadyProfile

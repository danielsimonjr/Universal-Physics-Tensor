/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.Pow.Real
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Ring

/-!
`be-136`. Bridge. Two-dimensional density of states, both spins.

The catalog equation, per area per energy, is

```
g(E) = m / (π ℏ²)
```

independent of `E`. `dos_2d` derives it. Two spins fill a disk,

```
n = 2 · (π k²) / (2 π)² = k² / (2 π)
```

and one isotropic parabola `E = ℏ² k² / (2 m)` turns that count into
`n = m E / (π ℏ²)`. The derivative is the constant `m / (π ℏ²)`. A valley
degeneracy `g_v ≠ 1` multiplies the result. `m ≠ 0` and `ℏ ≠ 0`.
-/

namespace PhysJS.DensityOfStates2D

open Real

/-- Two spins in the disk. -/
theorem state_count (k n : ℝ)
    (hcount : n = 2 * (Real.pi * k ^ 2) / (2 * Real.pi) ^ 2) :
    n = k ^ 2 / (2 * Real.pi) := by
  have hπ : Real.pi ≠ 0 := Real.pi_ne_zero
  have hden : (2 * Real.pi) ^ 2 ≠ 0 := pow_ne_zero 2 (mul_ne_zero (by norm_num) hπ)
  rw [hcount]
  field_simp [hden, hπ]

/-- The cumulative `m E / (π ℏ²)` has derivative `m / (π ℏ²)`. -/
theorem hasDerivAt_cumulative (m hbar E : ℝ) (hh : hbar ≠ 0) :
    HasDerivAt (fun t => m * t / (Real.pi * hbar ^ 2)) (m / (Real.pi * hbar ^ 2)) E := by
  have hid := (hasDerivAt_id E).const_mul (m / (Real.pi * hbar ^ 2))
  have hπ : Real.pi * hbar ^ 2 ≠ 0 :=
    mul_ne_zero Real.pi_ne_zero (pow_ne_zero 2 hh)
  convert hid using 1
  · funext t
    simp [id, div_eq_mul_inv, mul_comm, mul_left_comm, mul_assoc]
  · ring

/-- Two-dimensional density of states.

`hcount` is two spins in the disk. `hband` is one isotropic parabola.

Not a valley
degeneracy. -/
theorem dos_2d (n g k E m hbar : ℝ) (hm : m ≠ 0) (hh : hbar ≠ 0)
    (hcount : n = 2 * (Real.pi * k ^ 2) / (2 * Real.pi) ^ 2)
    (hband : E = hbar ^ 2 * k ^ 2 / (2 * m))
    (hg : HasDerivAt (fun t => m * t / (Real.pi * hbar ^ 2)) g E) :
    n = m * E / (Real.pi * hbar ^ 2) ∧ g = m / (Real.pi * hbar ^ 2) := by
  have hdisk := state_count k n hcount
  have hk2 : k ^ 2 = 2 * m * E / hbar ^ 2 := by
    have hclear : E * (2 * m) = hbar ^ 2 * k ^ 2 := by
      rw [hband]
      field_simp [hm, hh]
    have hden : hbar ^ 2 ≠ 0 := pow_ne_zero 2 hh
    field_simp [hden, hm] at hclear ⊢
    linarith
  have hn : n = m * E / (Real.pi * hbar ^ 2) := by
    rw [hdisk, hk2]
    field_simp [hh, Real.pi_ne_zero]
  refine ⟨hn, ?_⟩
  exact hg.unique (hasDerivAt_cumulative m hbar E hh)

/-- A valley factor other than `1` is not this density. -/
theorem valley_not_one (gv m hbar : ℝ) (hg : gv ≠ 1) (hm : m ≠ 0) (hh : hbar ≠ 0) :
    gv * m / (Real.pi * hbar ^ 2) ≠ m / (Real.pi * hbar ^ 2) := by
  intro hEq
  have hden : Real.pi * hbar ^ 2 ≠ 0 :=
    mul_ne_zero Real.pi_ne_zero (pow_ne_zero 2 hh)
  have hscale : m / (Real.pi * hbar ^ 2) ≠ 0 := div_ne_zero hm hden
  have hmul : gv * (m / (Real.pi * hbar ^ 2)) = m / (Real.pi * hbar ^ 2) := by
    simpa [mul_div_assoc] using hEq
  have hone : gv = 1 := by
    apply mul_right_cancel₀ hscale
    simpa [one_mul] using hmul
  exact hg hone

end PhysJS.DensityOfStates2D

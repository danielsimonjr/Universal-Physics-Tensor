/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

/-!
`be-55`. Bridge. The integer Hall reciprocal, not TKNN.

The encoded scalar, for a nonzero integer plateau index `C` and `e ≠ 0`, is

```
σ_xy = C e² / h,    R_H = h / (C e²),    R_K = h / e²
```

so `σ_xy R_H = 1` and `R_H = R_K / C`. A shifted index `C + 1` is a different
plateau. Replacing `e²` by `e` makes the product fail to be `1`, except at
`e = 1`, where the two powers agree. This does not prove that `C` is a Chern
number, and the post-2019 exactness of `R_K` is a metrological convention.
-/

namespace PhysJS.QuantumHall

/-- Hall conductance `σ_xy = C e² / h`. -/
noncomputable def sigma (C : ℤ) (e h : ℝ) : ℝ :=
  (C : ℝ) * e ^ 2 / h

/-- Hall resistance `R_H = h / (C e²)`. -/
noncomputable def hallResistance (C : ℤ) (e h : ℝ) : ℝ :=
  h / ((C : ℝ) * e ^ 2)

/-- von Klitzing constant `R_K = h / e²`. -/
noncomputable def vonKlitzing (e h : ℝ) : ℝ :=
  h / e ^ 2

/-- `σ_xy R_H = 1` and `R_H = R_K / C`.

Not the TKNN theorem. -/
theorem reciprocal (C : ℤ) (e h : ℝ) (hC : C ≠ 0) (he : e ≠ 0) (hh : h ≠ 0) :
    sigma C e h = (C : ℝ) * e ^ 2 / h ∧
      hallResistance C e h = h / ((C : ℝ) * e ^ 2) ∧
      vonKlitzing e h = h / e ^ 2 ∧
      sigma C e h * hallResistance C e h = 1 ∧
      hallResistance C e h = vonKlitzing e h / (C : ℝ) := by
  unfold sigma hallResistance vonKlitzing
  have hC0 : (C : ℝ) ≠ 0 := mt Int.cast_eq_zero.mp hC
  have he2 : e ^ 2 ≠ 0 := pow_ne_zero 2 he
  refine ⟨rfl, rfl, rfl, ?_, ?_⟩
  · field_simp [hC0, he2, hh]
  · field_simp [hC0, he2, hh]

/-- A shifted plateau index is a different conductance, and `e` in place of `e²`
does not give product `1` when `e ≠ 1`. -/
theorem wrong_dictionary (C : ℤ) (e h : ℝ) (hC : C ≠ 0) (he : e ≠ 0) (he1 : e ≠ 1)
    (hh : h ≠ 0) :
    sigma (C + 1) e h ≠ sigma C e h ∧
      ((C : ℝ) * e / h) * hallResistance C e h ≠ 1 := by
  have hC0 : (C : ℝ) ≠ 0 := mt Int.cast_eq_zero.mp hC
  have he2 : e ^ 2 ≠ 0 := pow_ne_zero 2 he
  constructor
  · intro hEq
    unfold sigma at hEq
    field_simp [hh, he2] at hEq
    have hCeq : (C + 1 : ℤ) = C := Int.cast_injective hEq
    linarith
  · intro hEq
    unfold hallResistance at hEq
    field_simp [hC0, he2, hh] at hEq
    exact he1 hEq.symm

end PhysJS.QuantumHall

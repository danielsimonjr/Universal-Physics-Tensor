/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.FieldSimp

/-!
`be-50`. Bridge. The catalog half-sum, and the time-symmetric residual.

When `A_ret + A_adv ≠ 0`,

```
(A_ret − A_adv) / (A_ret + A_adv) = 0  ↔  A_ret = A_adv
```

The encoded field is the half-sum `(A_ret + A_adv) / 2`, and twice that
field is the residual's denominator. A fully retarded field,
`A_adv = 0` with `A_ret ≠ 0`, gives residual `1`, not `0`. The id is
contested. This lemma does not decide the contest, and it is not the
absorber boundary condition as a theory of radiation reaction.
-/

namespace PhysJS.TimeSymmetric

/-- Time-symmetry residual `(A_ret − A_adv) / (A_ret + A_adv)`. -/
noncomputable def residual (Aret Aadv : ℝ) : ℝ :=
  (Aret - Aadv) / (Aret + Aadv)

/-- Encoded field, the half-sum `(A_ret + A_adv) / 2`. -/
noncomputable def symmetricField (Aret Aadv : ℝ) : ℝ :=
  (Aret + Aadv) / 2

/-- Twice the half-sum is the residual's denominator. -/
lemma twice_half (Aret Aadv : ℝ) : 2 * symmetricField Aret Aadv = Aret + Aadv := by
  unfold symmetricField
  rw [mul_div_cancel₀ _ (by norm_num : (2 : ℝ) ≠ 0)]

/-- Component `A_μ(x)` of the time-symmetric potential. -/
noncomputable def potential {X : Type*} (Aret Aadv : X → Fin 4 → ℝ) (x : X) (μ : Fin 4) : ℝ :=
  (Aret x μ + Aadv x μ) / 2

/-- The catalog equation

```
A_μ(x) = ½ (A_μ^ret(x) + A_μ^adv(x))
```

Twice the component is the sum of the retarded and advanced components.
`residual_iff` remains the vanishing of the residual. Not the absorber
theory of radiation reaction. -/
theorem wheeler_feynman {X : Type*} (Aret Aadv : X → Fin 4 → ℝ) (x : X) (μ : Fin 4) :
    potential Aret Aadv x μ = (Aret x μ + Aadv x μ) / 2 ∧
      2 * potential Aret Aadv x μ = Aret x μ + Aadv x μ := by
  unfold potential
  refine ⟨rfl, ?_⟩
  rw [mul_div_cancel₀ _ (by norm_num : (2 : ℝ) ≠ 0)]

/-- The residual vanishes if and only if `A_ret = A_adv`.

`residual_iff` is separate from the formalRef.
Not the absorber theory. -/
theorem residual_iff (Aret Aadv : ℝ) (hsum : Aret + Aadv ≠ 0) :
    2 * symmetricField Aret Aadv = Aret + Aadv ∧
      (residual Aret Aadv = 0 ↔ Aret = Aadv) := by
  refine ⟨twice_half Aret Aadv, ?_⟩
  unfold residual
  constructor
  · intro h
    rcases div_eq_zero_iff.mp h with hzero | hden
    · exact sub_eq_zero.mp hzero
    · exact absurd hden hsum
  · rintro rfl
    simp

/-- A fully retarded field gives residual `1`, not `0`. -/
theorem pure_retarded (Aret : ℝ) (h : Aret ≠ 0) :
    residual Aret 0 = 1 ∧ residual Aret 0 ≠ 0 := by
  have hres : residual Aret 0 = 1 := by
    unfold residual
    field_simp [h]
    simp
  refine ⟨hres, ?_⟩
  rw [hres]
  norm_num

end PhysJS.TimeSymmetric

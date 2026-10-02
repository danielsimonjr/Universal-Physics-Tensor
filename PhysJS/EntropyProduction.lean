/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.BigOperators.Group.Finset.Basic
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Basic.Real.Basic
import Mathlib.Tactic.Linarith

/-!
`be-28`. Property. The finite sum. This is the definition of `σ`.

UPT stores a `formalRef` of kind `property` on `PhysJS.EntropyProduction.nonneg`.
The covers line still begins with `derivation-step`.

For a finite family,

```
σ = Σ_i J_i X_i
```

and if every product is `≥ 0` then `σ ≥ 0`. One flipped sign, with the
other products zero, is not `σ`, and that flipped sum is negative.
This is not the variational maximum-entropy-production principle. The
catalog records this id as not-a-bridge. This lemma does not decide that.
-/

namespace PhysJS.EntropyProduction

variable {ι : Type*}

/-- Entropy production `σ = Σ_i J_i X_i`. This is the definition of `σ`. -/
noncomputable def sigma (s : Finset ι) (J X : ι → ℝ) : ℝ :=
  ∑ i ∈ s, J i * X i

/-- If every product is nonnegative, then `σ ≥ 0`.

The equality `σ = Σ_i J_i X_i` is the definition of `σ`. Kind `property`
on `PhysJS.EntropyProduction.nonneg`. The covers line still begins with
`derivation-step`. Not the maximum-entropy-production principle. -/
theorem nonneg (s : Finset ι) (J X : ι → ℝ) (h : ∀ i ∈ s, 0 ≤ J i * X i) :
    sigma s J X = ∑ i ∈ s, J i * X i ∧ 0 ≤ sigma s J X := by
  refine ⟨rfl, ?_⟩
  exact Finset.sum_nonneg h

/-- One flipped sign is not `σ`, and non-negativity fails.

The other products are zero, and the flipped product is strictly positive
before the flip. -/
theorem wrong_sign [DecidableEq ι] (s : Finset ι) (J X : ι → ℝ) (i0 : ι) (hi : i0 ∈ s)
    (hpos : 0 < J i0 * X i0) (hrest : ∀ i ∈ s, i ≠ i0 → J i * X i = 0) :
    (∑ i ∈ s, if i = i0 then -(J i * X i) else J i * X i) ≠ sigma s J X ∧
      (∑ i ∈ s, if i = i0 then -(J i * X i) else J i * X i) < 0 := by
  have hσ : sigma s J X = J i0 * X i0 := by
    unfold sigma
    exact Finset.sum_eq_single_of_mem i0 hi hrest
  have hflip : (∑ i ∈ s, if i = i0 then -(J i * X i) else J i * X i) = -(J i0 * X i0) := by
    rw [Finset.sum_eq_single_of_mem i0 hi]
    · simp
    · intro b hb hne
      simp [hne, hrest b hb hne]
  refine ⟨?_, ?_⟩
  · rw [hσ, hflip]
    linarith
  · rw [hflip]
    linarith

end PhysJS.EntropyProduction

/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Algebra.BigOperators.Ring.Finset
import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Analysis.Real.Sqrt
import Mathlib.Analysis.SpecialFunctions.Log.Base
import Mathlib.Tactic.NormNum

/-!
`be-22`. Derivation step. The toric-code value `γ = ln 2`.

Four anyons of quantum dimension `1` have total quantum dimension

```
D = √(∑ dᵢ²) = √4 = 2
```

and the topological term in nats is `γ = ln D = ln 2`. The encoded
decomposition is `S = α L − γ`, with the `O(L⁻¹)` term dropped.
`log₂ 2 = 1` is the bit convention, not nats. `D = √2` is one anyon
pair, not the toric code. This is not the Kitaev–Preskill theorem, and
it is not a quantum-gravity identification of the boundary.
-/

namespace PhysJS.ToricCode

open Finset Real

/-- Total quantum dimension `D = √(∑ dᵢ²)`. -/
noncomputable def totalQuantumDimension {ι : Type*} [Fintype ι] (d : ι → ℝ) : ℝ :=
  √(∑ i, d i ^ 2)

/-- Topological term in nats, `γ = ln D`. -/
noncomputable def gamma {ι : Type*} [Fintype ι] (d : ι → ℝ) : ℝ :=
  log (totalQuantumDimension d)

/-- Encoded decomposition `S = α L − γ`. The `O(L⁻¹)` term is dropped. -/
def entropy (α L γ : ℝ) : ℝ :=
  α * L - γ

/-- Four quantum dimensions `1` give `D = 2` and `γ = ln 2`.

Covers the derivation step of `be-22`. Not the Kitaev–Preskill theorem. -/
theorem toric (α L : ℝ) :
    (∑ _ : Fin 4, (1 : ℝ) ^ 2) = 4 ∧
      totalQuantumDimension (fun _ : Fin 4 => (1 : ℝ)) = √(4 : ℝ) ∧
      √(4 : ℝ) = 2 ∧
      gamma (fun _ : Fin 4 => (1 : ℝ)) = log 2 ∧
      entropy α L (log 2) = α * L - log 2 := by
  have hsum : ∑ _ : Fin 4, (1 : ℝ) ^ 2 = 4 := by
    simp only [one_pow, Finset.sum_const, Finset.card_univ, Fintype.card_fin, nsmul_eq_mul]
    norm_num
  have hsqrt : √(4 : ℝ) = 2 := by
    rw [show (4 : ℝ) = 2 ^ 2 by norm_num]
    exact sqrt_sq (by norm_num)
  refine ⟨hsum, ?_, hsqrt, ?_, rfl⟩
  · unfold totalQuantumDimension
    rw [hsum]
  · unfold gamma totalQuantumDimension
    rw [hsum, hsqrt]

/-- `log₂ 2 = 1` is not `ln 2`, and one anyon pair has `D = √2`, not `2`. -/
theorem wrong_dictionary :
    logb 2 2 = 1 ∧ log 2 ≠ logb 2 2 ∧
      totalQuantumDimension (fun _ : Fin 2 => (1 : ℝ)) = √(2 : ℝ) ∧
      √(2 : ℝ) ≠ (2 : ℝ) := by
  refine ⟨logb_self_eq_one (by norm_num), ?_, ?_, ?_⟩
  · intro h
    have hlog : log 2 = 1 := by rwa [logb_self_eq_one (by norm_num)] at h
    have htwo : (2 : ℝ) = exp 1 := by
      rw [← exp_log (by norm_num : (0 : ℝ) < 2), hlog]
    exact ne_of_lt exp_one_gt_two htwo
  · have hsum : ∑ _ : Fin 2, (1 : ℝ) ^ 2 = 2 := by
      simp only [one_pow, Finset.sum_const, Finset.card_univ, Fintype.card_fin, nsmul_eq_mul]
      norm_num
    unfold totalQuantumDimension
    rw [hsum]
  · intro h
    have hsq : (√(2 : ℝ)) ^ 2 = (2 : ℝ) ^ 2 := congrArg (· ^ 2) h
    rw [sq_sqrt (by norm_num)] at hsq
    norm_num at hsq

end PhysJS.ToricCode

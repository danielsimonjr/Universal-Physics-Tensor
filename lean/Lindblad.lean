/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Basic.Complex.Basic
import Mathlib.LinearAlgebra.Matrix.ConjTranspose
import Mathlib.LinearAlgebra.Matrix.Hermitian
import Mathlib.LinearAlgebra.Matrix.Trace

/-!
`be-11`. Property.

The encoded scalar is the rate `γ(λ) = γ₀ (λ/λ₀)²`. The entry is the
displayed GKSL generator, one channel, which the AST does not encode:

```
∂ρ/∂t = −(i/ℏ)[H, ρ] + γ (L ρ L† − ½ {L† L, ρ})
```

Its trace is zero. If `H` and `ρ` are Hermitian, so is the generator.
`L` need not be Hermitian. Dropping the anticommutator terms makes the
trace nonzero. Born–Markov coarse-graining is not this entry.
-/

namespace PhysJS.Lindblad

open Matrix Complex
open scoped Matrix

variable {n : Type*} [Fintype n]

/-- One channel of the displayed GKSL generator.
`ℏ` is real, as in the source. `L` is not assumed Hermitian. -/
noncomputable def lindblad (H L : Matrix n n ℂ) (γ ℏ : ℝ) (ρ : Matrix n n ℂ) : Matrix n n ℂ :=
  (-(I / (ℏ : ℂ))) • (H * ρ - ρ * H) +
    (γ : ℂ) • (L * ρ * Lᴴ - (1 / 2 : ℂ) • (Lᴴ * L * ρ + ρ * Lᴴ * L))

/-- The same generator with the anticommutator terms removed. -/
noncomputable def lindbladDrop (H L : Matrix n n ℂ) (γ ℏ : ℝ) (ρ : Matrix n n ℂ) : Matrix n n ℂ :=
  (-(I / (ℏ : ℂ))) • (H * ρ - ρ * H) + (γ : ℂ) • (L * ρ * Lᴴ)

/-- The displayed generator has trace zero, and it stays Hermitian when
`H` and `ρ` are Hermitian.

Covers the property of `be-11`. Not Born–Markov coarse-graining. -/
theorem preserve (H L ρ : Matrix n n ℂ) (γ ℏ : ℝ) :
    (lindblad H L γ ℏ ρ).trace = 0 ∧
      (H.IsHermitian → ρ.IsHermitian → (lindblad H L γ ℏ ρ).IsHermitian) := by
  refine ⟨?_, ?_⟩
  · unfold lindblad
    rw [trace_add, trace_smul, trace_smul]
    have hcomm : (H * ρ - ρ * H).trace = 0 := by
      rw [trace_sub, trace_mul_comm H ρ]
      simp
    have hdis : (L * ρ * Lᴴ - (1 / 2 : ℂ) • (Lᴴ * L * ρ + ρ * Lᴴ * L)).trace = 0 := by
      rw [trace_sub, trace_smul, trace_add]
      have hcycle : (L * ρ * Lᴴ).trace = (Lᴴ * L * ρ).trace := by
        simpa [mul_assoc] using trace_mul_cycle L ρ Lᴴ
      have hswap : (ρ * Lᴴ * L).trace = (Lᴴ * L * ρ).trace := by
        rw [mul_assoc, trace_mul_comm]
      rw [hcycle, hswap]
      ring
    rw [hcomm, hdis]
    simp
  · intro hH hρ
    rw [IsHermitian, lindblad, conjTranspose_add]
    congr 1
    · rw [conjTranspose_smul]
      have hC : (H * ρ - ρ * H)ᴴ = -(H * ρ - ρ * H) := by
        simp [conjTranspose_sub, conjTranspose_mul, hH.eq, hρ.eq, neg_sub]
      have hstar : star (-(I / (ℏ : ℂ))) = I / (ℏ : ℂ) := by
        simp [conj_ofReal, conj_I, neg_div]
      rw [hC, hstar, smul_neg, neg_smul]
    · rw [conjTranspose_smul]
      have hγ : star (γ : ℂ) = (γ : ℂ) := by simp [conj_ofReal]
      rw [hγ]
      congr 1
      rw [conjTranspose_sub, conjTranspose_smul]
      have hhalf : star ((1 / 2 : ℂ)) = (1 / 2 : ℂ) := by simp
      rw [hhalf]
      congr 1
      · simp [conjTranspose_mul, conjTranspose_conjTranspose, hρ.eq, mul_assoc]
      · simp [conjTranspose_add, conjTranspose_mul, conjTranspose_conjTranspose, hρ.eq, mul_assoc,
          add_comm]

/-- Dropping the anticommutator leaves a nonzero trace. `n ≠ 0` so the
identity has a nonzero trace. -/
theorem wrong_dictionary_drop_anticommutator (n : ℕ) (hn : n ≠ 0) (ℏ : ℝ) :
    (lindbladDrop (0 : Matrix (Fin n) (Fin n) ℂ) 1 (1 : ℝ) ℏ 1).trace ≠ 0 := by
  have htr : (lindbladDrop (0 : Matrix (Fin n) (Fin n) ℂ) 1 (1 : ℝ) ℏ 1).trace = n := by
    simp [lindbladDrop, trace_one, conjTranspose_one, mul_one, sub_self, smul_zero, zero_add]
  rw [htr]
  exact Nat.cast_ne_zero.mpr hn

end PhysJS.Lindblad
